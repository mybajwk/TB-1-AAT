require('dotenv').config();
const express = require('express');
const cron = require('node-cron');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const morgan = require('morgan');
const { createClient } = require('redis');

const prisma = new PrismaClient();
const app = express();
app.use(express.json());
app.use(morgan('combined'));

const PORT = process.env.PORT || 3003;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3002';
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';

// Redis Client Init
const redisClient = createClient({
    url: REDIS_URL
});
redisClient.on('error', (err) => console.error('Redis Client Error', err));

(async () => {
    try {
        await redisClient.connect();
        console.log('Redis Connected');
    } catch (err) {
        console.error('Redis Connection Error:', err);
    }
})();

// Middleware: Authenticate Token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Unauthorized: No token provided' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Forbidden: Invalid token' });
        req.user = user;
        next();
    });
}

// Helper: Mask 'anonymous' reporter
function maskReport(report, viewerId) {
    if (!report) return report;
    const isOwner = report.reporterId === viewerId;
    const isAnonymous = report.visibility && report.visibility.name === 'anonymous';

    if (isAnonymous && !isOwner) {
        report.reporter = null;
        report.reporterId = null;
    }
    return report;
}

// Health Check
app.get('/health', (req, res) => {
    res.json({
        status: 'Report Service is running',
        db: 'Connected via Prisma',
        redis: redisClient.isOpen ? 'Connected' : 'Disconnected'
    });
});

// GET /reports - List Public
app.get('/reports', authenticateToken, async (req, res) => {
    try {
        const isAuthority = req.user.roles.includes('authority');

        // Redis Cache: Check
        if (!isAuthority) {
            try {
                const cachedData = await redisClient.get('reports:public');
                if (cachedData) {
                    console.log('[Redis] Cache Hit: reports:public');
                    return res.json(JSON.parse(cachedData));
                }
            } catch (err) {
                console.error('Redis Get Error:', err);
            }
        }

        const publicVisibility = await prisma.reportVisibility.findUnique({ where: { name: 'public' } });
        const anonymousVisibility = await prisma.reportVisibility.findUnique({ where: { name: 'anonymous' } });

        let whereClause = {
            OR: [
                { visibilityId: publicVisibility.id },
                { visibilityId: anonymousVisibility.id }
            ]
        };

        // Department Isolation Logic
        if (isAuthority) {
            const authority = await prisma.authority.findUnique({ where: { userId: req.user.userId } });
            if (authority && authority.department) {
                whereClause = {
                    AND: [
                        whereClause,
                        {
                            category: {
                                targetAgencyType: authority.department
                            }
                        }
                    ]
                };
            }
        }

        const reports = await prisma.report.findMany({
            where: whereClause,
            include: {
                visibility: true,
                status: true,
                category: true,
                reporter: { select: { id: true, fullName: true } },
                multimedia: true
            },
            orderBy: { createdAt: 'desc' }
        });

        // Mask anonymous reports
        const safeReports = reports.map(r => maskReport(r, req.user.userId));

        // Redis Cache: Set
        if (!isAuthority) {
            try {
                await redisClient.setEx('reports:public', 60, JSON.stringify(safeReports));
                console.log('[Redis] Cache Set: reports:public');
            } catch (err) {
                console.error('Redis Set Error:', err);
            }
        }

        res.json(safeReports);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
});

// GET /reports/my-reports
app.get('/reports/my-reports', authenticateToken, async (req, res) => {
    try {
        const reports = await prisma.report.findMany({
            where: { reporterId: req.user.userId },
            include: {
                visibility: true,
                status: true,
                category: true,
                multimedia: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(reports);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch your reports' });
    }
});

// POST /reports - Create
app.post('/reports', authenticateToken, async (req, res) => {
    try {
        const { title, description, location_lat, location_long, visibility_name, address_text, media_urls } = req.body;

        if (!title || !description) return res.status(400).json({ error: 'Missing title or description' });

        const visibility = await prisma.reportVisibility.findUnique({
            where: { name: visibility_name || 'private' }
        });
        const statusPending = await prisma.reportStatus.findUnique({ where: { name: 'pending' } });
        const category = await prisma.reportCategory.findUnique({ where: { name: 'Lainnya' } });

        let multimediaData = [];
        if (media_urls && Array.isArray(media_urls) && media_urls.length > 0) {
            multimediaData = media_urls.map(url => ({
                mediaUrl: url,
                mediaType: 'image'
            }));
        }

        const newReport = await prisma.report.create({
            data: {
                reporterId: req.user.userId,
                categoryId: category.id,
                title,
                description,
                locationLatitude: location_lat,
                locationLongitude: location_long,
                addressText: address_text,
                visibilityId: visibility.id,
                statusId: statusPending.id,
                multimedia: {
                    create: multimediaData
                }
            },
            include: {
                multimedia: true
            }
        });

        // Cache Invalidation
        try {
            await redisClient.del('reports:public');
            console.log('[Redis] Cache Invalidated: reports:public');
        } catch (err) { console.error('Redis Del Error:', err); }

        res.status(201).json(newReport);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Creation failed' });
    }
});

// GET /reports/:id - Detail
app.get('/reports/:id', authenticateToken, async (req, res) => {
    try {
        const report = await prisma.report.findUnique({
            where: { id: req.params.id },
            include: {
                visibility: true,
                status: true,
                category: true,
                reporter: { select: { id: true, fullName: true, email: true } },
                multimedia: true,
                upvotes: true,
                comments: { include: { user: { select: { fullName: true } } } }
            }
        });

        if (!report) return res.status(404).json({ error: 'Not found' });

        const isOwner = report.reporterId === req.user.userId;
        const isAuthority = req.user.roles.includes('authority') || req.user.roles.includes('admin');
        const isPublic = report.visibility.name === 'public';

        if (!isPublic && !isOwner && !isAuthority) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const maskedReport = maskReport(report, req.user.userId);
        res.json(maskedReport);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Fetch failed' });
    }
});

// Scheduler: Notification Outbox Processor
cron.schedule('* * * * *', async () => {
    try {
        const unsentNotifications = await prisma.notification.findMany({
            where: { isSent: false },
            take: 50
        });

        for (const notif of unsentNotifications) {
            try {
                await axios.post(`${NOTIFICATION_SERVICE_URL}/send`, {
                    userId: notif.userId,
                    title: notif.title,
                    message: notif.message,
                    relatedId: notif.relatedResourceId,
                    type: 'GENERAL'
                });

                await prisma.notification.update({
                    where: { id: notif.id },
                    data: { isSent: true }
                });
                console.log(`[Outbox] Notification ${notif.id} sent.`);
            } catch (sendErr) {
                console.error(`[Outbox] Failed to send notification ${notif.id}:`, sendErr.message);
            }
        }
    } catch (err) {
        console.error('[Scheduler] Outbox error:', err);
    }
});

// Scheduler: Escalation Check
cron.schedule('0 * * * *', async () => {
    console.log('[Scheduler] Checking for reports to escalate...');
    try {
        const hours24Ago = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const statusPending = await prisma.reportStatus.findUnique({ where: { name: 'pending' } });
        const statusEscalated = await prisma.reportStatus.findUnique({ where: { name: 'escalated' } });

        if (!statusPending || !statusEscalated) return;

        const toEscalate = await prisma.report.findMany({
            where: {
                statusId: statusPending.id,
                createdAt: { lt: hours24Ago }
            }
        });

        for (const report of toEscalate) {
            await prisma.report.update({
                where: { id: report.id },
                data: { statusId: statusEscalated.id }
            });
            console.log(`[Escalation] Report ${report.id} escalated.`);

            // Cache Invalidation
            try { await redisClient.del('reports:public'); } catch (e) { }
        }
    } catch (err) {
        console.error('[Scheduler] Error:', err);
    }
});

// PATCH /reports/:id/status - Authority Only
app.patch('/reports/:id/status', authenticateToken, async (req, res) => {
    try {
        if (!req.user.roles.includes('authority') && !req.user.roles.includes('admin')) {
            return res.status(403).json({ error: 'Only authorities can update status' });
        }

        const { status_name, notes } = req.body;
        const status = await prisma.reportStatus.findUnique({ where: { name: status_name } });
        if (!status) return res.status(400).json({ error: 'Invalid status name' });

        const report = await prisma.report.findUnique({ where: { id: req.params.id } });
        if (!report) return res.status(404).json({ error: 'Report not found' });

        const updated = await prisma.report.update({
            where: { id: req.params.id },
            data: { statusId: status.id }
        });

        // Cache Invalidation
        try {
            await redisClient.del('reports:public');
            console.log('[Redis] Cache Invalidated due to status update');
        } catch (e) {
            console.error('Redis Del error', e);
        }

        await prisma.reportHistory.create({
            data: {
                reportId: report.id,
                changedByUserId: req.user.userId,
                previousStatusId: report.statusId,
                newStatusId: status.id,
                notes: notes
            }
        });

        if (report.reporterId) {
            await prisma.notification.create({
                data: {
                    userId: report.reporterId,
                    title: 'Laporan Anda Diupdate',
                    message: `Status laporan Anda "${report.title}" telah berubah menjadi ${status_name}. ${notes ? 'Catatan: ' + notes : ''}`,
                    relatedResourceId: report.id,
                    isSent: false,
                    isRead: false
                }
            });
            console.log(`[Notification] Queued notification for report ${report.id}`);
        }

        res.json(updated);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Update failed' });
    }
});

app.post('/reports/:id/upvote', authenticateToken, async (req, res) => {
    try {
        const exists = await prisma.reportUpvote.findUnique({
            where: { reportId_userId: { reportId: req.params.id, userId: req.user.userId } }
        });

        if (exists) return res.status(400).json({ error: 'Already upvoted' });

        await prisma.reportUpvote.create({
            data: {
                reportId: req.params.id,
                userId: req.user.userId
            }
        });
        res.json({ message: 'Upvoted' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to upvote' });
    }
});

app.post('/reports/:id/comments', authenticateToken, async (req, res) => {
    try {
        const { content, is_internal } = req.body;
        if (is_internal && !req.user.roles.includes('authority')) {
            return res.status(403).json({ error: 'Cannot post internal comment' });
        }

        const comment = await prisma.comment.create({
            data: {
                reportId: req.params.id,
                userId: req.user.userId,
                content,
                isInternal: is_internal || false
            }
        });
        res.status(201).json(comment);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to comment' });
    }
});

app.listen(PORT, () => {
    console.log(`Report Service running on port ${PORT}`);
});

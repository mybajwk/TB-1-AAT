require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8081;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Auth Middleware using JWT from other services
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

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'Analytics Service is running', db: 'Connected via Prisma' });
});

// GET /analytics/daily
app.get('/analytics/daily', authenticateToken, async (req, res) => {
    try {
        const stats = await prisma.analyticsDailyReport.findMany({
            orderBy: { reportDate: 'desc' },
            take: 100
        });
        res.json(stats);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch daily stats' });
    }
});

// GET /analytics/performance
app.get('/analytics/performance', authenticateToken, async (req, res) => {
    try {
        const perf = await prisma.analyticsAuthorityPerformance.findMany({
            orderBy: { monthStartDate: 'desc' },
            take: 100
        });
        res.json(perf);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch performance metrics' });
    }
});

// POST /trigger-aggregation (Stub)
app.post('/trigger-aggregation', authenticateToken, (req, res) => {
    res.json({ message: 'Aggregation triggered (stub)' });
});

app.listen(PORT, () => {
    console.log(`Analytics Service running on port ${PORT}`);
});

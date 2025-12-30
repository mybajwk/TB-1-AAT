require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3003;
const ROUTING_SERVICE_URL = process.env.ROUTING_SERVICE_URL || 'http://routing-service:8080';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3002';

// In-memory Mock Database
const reports = [];

// Helper to get current timestamp
const getTimestamp = () => new Date().toISOString();

app.get('/health', (req, res) => {
    res.json({ status: 'Report Service is running', count: reports.length });
});

// GET /reports - List public reports
app.get('/reports', (req, res) => {
    // Filter out private reports unless user owns them (logic simplified for PoC)
    const publicReports = reports.filter(r => r.visibility !== 'private');
    res.json(publicReports);
});

// POST /reports - Create new report
app.post('/reports', async (req, res) => {
    try {
        const { title, description, location, media_urls, visibility, user_id } = req.body;

        // 1. Basic Validation
        if (!title || !description || !location) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // 2. Call Routing Service for Classification
        let category = 'general';
        let authority = 'City Hall';
        try {
            const routingRes = await axios.post(`${ROUTING_SERVICE_URL}/classify`, { description });
            category = routingRes.data.category;
            authority = routingRes.data.authority;
        } catch (error) {
            console.error('Routing service failed, using defaults', error.message);
        }

        // 3. Create Report Object (Data Model)
        const newReport = {
            report_id: uuidv4(),
            user_id: visibility === 'anonymous' ? null : (user_id || 'guest'), // Anonymize if requested
            title,
            description,
            category,
            location, // { lat, long }
            media_urls: media_urls || [],
            visibility: visibility || 'public', // public, private, anonymous
            status: 'submitted',
            assigned_to: authority,
            upvotes: 0,
            created_at: getTimestamp(),
            updated_at: getTimestamp()
        };

        // 4. Save to DB
        reports.push(newReport);

        // 5. Notify Authority (Async)
        axios.post(`${NOTIFICATION_SERVICE_URL}/send`, {
            userId: authority, // Notifying the authority, not the user
            type: 'NEW_REPORT',
            message: `New ${category} report: ${title}`
        }).catch(err => console.error('Notification failed', err.message));

        console.log(`Report created: ${newReport.report_id} [${category}]`);
        res.status(201).json(newReport);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /reports/:id - Get details
app.get('/reports/:id', (req, res) => {
    const report = reports.find(r => r.report_id === req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json(report);
});

// POST /reports/:id/upvote - Upvote a report
app.post('/reports/:id/upvote', (req, res) => {
    const report = reports.find(r => r.report_id === req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    report.upvotes += 1;
    res.json({ message: 'Upvoted', upvotes: report.upvotes });
});

// PATCH /reports/:id/status - Update status (Authority only stub)
app.patch('/reports/:id/status', (req, res) => {
    const { status } = req.body;
    const report = reports.find(r => r.report_id === req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    // Stub: In real app, only authority can do this
    report.status = status || report.status;
    report.updated_at = getTimestamp();

    // Notify User
    if (report.user_id) {
        axios.post(`${NOTIFICATION_SERVICE_URL}/send`, {
            userId: report.user_id,
            type: 'STATUS_UPDATE',
            message: `Your report "${report.title}" is now ${report.status}`
        }).catch(err => console.error('Notification failed', err.message));
    }

    res.json(report);
});

app.listen(PORT, () => {
    console.log(`Report Service running on port ${PORT}`);
});

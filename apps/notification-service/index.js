require('dotenv').config();
const express = require('express');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3002;

app.get('/health', (req, res) => {
    res.json({ status: 'Notification Service is running' });
});

app.post('/send', (req, res) => {
    const { userId, message, type } = req.body;

    // Stub: In real app, integrate with SendGrid/Firebase/Twilio
    console.log(`[Notification] Sending ${type || 'PUSH'} to User ${userId}: "${message}"`);

    res.json({ success: true, message: 'Notification queued' });
});

app.listen(PORT, () => {
    console.log(`Notification Service running on port ${PORT}`);
});

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const morgan = require('morgan');
const admin = require('firebase-admin');

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('combined')); // Observability

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all for POC
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3002;

// Initialize Firebase Admin
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
try {
    if (serviceAccountPath) {
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('Firebase Admin Initialized');
    } else {
        console.warn('WARNING: FIREBASE_SERVICE_ACCOUNT_PATH not set. FCM notifications will fail.');
        admin.initializeApp();
    }
} catch (error) {
    console.error('Firebase Initialization Failed:', error.message);
}

// Socket.IO Logic
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Client joins a room based on their userID
    socket.on('join', (userId) => {
        socket.join(userId);
        console.log(`Socket ${socket.id} joined room ${userId}`);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'Notification Service is running', firebase: admin.apps.length > 0 ? 'Initialized' : 'Not Initialized' });
});

app.post('/send', async (req, res) => {
    const { userId, message, type, title, relatedId } = req.body;

    console.log(`[Notification] Processing ${type || 'PUSH'} for User ${userId}`);

    // 1. Real-time Push via Socket.IO
    if (userId) {
        io.to(userId).emit('notification', {
            title,
            message,
            type,
            relatedId,
            timestamp: new Date()
        });
        console.log(`[Socket] Emitted to room ${userId}`);
    }

    // 2. FCM Push
    if (admin.apps.length) {
        const payload = {
            topic: `user-${userId}`,
            notification: {
                title: title || 'New Update',
                body: message
            },
            data: {
                type: type || 'GENERAL',
                userId: userId,
                relatedId: relatedId || ''
            }
        };

        try {
            await admin.messaging().send(payload);
            console.log('[FCM] Sent successfully');
        } catch (error) {
            console.error('[FCM] Error:', error.message);
        }
    }

    res.json({ success: true, message: 'Notification processed' });
});

server.listen(PORT, () => {
    console.log(`Notification Service running on port ${PORT}`);
});

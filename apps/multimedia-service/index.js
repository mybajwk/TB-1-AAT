const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3004;

// Storage URL Base
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Ensure uploads directory exists
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configure Multer Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        // Generate UUID + original extension
        const ext = path.extname(file.originalname);
        const filename = `${uuidv4()}${ext}`;
        cb(null, filename);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Middleware
app.use(express.json());
// Serve static files
app.use('/files', express.static(UPLOAD_DIR));

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'Multimedia Service is running', storage: UPLOAD_DIR });
});

// POST /upload
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = `${BASE_URL}/files/${req.file.filename}`;


    console.log(`[Multimedia] File uploaded: ${req.file.filename}`);

    res.status(201).json({
        id: path.parse(req.file.filename).name, // UUID part
        filename: req.file.filename,
        url: fileUrl,
        mimetype: req.file.mimetype,
        size: req.file.size
    });
});

app.listen(PORT, () => {
    console.log(`Multimedia Service running on port ${PORT}`);
});

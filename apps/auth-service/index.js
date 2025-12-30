require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Database Connection
const pool = new Pool({
    connectionString: process.env.DB_URL,
});

// Mock DB for PoC if DB connection fails or for speed
const users = [];

app.get('/health', (req, res) => {
    res.json({ status: 'Auth Service is running' });
});

// Register
app.post('/register', async (req, res) => {
    const { email, password, role } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        // Stub: In real app, insert into DB
        // const result = await pool.query('INSERT INTO users ...');
        const newUser = { id: users.length + 1, email, password: hashedPassword, role: role || 'citizen' };
        users.push(newUser);

        console.log(`User registered: ${email}`);
        res.status(201).json({ message: 'User registered successfully', userId: newUser.id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        // Stub: In real app, select from DB
        const user = users.find(u => u.email === email);

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Verify Token (Internal/Gateway use)
app.get('/verify', (req, res) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        res.json({ valid: true, user: decoded });
    });
});

app.listen(PORT, () => {
    console.log(`Auth Service running on port ${PORT}`);
});

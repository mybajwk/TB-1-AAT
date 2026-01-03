require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'Auth Service is running', db: 'Connected via Prisma' });
});

// Helper to get Role ID by name
async function getRoleId(roleName) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    return role ? role.id : null;
}

// REGISTER
app.post('/register', async (req, res) => {
    // role is optional, defaults to 'citizen'
    // For 'authority', extra details like agency_name might be needed (not implemented effectively here for simplicity)
    const { email, password, full_name, nik, role, agency_name, department } = req.body;

    if (!email || !password || !full_name) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // checks if user exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const targetRoleName = role || 'citizen';
        const roleId = await getRoleId(targetRoleName);

        if (!roleId) {
            return res.status(400).json({ error: `Role '${targetRoleName}' not found` });
        }

        // Transaction to create user and assign role
        const newUser = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    email,
                    passwordHash: hashedPassword,
                    fullName: full_name,
                    nik: nik || null,
                },
            });

            await tx.userRole.create({
                data: {
                    userId: user.id,
                    roleId: roleId,
                },
            });

            // If authority, create authority record (simple version)
            if (targetRoleName === 'authority' && agency_name) {
                await tx.authority.create({
                    data: {
                        userId: user.id,
                        agencyName: agency_name,
                        department: department || agency_name, // Fallback if dept not provided
                        jurisdictionLevel: 'district', // default
                        responsibilities: 'General handling',
                    }
                });
            }

            return user;
        });

        console.log(`User registered: ${email} as ${targetRoleName}`);
        res.status(201).json({
            message: 'User registered successfully',
            userId: newUser.id,
            role: targetRoleName
        });

    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Registration failed internal error' });
    }
});

// LOGIN
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                userRoles: {
                    include: { role: true }
                }
            }
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Extract roles
        const roles = user.userRoles.map(ur => ur.role.name);

        // Payload
        const payload = {
            userId: user.id,
            email: user.email,
            roles: roles
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                roles: roles
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// VERIFY (Internal Use)
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


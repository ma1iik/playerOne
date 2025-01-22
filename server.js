const express = require('express');
const mysql = require('mysql2');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const db = require('./db');
const { auth } = require('express-openid-connect');

const app = express();
const PORT = process.env.PORT || 3000;

// Auth0 Config
const config = {
    authRequired: false,
    auth0Logout: true,
    secret: process.env.APP_SECRET,
    baseURL: process.env.AUTH0_BASE_URL,
    clientID: process.env.AUTH0_CLIENT_ID,
    issuerBaseURL: process.env.AUTH0_DOMAIN,
};

app.use(auth(config));
app.use(express.json());

// Global Rate Limiter
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests, please try again later.',
});
app.use(limiter);

// Home
app.get('/', (req, res) => {
    res.send('Welcome to PlayerOne API! Use Auth0 for authentication.');
});

// Profile
app.get('/profile', (req, res) => {
    if (!req.oidc.isAuthenticated()) {
        return res.status(401).json({ error: 'User not authenticated' });
    }
    const user = req.oidc.user;
    res.status(200).json({
        message: 'Profile data retrieved successfully',
        user: {
            name: user.name,
            email: user.email,
            picture: user.picture,
        },
    });
});

// Tasks
app.post('/tasks', (req, res) => {
    if (!req.oidc.isAuthenticated()) {
        return res.status(401).json({ error: 'User not authenticated' });
    }

    const userId = req.oidc.user.sub;
    const { title, description, difficulty, type, due_date } = req.body;

    const query = `
        INSERT INTO tasks (user_id, title, description, difficulty, type, due_date)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    db.query(query, [userId, title, description, difficulty, type, due_date], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ message: 'Task created successfully', taskId: results.insertId });
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on ${process.env.AUTH0_BASE_URL}`);
});

const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = 4000;  // Different port from solution app (3000)

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// VULNERABILITY 6: Insecure Session Configuration
// Problems: hardcoded weak secret, no cookie security flags (no httpOnly,
// no sameSite, no maxAge, no secure) - session can be hijacked or stolen
app.use(session({
    secret: 'votingsecret',
    resave: false,
    saveUninitialized: false
}));

// Serve HTML views
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/dashboard', (req, res) => {
    if (!req.session.user) return res.redirect('/');
    res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

app.get('/admin', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') return res.redirect('/');
    res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

// ──────────────────────────────────────────────
// AUTH ROUTES
// ──────────────────────────────────────────────

// VULNERABILITY 1 & 4: SQL Injection in Registration + No Input Validation
// User input is directly injected into the SQL query string.
// No checks for empty fields, invalid email, short passwords, or dangerous characters.
// An attacker can manipulate the query by entering: ' OR '1'='1
app.post('/register', (req, res) => {
    const { username, email, password } = req.body;

    // VULNERABILITY 3: Plain Text Password Storage
    // Password is stored directly in the database without any hashing.
    // If the database is breached, all passwords are immediately exposed.
    const query = `INSERT INTO users (username, email, password, role) VALUES ('${username}', '${email}', '${password}', 'voter')`;

    db.query(query, (err) => {
        if (err) return res.status(500).json({ error: 'Registration failed.' });
        res.json({ success: true, message: 'Registered successfully!' });
    });
});

// VULNERABILITY 1: SQL Injection in Login
// User input is directly injected into the SQL query string.
// An attacker can bypass login entirely using: admin@vote.com' OR '1'='1' --
// this would return the admin user without needing a valid password, granting full access to the admin dashboard and all its functionalities.
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const query = "SELECT * FROM users WHERE email = '" + email + "' AND password = '" + password + "'";

    db.query(query, (err, results) => {
        if (err) {
            console.log("SQL Error (injection likely):", err.sqlMessage);
            return res.status(500).json({ error: 'Login error.' });
        }
        if (results.length === 0) return res.status(401).json({ error: 'Invalid credentials.' });
        const user = results[0];
        req.session.user = { id: user.id, username: user.username, role: user.role };
        res.json({ success: true, role: user.role });
    });
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// ──────────────────────────────────────────────
// API ROUTES
// ──────────────────────────────────────────────

app.get('/api/me', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Not logged in' });
    res.json(req.session.user);
});

app.get('/api/candidates', (req, res) => {
    db.query('SELECT * FROM candidates', (err, results) => {
        if (err) return res.status(500).json({ error: 'Failed to load candidates.' });
        res.json(results);
    });
});

// VULNERABILITY 5: No Duplicate Vote Check
// No check whether a user has already voted.
// The same user can call this endpoint repeatedly and vote unlimited times
app.post('/api/vote', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Not logged in.' });
    const { candidateId } = req.body;
    const userId = req.session.user.id;

    db.query('INSERT INTO votes (user_id, candidate_id) VALUES (?, ?)', [userId, candidateId], (err) => {
        if (err) return res.status(500).json({ error: 'Vote failed.' });
        db.query('UPDATE candidates SET votes = votes + 1 WHERE id = ?', [candidateId], (err2) => {
            if (err2) return res.status(500).json({ error: 'Vote count update failed.' });
            res.json({ success: true, message: 'Vote cast successfully!' });
        });
    });
});

app.get('/api/results', (req, res) => {
    db.query('SELECT name, party, votes FROM candidates ORDER BY votes DESC', (err, results) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch results.' });
        res.json(results);
    });
});

// ──────────────────────────────────────────────
// ADMIN API ROUTES
// ──────────────────────────────────────────────

app.get('/api/admin/users', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    db.query('SELECT id, username, email, role, created_at FROM users', (err, results) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch users.' });
        res.json(results);
    });
});

app.delete('/api/admin/users/:id', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    db.query('DELETE FROM users WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: 'Delete failed.' });
        res.json({ success: true });
    });
});

app.post('/api/admin/candidates', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const { name, party, description } = req.body;
    db.query('INSERT INTO candidates (name, party, description) VALUES (?, ?, ?)', [name, party, description], (err) => {
        if (err) return res.status(500).json({ error: 'Failed to add candidate.' });
        res.json({ success: true });
    });
});

app.delete('/api/admin/candidates/:id', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    db.query('DELETE FROM candidates WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: 'Delete failed.' });
        res.json({ success: true });
    });
});

app.post('/api/admin/reset-votes', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    db.query('UPDATE candidates SET votes = 0', (err) => {
        if (err) return res.status(500).json({ error: 'Reset failed.' });
        db.query('DELETE FROM votes', (err2) => {
            if (err2) return res.status(500).json({ error: 'Reset votes table failed.' });
            res.json({ success: true });
        });
    });
});

app.listen(PORT, () => {
    console.log(`[VULNERABLE] VoteSphere running at http://localhost:${PORT}`);
    console.log(`WARNING: This version contains intentional security vulnerabilities.`);
    console.log(`Do NOT deploy this in any real environment.`);
});

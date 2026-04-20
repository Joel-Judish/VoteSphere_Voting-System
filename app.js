// Vulnerability 1: SQL Innjection in Login Form
/* 
const query = `SELECT * FROM users WHERE email = '${email}' 
AND password = '${password}'`;
*/
// The above query directly injects user input into SQL

// Fixed Code for Vulnerability 1: SQL Injection in Login Form
/*
const query = "SELECT * FROM users WHERE email = ? AND password = ?";
*/
// Use parameterized queries to prevent SQL Injection

// Vulnerability 2: SQL Injection in Registration Form
/*
const query = `INSERT INTO users (username, email, password, role) 
VALUES ('${username}', '${email}', '${password}', 'voter')`;
*/
// The above query directly injects user input into SQL

// Fixed Code for Vulnerability 2: SQL Injection in Registration Form
/*
const query = "INSERT INTO users (username, email, password, role) 
VALUES (?, ?, ?, 'voter')";
*/
// Use parameterized queries to prevent SQL Injection

// Vulnerability 3: Plain Text Password Storage(schema.sql page)
/*
INSERT INTO users (username, email, password, role) 
VALUES ('admin', 'admin@vote.com', 'admin123', 'admin');
*/
// The above code stores password directly in the database without hashing

// Fixed Code for Vulnerability 3: Plain Text Password Storage
/*
bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) return res.status(500).json({ error: 'Hashing failed.' });

    db.query(query, [username, email, hashedPassword], (err) => {
        if (err) return res.status(500).json({ error: 'Registration failed.' });
        res.json({ success: true, message: 'Registered successfully!' });
    });
});
*/
// Password is hashed before storing in database

// Vulnerability 4: No Input Validation
/*
const { username, email, password } = req.body;
const query = "INSERT INTO users (username, email, password, role) 
VALUES (?, ?, ?, 'voter')";
*/
// The above code does not validate user input for registration

// Fixed Code for Vulnerability 4: No Input Validation
/*
if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
}
if (!email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email format.' });
}
if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
}
if (username.includes('<') || email.includes('<')) {
    return res.status(400).json({ error: 'Invalid characters detected.' });
}
*/
// The above code adds basic validation for registration input

// Vulnerability 5: No Duplicate Vote Check
/*
db.query('INSERT INTO votes (user_id, candidate_id) 
VALUES (?, ?)', [userId, candidateId]
*/
// The above code allows users to vote multiple times without checking for duplicates

// Fixed Code for Vulnerability 5: No Duplicate Vote Check
/*
db.query('SELECT * FROM votes WHERE user_id = ?', [userId], (err, results) => {
        if (err) return res.status(500).json({ error: 'Check failed.' });

        if (results.length > 0) {
            return res.status(400).json({ error: 'You have already voted.' });
        }

        // Insert vote
        db.query('INSERT INTO votes (user_id, candidate_id) VALUES (?, ?)', 
        [userId, candidateId], (err) => {
            if (err) return res.status(500).json({ error: 'Vote failed.' });

            db.query('UPDATE candidates SET votes = votes + 1 WHERE id = ?', 
            [candidateId], (err2) => {
                if (err2) return res.status(500).json({ error: 'Vote count update failed.' });

                res.json({ success: true, message: 'Vote cast successfully!' });
            });
        });
});
*/
// The above code checks if the user has already voted before allowing them to cast a vote

// Vulnerability 6: Insecure Session Configuration
/*
app.use(session({
    secret: 'votingsecret',
    resave: false,
    saveUninitialized: false
}));
*/
// The above code uses a hardcoded secret and does not set secure cookie options

// Fixed Code for Vulnerability 6: Insecure Session Configuration
/*
app.use(session({
    secret: process.env.SESSION_SECRET || 'StrongRandomSecret123!',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,     // prevents JS access (protects from XSS)
        secure: false,      // set true if using HTTPS
        sameSite: 'strict', // prevents CSRF
        maxAge: 1000 * 60 * 30 // session expires in 30 minutes
    }
}));
*/
// The above code uses an environment variable for the session secret and sets secure cookie options to enhance security

const bcrypt = require('bcrypt');
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------------- SESSION SECURITY ----------------
// Configured secure session handling with httpOnly cookies and SameSite protection


// Insecure Session Configuration - Fixed by using an environment variable for the session secret and setting secure cookie options to enhance security
app.use(session({
    secret: process.env.SESSION_SECRET || 'StrongRandomSecret123!',
    name: 'vsid',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,     // prevents JS access (protects from XSS)
        secure: false,      // set true if using HTTPS
        sameSite: 'strict', // prevents CSRF
        maxAge: 1000 * 60 * 30, // session expires in 30 minutes
        expires: new Date(Date.now() + 1000 * 60 * 30) 
    }
}));

// Serves HTML views
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
// AUTHENTICATION ROUTES
// ──────────────────────────────────────────────
// Handles user registration and login with secure password hashing

// Register Page
app.post('/register', (req, res) => {
    // Passwords Stored Directly
    const { username, email, password } = req.body;

    // No Input Validation - Fixed by adding basic validation for registration input
    if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
    }

    if (!email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email format.' });
    }

    if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // Optional: Prevent Script Injection
    if (username.includes('<') || email.includes('<')) {
    return res.status(400).json({ error: 'Invalid characters detected.' });
    }

    // SQL Injection in Registration Form(Unsanitized User Input) - Fixed using parameterized query
    const query = "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, 'voter')";

    // Plain Text Password Storage - Password Hashing(Password is hashed before storing in database)
    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) return res.status(500).json({ error: 'Hashing failed.' });

      db.query(query, [username, email, hashedPassword], (err) => {
        if (err) return res.status(500).json({ error: 'Registration failed.' });
        res.json({ success: true, message: 'Registered successfully!' });
      });
    });
});

// Login Page
// Login route verifies user credentials using bcrypt comparison
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    // SQL Injection in Login Form - Fixed using parameterized query
    //const query = "SELECT * FROM users WHERE email = ? AND password = ?";

    // The above code modified after SQL Injection is Not compatible with hashed passwords
    const query = "SELECT * FROM users WHERE email = ?";

    db.query(query, [email], (err, results) => {
        if (err) return res.status(500).json({ error: 'Login error.' });

        if (results.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials.' });
        }

        const user = results[0];

        bcrypt.compare(password, user.password, (err, match) => {
          if (!match) {
            return res.status(401).json({ error: 'Invalid credentials.' });
          }

          req.session.user = { id: user.id, username: user.username, role: user.role };
          res.json({ success: true, role: user.role });
        });
    });
});

// Logout Page
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// ──────────────────────────────────────────────
// API ROUTES
// ──────────────────────────────────────────────

// Get session user info
app.get('/api/me', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Not logged in' });
    res.json(req.session.user);
});

// Get all candidate details
app.get('/api/candidates', (req, res) => {
    db.query('SELECT * FROM candidates', (err, results) => {
        if (err) return res.status(500).json({ error: 'Failed to load candidates.' });
        res.json(results);
    });
});

// Cast a vote for a candidate
// Allows authenticated users to cast a vote for a candidate
// Ensures one user can vote only once
app.post('/api/vote', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Not logged in.' });
    const { candidateId } = req.body;
    const userId = req.session.user.id;

    // No Duplicate Vote Check - Fixed by checking if the user has already voted before allowing them to cast a vote
    // Check if user has already voted to prevent duplicate voting
    db.query('SELECT * FROM votes WHERE user_id = ?', [userId], (err, results) => {
        if (err) return res.status(500).json({ error: 'Check failed.' });

        if (results.length > 0) {
            return res.status(400).json({ error: 'You have already voted.' });
        }
        db.query('INSERT INTO votes (user_id, candidate_id) VALUES (?, ?)', 
        [userId, candidateId], (err) => {    
          if (err) return res.status(500).json({ error: 'Vote failed.' });

          db.query('UPDATE candidates SET votes = votes + 1 WHERE id = ?', [candidateId], (err2) => {
              if (err2) return res.status(500).json({ error: 'Vote count update failed.' });

              res.json({ success: true, message: 'Vote cast successfully!' });
          });
        });
    });
});

// Get results for all candidates
app.get('/api/results', (req, res) => {
    db.query('SELECT name, party, votes FROM candidates ORDER BY votes DESC', (err, results) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch results.' });
        res.json(results);
    });
});

// ──────────────────────────────────────────────
// ADMIN API ROUTES
// ──────────────────────────────────────────────
// Admin can manage users, candidates, and voting results

// Get all users - Admin Only
app.get('/api/admin/users', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    db.query('SELECT id, username, email, role, created_at FROM users', (err, results) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch users.' });
        res.json(results);
    });
});

// Delete user from database - Admin Only
// Allows admin to delete a user from the system
app.delete('/api/admin/users/:id', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    db.query('DELETE FROM users WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: 'Delete failed.' });
        res.json({ success: true });
    });
});

// Admin can add and remove candidates //
// Add candidate to database - Admin Only
app.post('/api/admin/candidates', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const { name, party, description } = req.body;
    db.query('INSERT INTO candidates (name, party, description) VALUES (?, ?, ?)', [name, party, description], (err) => {
        if (err) return res.status(500).json({ error: 'Failed to add candidate.' });
        res.json({ success: true });
    });
});

// Delete candidate from database - Admin Only
app.delete('/api/admin/candidates/:id', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    db.query('DELETE FROM candidates WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: 'Delete failed.' });
        res.json({ success: true });
    });
});

// Reset all votes - Admin Only
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
    console.log(`Voting app running at http://localhost:${PORT}`);
});
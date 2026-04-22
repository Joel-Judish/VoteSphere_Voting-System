# 🗳️ VoteSphere — Online Voting System

> A secure full-stack online voting web application built with Node.js, Express.js, and MySQL.
> Developed to demonstrate the identification, implementation, and validation of real-world web security controls.

[![Node.js](https://img.shields.io/badge/Node.js-v16+-green)](https://nodejs.org)
[![MySQL](https://img.shields.io/badge/MySQL-v8.0+-blue)](https://mysql.com)
[![Security](https://img.shields.io/badge/OWASP-Top%2010%20Addressed-red)](https://owasp.org/www-project-top-ten/)
[![Branch](https://img.shields.io/badge/Vulnerable%20Version-vulnerable--app%20branch-orange)](https://github.com/Joel-Judish/VoteSphere_Voting-System/tree/vulnerable-app)

---

## 📌 Overview

VoteSphere is an online voting platform that supports two user roles — **Administrator** and **Voter** — each with a dedicated interface. The project was built in two stages:

1. **Vulnerable version** — intentionally coded with 6 common web security flaws (lives in the [`vulnerable-app`](https://github.com/Joel-Judish/VoteSphere_Voting-System/tree/vulnerable-app) branch, runs on **port 4000**)
2. **Secure version** — all vulnerabilities fixed with industry-standard controls (this branch — `main`, runs on **port 3000**)

Both versions can run simultaneously since they use **different ports and different databases**.

---

## 🌿 Branch Structure

| Branch | Description | Port | Database |
|--------|-------------|------|----------|
| `main` | ✅ Secure version — all vulnerabilities fixed | 3000 | `voting_db` |
| `vulnerable-app` | ⚠️ Vulnerable version — for demonstration only | 4000 | `voting_db_vulnerable` |


---

## ✅ Features and Security Objectives

### Application Features

| Feature | Description |
|---------|-------------|
| User Registration | Name, email, password — server-side validated |
| User Login | bcrypt-verified authentication with role-based routing |
| Cast Vote | One vote per user, enforced at database level |
| Live Results | Real-time progress bar vote breakdown with percentages |
| Admin — Users | View all registered users, delete voter accounts |
| Admin — Candidates | Add new candidates, delete existing ones |
| Admin — Vote Reset | Clear all votes and reset counts |
| Admin — Overview | Total users, candidates, and votes at a glance |
| Session Logout | Server-side session destruction |

### Security Improvements (Vulnerable → Secure)

| # | Vulnerability | Fix Applied |
|---|--------------|-------------|
| V1 | SQL Injection — Login | Parameterized query: `WHERE email = ?` |
| V2 | SQL Injection — Registration | Parameterized query: `VALUES (?, ?, ?, ?)` |
| V3 | Plain-text Password Storage | `bcrypt.hash()` on register, `bcrypt.compare()` on login |
| V4 | No Input Validation | 4 server-side checks — presence, email format, length, characters |
| V5 | No Duplicate Vote Check | Pre-vote `SELECT` on votes table, reject if `user_id` found |
| V6 | Insecure Session Config | `httpOnly`, `sameSite:strict`, `maxAge`, `name:'vsid'`, `expires`, env secret |

---

## 📁 Project Structure

```
VoteSphere_Voting-System/         ← main branch (SECURE)
│
├── database/
│   └── schema.sql                ← Creates voting_db, all tables, seeds admin + 3 candidates
│
├── public/                       ← Statically served — no authentication required
│   ├── css/
│   │   └── style.css             ← Global dark-themed stylesheet
│   ├── login.html                ← Login page (entry point at /)
│   └── register.html             ← New user registration form
│
├── views/                        ← Served only after session verification
│   ├── dashboard.html            ← Voter interface (Cast Vote, Results, Profile)
│   └── admin.html                ← Admin panel (Overview, Users, Candidates, Results)
│
├── app.js                        ← Main Express server — all routes, security logic,
│                                    inline comments documenting each vulnerability and fix
├── db.js                         ← MySQL connection (voting_db)
├── package.json                  ← Dependencies including bcrypt
└── README.md                     ← This file
```

---

## ⚙️ Setup and Installation (Secure Version)

### Prerequisites
- [Node.js](https://nodejs.org/) v16+
- [MySQL](https://www.mysql.com/) v8.0+

### Step 1 — Clone the Repository
```bash
git clone https://github.com/Joel-Judish/VoteSphere_Voting-System.git
cd VoteSphere_Voting-System
```

### Step 2 — Set Up the Database
Open MySQL and run:
```sql
source /full/path/to/database/schema.sql
```
This creates `voting_db`, all three tables, seeds an admin account, and inserts three default candidates.

### Step 3 — Configure the Database Password
Open `db.js` and update your MySQL password:
```javascript
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'your_mysql_password',   // ← update this
    database: 'voting_db'
});
```

### Step 4 — Install Dependencies
```bash
npm install
```

### Step 5 — Start the App
```bash
node app.js
```

Open: **`http://localhost:3000`**

---

## 🚀 Setup — Vulnerable Version (Separate Branch)

```bash
# Switch to the vulnerable branch
git checkout vulnerable-app

# Install dependencies (no bcrypt needed)
npm install

# Set up the separate vulnerable database
# In MySQL: source /path/to/database/schema.sql
# (creates voting_db_vulnerable)

# Run on port 4000
node app.js
```

Open: **`http://localhost:4000`**

> Both apps can run at the same time in separate terminals — they use different ports and different databases.

---

## 📖 Usage Guidelines

### Default Accounts

| Role | Email | Password | Access |
|------|-------|----------|--------|
| Admin | `admin@vote.com` | `admin123` | Full admin panel |
| Voter | Register at `/register` | Min 6 characters | Voter dashboard |

### Voter Flow
1. Register at `/register` or log in at `/`
2. On the **Cast Vote** tab — click **Vote for [Candidate]**
3. Each user can vote **only once** — the button confirms with ✓ Voted
4. Switch to **Results** to see live percentages
5. **Logout** ends the session

### Admin Flow
1. Log in with `admin@vote.com` / `admin123`
2. **Overview** — statistics and quick results; **Reset All Votes** clears everything
3. **Users** — view all registered users, delete voter accounts
4. **Candidates** — add new candidates, delete existing ones
5. **Results** — detailed vote breakdown

---

## 🔒 Security Improvements in Detail

### SQL Injection Prevention
```javascript
// VULNERABLE (in vulnerable-app branch)
const query = `SELECT * FROM users WHERE email = '${email}' AND password = '${password}'`;

// SECURE (this branch)
const query = "SELECT * FROM users WHERE email = ?";
db.query(query, [email], (err, results) => { ... });
```

### bcrypt Password Hashing
```javascript
// VULNERABLE — plain text stored directly
// SECURE — hash on register, compare on login
bcrypt.hash(password, 10, (err, hash) => {
    db.query(query, [username, email, hash], ...);
});
bcrypt.compare(password, user.password, (err, match) => { ... });
```

### Duplicate Vote Prevention
```javascript
db.query('SELECT * FROM votes WHERE user_id = ?', [userId], (err, results) => {
    if (results.length > 0)
        return res.status(400).json({ error: 'You have already voted.' });
    // proceed with INSERT only if no existing vote
});
```

### Secure Session Configuration
```javascript
app.use(session({
    secret: process.env.SESSION_SECRET || 'StrongRandomSecret123!',
    name: 'vsid',                                      // prevents server fingerprinting
    cookie: {
        httpOnly: true,                                // blocks JS access (XSS mitigation)
        sameSite: 'strict',                            // prevents CSRF
        maxAge: 1000 * 60 * 30,                        // 30-minute timeout
        expires: new Date(Date.now() + 1000 * 60 * 30) // explicit expiry
    }
}));
```

---

## 🧪 Testing

### Functional Testing
All features were tested manually. Key security boundary tests:
- Unauthenticated access to `/dashboard` and `/admin` → redirect to login
- Voter accessing `/api/admin/users` → 403 Forbidden

### Security Feature Tests

| Test | Action | Expected | Result |
|------|--------|----------|--------|
| SQL Injection | Enter `admin@vote.com' OR '1'='1` as email | Login rejected | ✅ PASS |
| Duplicate Vote | Send second `POST /api/vote` via console | 400 Already voted | ✅ PASS |
| RBAC | Voter calls `/api/admin/users` | 403 Forbidden | ✅ PASS |

### SAST — Semgrep
```bash
semgrep --config=auto app.js
```
- **200 rules run, 6 findings** — all relating to cookie configuration
- Core implementations (parameterized queries, bcrypt, duplicate vote) were **not flagged**
- 2 findings fixed in code: custom cookie name (`vsid`) and explicit `expires` attribute
- 4 findings documented as accepted dev-environment behaviour or future improvements

---

## 📚 References and Libraries

| Library | Purpose |
|---------|---------|
| [Express.js](https://expressjs.com) | Web framework and routing |
| [express-session](https://github.com/expressjs/session) | Server-side session management |
| [mysql2](https://github.com/sidorares/node-mysql2) | MySQL driver with parameterized queries |
| [bcrypt](https://github.com/kelektiv/node.bcrypt.js) | Password hashing (saltRounds=10) |
| [body-parser](https://github.com/expressjs/body-parser) | HTTP request body parsing |
| [Semgrep](https://semgrep.dev) | Static Application Security Testing |
| [OWASP Top Ten](https://owasp.org/www-project-top-ten/) | Security vulnerability reference |

---

## 🔮 Future Improvements

- CSRF token protection using `csurf` middleware
- Rate limiting on `/login` to prevent brute-force attacks
- `secure: true` cookie flag when deployed over HTTPS
- Output encoding on candidate names to fully prevent XSS
- Audit logging for security-relevant events

---

*Developed as part of an academic Secure Web Development module — National College of Ireland.*
*All security implementations are original student work.*

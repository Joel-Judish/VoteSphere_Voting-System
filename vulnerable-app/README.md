# ⚠️ VoteSphere — Vulnerable Version

> **This branch contains the intentionally vulnerable version of VoteSphere.**
> It exists purely for academic demonstration purposes to showcase real-world web security vulnerabilities before they are fixed.
> **Do NOT deploy this code in any real or production environment.**

The secure, fixed version of this application lives in the **`main`** branch.

---

##  Quick Start

```bash
# 1. Switch to this branch (if not already on it)
git checkout vulnerable-app

# 2. Install dependencies
npm install

# 3. Set up the vulnerable database in MySQL
#    source the schema file (uses voting_db_vulnerable on port 4000)
source /path/to/database/schema.sql

# 4. Run the app
node app.js
```

Open your browser at: **`http://localhost:4000`**

> The secure solution app runs on port 3000 with database `voting_db`.
> This vulnerable app runs on **port 4000** with database **`voting_db_vulnerable`** — they are completely independent.

**Default login:** `admin@vote.com` / `admin123`

---

##  Vulnerabilities Present in This Version

This version contains **6 intentional security vulnerabilities**. Each one can be demonstrated live as shown below.

---

### Vulnerability 1 — SQL Injection (Login)
**File:** `app.js` — `POST /login` route
**Why it is dangerous:** User input is directly concatenated into the SQL query string. An attacker can manipulate the WHERE clause to bypass authentication entirely without knowing any password.

**How to exploit it:**
1. Go to `http://localhost:4000`
2. In the **Email** field enter exactly:
```
' OR 1=1# 
```
3. In the **Password** field enter anything (e.g. `wrongpassword`)
4. Click **Sign In**

**What happens:** You are logged in as admin with a completely wrong password. The SQL query becomes:
```sql
SELECT * FROM users WHERE email = 'admin@vote.com' OR '1'='1' --' AND password = 'wrongpassword'
```
The `OR '1'='1'` always evaluates to true and `--` comments out the password check, so the query returns the first user (admin) regardless of the password entered.

---

### Vulnerability 2 — SQL Injection (Registration)
**File:** `app.js` — `POST /register` route
**Why it is dangerous:** User input in the registration form is directly injected into the INSERT query. An attacker can insert a malicious payload to manipulate the database.

**How to exploit it:**
1. Go to `http://localhost:4000/register`
2. In the **Full Name** field enter:
```
test'), ('hacker', 'hacker@evil.com', 'hacked', 'admin
```
3. Fill email and password with anything and click **Create Account**

**What happens:** The injected payload closes the original INSERT statement and appends a second one, creating a hidden admin account (`hacker@evil.com`) in the database directly.

---

### Vulnerability 3 — Plain Text Password Storage
**File:** `app.js` — `POST /register` + `database/schema.sql`
**Why it is dangerous:** Passwords are stored in the database exactly as the user typed them. Anyone who gains read access to the database — through a SQL injection attack, a misconfigured backup, or a server breach — can immediately read every user's password.

**How to demonstrate it:**
1. Register a new account at `http://localhost:4000/register` with password `mypassword123`
2. Open MySQL Workbench and run:
```sql
USE voting_db_vulnerable;
SELECT username, email, password FROM users;
```
**What you see:** The password column shows `mypassword123` in plain text alongside the seeded admin password `admin123`. Compare this to the secure version (`voting_db`) where the same column shows `$2b$10$...` bcrypt hashes.

---

### Vulnerability 4 — Missing Input Validation (Registration)
**File:** `app.js` — `POST /register` route
**Why it is dangerous:** The registration endpoint accepts any input with no checks — empty fields, invalid email formats, one-character passwords, and script tags are all accepted silently.

**How to exploit it:**

*Test 1 — Empty submission:*
1. Go to `http://localhost:4000/register`
2. Leave all fields blank and click **Create Account**
3. The server accepts it and inserts a blank row into the database

*Test 2 — Script injection:*
1. In the Full Name field enter: `<script>alert('XSS')</script>`
2. Click **Create Account** — the server accepts it without any complaint

---

### Vulnerability 5 — No Duplicate Vote Check
**File:** `app.js` — `POST /api/vote` route
**Why it is dangerous:** There is no check whether a user has already voted. The same logged-in user can call the vote endpoint repeatedly and inflate any candidate's vote count to any number, completely corrupting election results.

**How to exploit it:**
1. Log in as a voter at `http://localhost:4000`
2. Cast a vote for any candidate via the UI — note the vote count
3. Open browser DevTools (F12) → Console tab and paste:
```javascript
// Run this 5 times — watch the vote count jump each time
fetch('/api/vote', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({candidateId: 1})
}).then(r => r.json()).then(console.log)
```
4. Go to the **Results** tab — the vote count for candidate 1 increases by 1 each time you run it

---

### Vulnerability 6 — Insecure Session Configuration
**File:** `app.js` — `app.use(session({...}))` block
**Why it is dangerous:** The session uses a hardcoded weak secret (`'votingsecret'`), and no cookie security attributes are set. This means:
- No `httpOnly` flag → JavaScript can read the session cookie, enabling XSS-based session theft
- No `sameSite` flag → Cookie is sent on cross-site requests, enabling CSRF attacks
- No `maxAge` → Session never expires, a stolen session token works indefinitely
- Weak secret → The session can potentially be forged

**How to demonstrate it:**
1. Log in at `http://localhost:4000`
2. Open DevTools (F12) → Application tab → Cookies → `http://localhost:4000`
3. You can see the `connect.sid` session cookie
4. Open the Console tab and run:
```javascript
// In the VULNERABLE app - JavaScript CAN read the cookie
// (httpOnly is not set, so document.cookie exposes it)
console.log(document.cookie)
```
**What you see:** The session cookie value is readable by JavaScript — in the secure version, `httpOnly: true` makes this return an empty string.

---

## 📁 Files in This Branch

```
vulnerable-app/
├── database/
│   └── schema.sql       ← Creates voting_db_vulnerable with plain-text admin password
├── public/
│   ├── css/style.css    ← Identical styling to secure version
│   ├── login.html       ← Login page
│   └── register.html    ← Registration page
├── views/
│   ├── dashboard.html   ← Voter interface
│   └── admin.html       ← Admin panel
├── app.js               ← Main server with ALL 6 vulnerabilities (port 4000)
├── db.js                ← Connects to voting_db_vulnerable
├── package.json         ← No bcrypt dependency
└── README.md            ← This file
```

---

## 🔄 Switching Between Vulnerable and Secure Apps

```bash
# Run the VULNERABLE app (this branch) — port 4000, voting_db_vulnerable
git checkout vulnerable-app
npm install
node app.js
# → http://localhost:4000

# Run the SECURE app (main branch) — port 3000, voting_db
git checkout main
npm install
node app.js
# → http://localhost:3000
```

Both apps can run simultaneously since they use different ports and different databases.

---

## 🔗 Related

- **Secure version (main branch):** All 6 vulnerabilities fixed
- **GitHub repository:** https://github.com/Joel-Judish/VoteSphere_Voting-System

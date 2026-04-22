const mysql = require('mysql2');

// Connects to a SEPARATE database (voting_db_vulnerable) so it does not
// interfere with the secure solution app running on voting_db.
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Joel#2003',        // Your MySQL root password
    database: 'voting_db_vulnerable'
});

db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err.message);
        process.exit(1);
    }
    console.log('Connected to voting_db_vulnerable database.');
});

module.exports = db;

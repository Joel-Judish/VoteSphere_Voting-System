-- ============================================================
-- VULNERABLE VERSION DATABASE
-- Uses a SEPARATE database: voting_db_vulnerable
-- ============================================================

CREATE DATABASE IF NOT EXISTS voting_db_vulnerable;
USE voting_db_vulnerable;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'voter') DEFAULT 'voter',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS candidates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    party VARCHAR(150),
    description TEXT,
    votes INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS votes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    candidate_id INT NOT NULL,
    voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (candidate_id) REFERENCES candidates(id)
);

-- VULNERABILITY 3:
-- Admin password stored in PLAIN TEXT - no hashing applied.
-- Anyone with database access can read the password directly.
INSERT INTO users (username, email, password, role) VALUES
('admin', 'admin@vote.com', 'admin123', 'admin');

-- =============================================================
-- Ticketing and Task Management System Database Schema
--
-- This schema is aligned with the Sequelize models in the backend.
-- It implements a standardized ID generation system (XXX-YYYYMMDD-XXXXX)
-- and covers all entities: users, departments, tickets, tasks, comments,
-- notifications, file attachments, user sessions, and analytics-related tables.
--
-- Conventions:
--   - All IDs use a prefix, date, and sequence (e.g., USR-20240315-00001)
--   - Snake_case is used for all database fields
--   - Foreign keys and relationships are explicitly defined
--   - Timestamps are included for auditing
--   - ENUMs and constraints match the backend logic
-- =============================================================

-- =============================================
-- Error Handling
-- =============================================
DELIMITER //

DROP PROCEDURE IF EXISTS handle_error //
CREATE PROCEDURE IF NOT EXISTS handle_error()
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'An error occurred during schema creation';
    END;
END //

DELIMITER ;

-- =============================================
-- Sequence Management
-- =============================================
-- Manages the sequence numbers for ID generation for each entity type.
-- Used by backend logic to generate unique IDs in the required format.
DROP TABLE IF EXISTS id_sequences;
CREATE TABLE IF NOT EXISTS id_sequences (
    sequence_name VARCHAR(20) PRIMARY KEY, -- Prefix (e.g., 'USR', 'TKT')
    current_value BIGINT NOT NULL DEFAULT 0, -- Current sequence number
    last_reset_date DATE NOT NULL,          -- Last date the sequence was reset
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Initialize sequences for all entity types
INSERT IGNORE INTO id_sequences (sequence_name, current_value, last_reset_date) VALUES
('USR', 0, CURRENT_DATE), -- Users
('DEP', 0, CURRENT_DATE), -- Departments
('TKT', 0, CURRENT_DATE), -- Tickets
('TSK', 0, CURRENT_DATE), -- Tasks
('CMT', 0, CURRENT_DATE), -- Comments
('NOT', 0, CURRENT_DATE), -- Notifications
('FIL', 0, CURRENT_DATE), -- File Attachments
('ANL', 0, CURRENT_DATE), -- Analytics
('SES', 0, CURRENT_DATE); -- User Sessions

-- =============================================
-- ID Generation Function
-- =============================================
DELIMITER //

DROP FUNCTION IF EXISTS generate_id //
CREATE FUNCTION IF NOT EXISTS generate_id(prefix VARCHAR(3)) 
RETURNS VARCHAR(20)
DETERMINISTIC
BEGIN
    DECLARE current_date_str VARCHAR(8);
    DECLARE sequence_num BIGINT;
    DECLARE new_id VARCHAR(20);
    DECLARE max_sequence BIGINT DEFAULT 99999;
    DECLARE last_reset DATE;
    
    -- Validate prefix
    IF prefix NOT IN ('USR', 'DEP', 'TKT', 'TSK', 'CMT', 'NOT', 'FIL', 'ANL', 'SES') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid prefix for ID generation';
    END IF;
    
    -- Get current date in YYYYMMDD format
    SET current_date_str = DATE_FORMAT(CURRENT_DATE, '%Y%m%d');
    
    -- Get the current sequence and last reset date
    SELECT current_value, last_reset_date 
    INTO sequence_num, last_reset
    FROM id_sequences
    WHERE sequence_name = prefix
    FOR UPDATE;
    
    -- Check if sequence needs reset
    IF last_reset < CURRENT_DATE THEN
        SET sequence_num = 1;
    ELSE
        SET sequence_num = sequence_num + 1;
    END IF;
    
    -- Check for sequence overflow
    IF sequence_num > max_sequence THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Sequence number overflow';
    END IF;
    
    -- Update sequence
    UPDATE id_sequences 
    SET current_value = sequence_num,
        last_reset_date = CURRENT_DATE
    WHERE sequence_name = prefix;
    
    -- Format the ID: XXX-YYYYMMDD-XXXXX
    SET new_id = CONCAT(prefix, '-', current_date_str, '-', LPAD(sequence_num, 5, '0'));
    
    RETURN new_id;
END //

-- =============================================
-- Utility Functions
-- =============================================
-- Function to validate ID format
DROP FUNCTION IF EXISTS validate_id_format //
CREATE FUNCTION IF NOT EXISTS validate_id_format(id VARCHAR(20)) 
RETURNS BOOLEAN
DETERMINISTIC
BEGIN
    RETURN id REGEXP '^[A-Z]{3}-[0-9]{8}-[0-9]{5}$';
END //

-- Function to extract date from ID
DROP FUNCTION IF EXISTS extract_date_from_id //
CREATE FUNCTION IF NOT EXISTS extract_date_from_id(id VARCHAR(20)) 
RETURNS DATE
DETERMINISTIC
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid date format in ID';
    END;
    RETURN STR_TO_DATE(SUBSTRING(id, 5, 8), '%Y%m%d');
END //

-- Function to extract sequence number from ID
DROP FUNCTION IF EXISTS extract_sequence_from_id //
CREATE FUNCTION IF NOT EXISTS extract_sequence_from_id(id VARCHAR(20)) 
RETURNS INT
DETERMINISTIC
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid sequence format in ID';
    END;
    RETURN CAST(SUBSTRING(id, 14, 5) AS UNSIGNED);
END //

-- Function to validate email format
DROP FUNCTION IF EXISTS validate_email //
CREATE FUNCTION IF NOT EXISTS validate_email(email VARCHAR(100)) 
RETURNS BOOLEAN
DETERMINISTIC
BEGIN
    RETURN email REGEXP '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END //

-- Function to validate phone number format
DROP FUNCTION IF EXISTS validate_phone //
CREATE FUNCTION IF NOT EXISTS validate_phone(phone VARCHAR(20)) 
RETURNS BOOLEAN
DETERMINISTIC
BEGIN
    RETURN phone REGEXP '^\\+[0-9]{1,3}[0-9]{9,14}$';
END //

-- Function to validate password strength
DROP FUNCTION IF EXISTS validate_password //
CREATE FUNCTION IF NOT EXISTS validate_password(password VARCHAR(255)) 
RETURNS BOOLEAN
DETERMINISTIC
BEGIN
    RETURN LENGTH(password) >= 8 
           AND password REGEXP '[A-Z]' 
           AND password REGEXP '[a-z]' 
           AND password REGEXP '[0-9]' 
           AND password REGEXP '[^A-Za-z0-9]';
END //

DELIMITER ;

-- =============================================
-- Database Tables
-- =============================================
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS file_attachments;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS departments;
DROP TABLE IF EXISTS task_metrics;
DROP TABLE IF EXISTS user_performance;
DROP TABLE IF EXISTS department_analytics;
DROP TABLE IF EXISTS task_trends;
DROP TABLE IF EXISTS user_activity_logs;
DROP TABLE IF EXISTS custom_reports;
SET FOREIGN_KEY_CHECKS = 1;

-- Departments Table
-- Stores department information. Each department can have many users.
CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR(20) PRIMARY KEY, -- e.g., DEP-YYYYMMDD-XXXXX
    name VARCHAR(100) NOT NULL UNIQUE, -- Department name (unique)
    description TEXT,                  -- Optional description
    is_active BOOLEAN DEFAULT true,    -- Soft delete/active flag
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Users Table
-- Stores user accounts. Users can be admins, department heads, or employees.
-- department_id is nullable for admins.
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(20) PRIMARY KEY, -- e.g., USR-YYYYMMDD-XXXXX
    username VARCHAR(50) UNIQUE NOT NULL, -- Login username
    email VARCHAR(100) UNIQUE NOT NULL,   -- User email
    password VARCHAR(255) NOT NULL,       -- Hashed password
    role ENUM('admin', 'department_head', 'employee') NOT NULL DEFAULT 'employee',
    department_id VARCHAR(20),            -- FK to departments (nullable for admins)
    is_active BOOLEAN DEFAULT true,       -- Soft delete/active flag
    last_login DATETIME,                  -- Last login timestamp
    reset_token VARCHAR(255),             -- For password reset
    reset_token_expiry DATETIME,          -- Token expiry
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

-- Tickets Table
-- Represents support tickets. Each ticket is created by a user and belongs to a department.
CREATE TABLE IF NOT EXISTS tickets (
    id VARCHAR(20) PRIMARY KEY, -- e.g., TKT-YYYYMMDD-XXXXX
    title VARCHAR(255) NOT NULL,         -- Ticket title
    description TEXT NOT NULL,           -- Ticket details
    status ENUM('open', 'in_progress', 'resolved', 'closed') NOT NULL DEFAULT 'open',
    priority ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
    category ENUM('bug', 'feature', 'support', 'other') NOT NULL DEFAULT 'other',
    department_id VARCHAR(20) NOT NULL,  -- FK to departments
    created_by VARCHAR(20) NOT NULL,     -- FK to users (creator)
    assigned_to VARCHAR(20),             -- FK to users (assignee, nullable)
    due_date DATETIME,                   -- Optional due date
    is_active BOOLEAN DEFAULT true,      -- Soft delete/active flag
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

-- Tasks Table
-- Represents tasks, which may be linked to tickets. Each task is assigned to a user.
CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(20) PRIMARY KEY, -- e.g., TSK-YYYYMMDD-XXXXX
    title VARCHAR(255) NOT NULL,         -- Task title
    description TEXT NOT NULL,           -- Task details
    status ENUM('pending', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
    priority ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
    due_date DATETIME,                   -- Optional due date
    assigned_to_id VARCHAR(20),          -- FK to users (assignee, nullable)
    created_by VARCHAR(20) NOT NULL,     -- FK to users (creator)
    department_id VARCHAR(20) NOT NULL,  -- FK to departments
    is_active BOOLEAN DEFAULT true,      -- Soft delete/active flag
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_to_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- Comments Table
-- Stores comments on tasks. Each comment is authored by a user.
CREATE TABLE IF NOT EXISTS comments (
    id VARCHAR(20) PRIMARY KEY, -- e.g., CMT-YYYYMMDD-XXXXX
    content TEXT NOT NULL,              -- Comment text
    task_id VARCHAR(20) NOT NULL,       -- FK to tasks
    author_id VARCHAR(20) NOT NULL,     -- FK to users (author)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id)
);

-- Notifications Table
-- Stores notifications for users about ticket/task/comment events.
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(20) PRIMARY KEY, -- e.g., NOT-YYYYMMDD-XXXXX
    type ENUM('task_assigned', 'task_updated', 'comment_added', 'task_completed', 'ticket_status_changed', 'new_ticket') NOT NULL,
    message TEXT NOT NULL,              -- Notification message
    is_read BOOLEAN DEFAULT false,      -- Read/unread status
    user_id VARCHAR(20) NOT NULL,       -- FK to users (recipient)
    task_id VARCHAR(20),                -- FK to tasks (nullable)
    related_user_id VARCHAR(20),        -- FK to users (related, nullable)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (task_id) REFERENCES tasks(id),
    FOREIGN KEY (related_user_id) REFERENCES users(id)
);

-- File Attachments Table
-- Stores file uploads related to tickets, tasks, or comments.
CREATE TABLE IF NOT EXISTS file_attachments (
    id VARCHAR(20) PRIMARY KEY, -- e.g., FIL-YYYYMMDD-XXXXX
    ticket_id VARCHAR(20),              -- FK to tickets (nullable)
    task_id VARCHAR(20),                -- FK to tasks (nullable)
    comment_id VARCHAR(20),             -- FK to comments (nullable)
    file_name VARCHAR(255) NOT NULL,    -- Original file name
    file_path VARCHAR(255) NOT NULL,    -- Path on server
    file_type VARCHAR(50),              -- MIME type
    file_size INT,                      -- File size in bytes
    uploaded_by VARCHAR(20) NOT NULL,   -- FK to users (uploader)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE SET NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE SET NULL,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- User Sessions Table
-- Stores active user sessions for authentication and tracking.
CREATE TABLE IF NOT EXISTS user_sessions (
    id VARCHAR(20) PRIMARY KEY, -- e.g., SES-YYYYMMDD-XXXXX
    user_id VARCHAR(20) NOT NULL,       -- FK to users
    token VARCHAR(512) NOT NULL,        -- Session token
    ip VARCHAR(64),                    -- IP address
    user_agent VARCHAR(256),            -- User agent string
    expires_at DATETIME,                -- Expiry timestamp
    is_active BOOLEAN DEFAULT true,     -- Soft delete/active flag
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Analytics-related Tables
-- These tables store various analytics and reporting data, as per backend models.

-- Task Metrics: Aggregated task stats per department per day
CREATE TABLE IF NOT EXISTS task_metrics (
    id VARCHAR(20) PRIMARY KEY, -- e.g., ANL-YYYYMMDD-XXXXX
    department_id VARCHAR(20) NOT NULL,  -- FK to departments
    total_tasks INT DEFAULT 0,
    completed_tasks INT DEFAULT 0,
    pending_tasks INT DEFAULT 0,
    overdue_tasks INT DEFAULT 0,
    average_completion_time FLOAT DEFAULT 0,
    date DATE NOT NULL,                  -- Date of aggregation
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- User Performance: Aggregated user stats per day
CREATE TABLE IF NOT EXISTS user_performance (
    id VARCHAR(20) PRIMARY KEY, -- e.g., ANL-YYYYMMDD-XXXXX
    user_id VARCHAR(20) NOT NULL,       -- FK to users
    tasks_completed INT DEFAULT 0,
    tasks_overdue INT DEFAULT 0,
    average_response_time FLOAT DEFAULT 0,
    productivity_score FLOAT DEFAULT 0,
    date DATE NOT NULL,                  -- Date of aggregation
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Department Analytics: Aggregated department stats per day
CREATE TABLE IF NOT EXISTS department_analytics (
    id VARCHAR(20) PRIMARY KEY, -- e.g., ANL-YYYYMMDD-XXXXX
    department_id VARCHAR(20) NOT NULL,  -- FK to departments
    total_employees INT DEFAULT 0,
    active_employees INT DEFAULT 0,
    department_efficiency FLOAT DEFAULT 0,
    average_task_completion_time FLOAT DEFAULT 0,
    date DATE NOT NULL,                  -- Date of aggregation
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- Task Trends: Trends and distributions for tasks over a period
CREATE TABLE IF NOT EXISTS task_trends (
    id VARCHAR(20) PRIMARY KEY, -- e.g., ANL-YYYYMMDD-XXXXX
    department_id VARCHAR(20) NOT NULL,  -- FK to departments
    period ENUM('daily', 'weekly', 'monthly') NOT NULL, -- Aggregation period
    start_date DATE NOT NULL,             -- Period start
    end_date DATE NOT NULL,               -- Period end
    completion_rate FLOAT DEFAULT 0,
    average_resolution_time FLOAT DEFAULT 0,
    priority_distribution JSON,           -- JSON object
    status_distribution JSON,             -- JSON object
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- User Activity Logs: Tracks user actions for auditing
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id VARCHAR(20) PRIMARY KEY, -- e.g., ANL-YYYYMMDD-XXXXX
    user_id VARCHAR(20) NOT NULL,       -- FK to users
    action ENUM('login', 'task_create', 'task_update', 'task_complete', 'comment_add') NOT NULL,
    entity_type VARCHAR(50),            -- Type of entity acted on
    entity_id VARCHAR(20),              -- ID of entity
    details JSON,                       -- Additional details
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, -- Action time
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Custom Reports: Stores user-defined or scheduled reports
CREATE TABLE IF NOT EXISTS custom_reports (
    id VARCHAR(20) PRIMARY KEY, -- e.g., RPT-YYYYMMDD-XXXXX
    name VARCHAR(255) NOT NULL,         -- Report name
    description TEXT,                   -- Optional description
    created_by VARCHAR(20) NOT NULL,    -- FK to users (creator)
    type ENUM('task', 'user', 'department', 'custom') NOT NULL, -- Report type
    parameters JSON NOT NULL,           -- Report parameters
    schedule JSON,                      -- Scheduling info
    is_active BOOLEAN DEFAULT true,     -- Soft delete/active flag
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- =============================================
-- Triggers for ID Generation
-- =============================================
DELIMITER //

-- Users Table Trigger
CREATE TRIGGER before_user_insert
BEFORE INSERT ON users
FOR EACH ROW
BEGIN
    IF NEW.id IS NULL THEN
        SET NEW.id = generate_id('USR');
    END IF;
END //

-- Departments Table Trigger
CREATE TRIGGER before_department_insert
BEFORE INSERT ON departments
FOR EACH ROW
BEGIN
    IF NEW.id IS NULL THEN
        SET NEW.id = generate_id('DEP');
    END IF;
END //

-- Tickets Table Trigger
CREATE TRIGGER before_ticket_insert
BEFORE INSERT ON tickets
FOR EACH ROW
BEGIN
    IF NEW.id IS NULL THEN
        SET NEW.id = generate_id('TKT');
    END IF;
END //

-- Tasks Table Trigger
CREATE TRIGGER before_task_insert
BEFORE INSERT ON tasks
FOR EACH ROW
BEGIN
    IF NEW.id IS NULL THEN
        SET NEW.id = generate_id('TSK');
    END IF;
END //

-- Comments Table Trigger
CREATE TRIGGER before_comment_insert
BEFORE INSERT ON comments
FOR EACH ROW
BEGIN
    IF NEW.id IS NULL THEN
        SET NEW.id = generate_id('CMT');
    END IF;
END //

-- Notifications Table Trigger
CREATE TRIGGER before_notification_insert
BEFORE INSERT ON notifications
FOR EACH ROW
BEGIN
    IF NEW.id IS NULL THEN
        SET NEW.id = generate_id('NOT');
    END IF;
END //

-- File Attachments Table Trigger
CREATE TRIGGER before_file_attachment_insert
BEFORE INSERT ON file_attachments
FOR EACH ROW
BEGIN
    IF NEW.id IS NULL THEN
        SET NEW.id = generate_id('FIL');
    END IF;
END //

-- Analytics Table Trigger
CREATE TRIGGER before_analytics_insert
BEFORE INSERT ON analytics
FOR EACH ROW
BEGIN
    IF NEW.id IS NULL THEN
        SET NEW.id = generate_id('ANL');
    END IF;
END //

-- User Sessions Table Trigger
CREATE TRIGGER before_user_session_insert
BEFORE INSERT ON user_sessions
FOR EACH ROW
BEGIN
    IF NEW.id IS NULL THEN
        SET NEW.id = generate_id('SES');
    END IF;
END //

DELIMITER ;

-- =============================================
-- Indexes
-- =============================================
-- Drop existing indexes
ALTER TABLE users DROP INDEX idx_users_id;
ALTER TABLE departments DROP INDEX idx_departments_id;
ALTER TABLE tickets DROP INDEX idx_tickets_id;
ALTER TABLE tasks DROP INDEX idx_tasks_id;
ALTER TABLE comments DROP INDEX idx_comments_id;
ALTER TABLE notifications DROP INDEX idx_notifications_id;
ALTER TABLE file_attachments DROP INDEX idx_file_attachments_id;
ALTER TABLE analytics DROP INDEX idx_analytics_id;
ALTER TABLE user_sessions DROP INDEX idx_user_sessions_id;
ALTER TABLE users DROP INDEX idx_users_department;
ALTER TABLE users DROP INDEX idx_users_role;
ALTER TABLE users DROP INDEX idx_users_role_department;
ALTER TABLE tickets DROP INDEX idx_tickets_status;
ALTER TABLE tickets DROP INDEX idx_tickets_priority;
ALTER TABLE tasks DROP INDEX idx_tasks_status;
ALTER TABLE notifications DROP INDEX idx_notifications_is_read;
ALTER TABLE user_sessions DROP INDEX idx_user_sessions_expires;
ALTER TABLE tickets DROP INDEX idx_tickets_due_date;
ALTER TABLE tasks DROP INDEX idx_tasks_due_date;
ALTER TABLE analytics DROP INDEX idx_analytics_date;

-- Create indexes
CREATE INDEX idx_users_id ON users(id);
CREATE INDEX idx_departments_id ON departments(id);
CREATE INDEX idx_tickets_id ON tickets(id);
CREATE INDEX idx_tasks_id ON tasks(id);
CREATE INDEX idx_comments_id ON comments(id);
CREATE INDEX idx_notifications_id ON notifications(id);
CREATE INDEX idx_file_attachments_id ON file_attachments(id);
CREATE INDEX idx_analytics_id ON analytics(id);
CREATE INDEX idx_user_sessions_id ON user_sessions(id);
CREATE INDEX idx_users_department ON users(department_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_role_department ON users(role, department_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX idx_tickets_due_date ON tickets(due_date);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_analytics_date ON analytics(date);
CREATE INDEX idx_task_metrics_date ON task_metrics(date);
CREATE INDEX idx_user_performance_date ON user_performance(date);
CREATE INDEX idx_department_analytics_date ON department_analytics(date);
CREATE INDEX idx_task_trends_period ON task_trends(period);

-- =============================================
-- Usage Examples
-- =============================================
/*
-- Example 1: Insert a new user (ID will be automatically generated)
INSERT INTO users (username, email, password, role) 
VALUES ('john_doe', 'john@example.com', 'hashed_password', 'employee');

-- Example 2: Query a user by ID
SELECT * FROM users WHERE id = 'USR-20240315-00001';

-- Example 3: Validate ID format
SELECT validate_id_format('USR-20240315-00001'); -- Returns 1 (true)

-- Example 4: Extract date from ID
SELECT extract_date_from_id('USR-20240315-00001'); -- Returns 2024-03-15

-- Example 5: Extract sequence number from ID
SELECT extract_sequence_from_id('USR-20240315-00001'); -- Returns 1
*/

-- =============================================
-- Triggers for Role-Department Validation
-- =============================================
DELIMITER //

DROP TRIGGER IF EXISTS before_user_insert //
CREATE TRIGGER before_user_insert
BEFORE INSERT ON users
FOR EACH ROW
BEGIN
    -- Validate department_head role
    IF NEW.role = 'department_head' AND NEW.department_id IS NULL THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Department head must be assigned to a department';
    END IF;
    
    -- Validate employee role
    IF NEW.role = 'employee' AND NEW.department_id IS NULL THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Employee must be assigned to a department';
    END IF;
    
    -- Validate admin role
    IF NEW.role = 'admin' AND NEW.department_id IS NOT NULL THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Admin cannot be assigned to a department';
    END IF;
END //

DROP TRIGGER IF EXISTS before_user_update //
CREATE TRIGGER before_user_update
BEFORE UPDATE ON users
FOR EACH ROW
BEGIN
    -- Validate department_head role
    IF NEW.role = 'department_head' AND NEW.department_id IS NULL THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Department head must be assigned to a department';
    END IF;
    
    -- Validate employee role
    IF NEW.role = 'employee' AND NEW.department_id IS NULL THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Employee must be assigned to a department';
    END IF;
    
    -- Validate admin role
    IF NEW.role = 'admin' AND NEW.department_id IS NOT NULL THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Admin cannot be assigned to a department';
    END IF;
END //

DELIMITER ;

-- Add view for department structure
DROP VIEW IF EXISTS department_structure;
CREATE VIEW department_structure AS
SELECT 
    d.id AS department_id,
    d.name AS department_name,
    d.description AS department_description,
    u.id AS head_id,
    u.username AS head_username,
    u.email AS head_email,
    u.first_name AS head_first_name,
    u.last_name AS head_last_name,
    COUNT(e.id) AS employee_count
FROM departments d
LEFT JOIN users u ON d.head_id = u.id AND u.role = 'department_head'
LEFT JOIN users e ON d.id = e.department_id AND e.role = 'employee'
GROUP BY d.id, d.name, d.description, u.id, u.username, u.email, u.first_name, u.last_name;

-- Add view for user department details
DROP VIEW IF EXISTS user_department_details;
CREATE VIEW user_department_details AS
SELECT 
    u.id AS user_id,
    u.username,
    u.email,
    u.role,
    u.first_name,
    u.last_name,
    d.id AS department_id,
    d.name AS department_name,
    d.description AS department_description,
    CASE 
        WHEN u.role = 'department_head' THEN 'Head'
        WHEN u.role = 'employee' THEN 'Member'
        ELSE 'None'
    END AS department_role
FROM users u
LEFT JOIN departments d ON u.department_id = d.id; 
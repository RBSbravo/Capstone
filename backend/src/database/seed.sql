-- Initial Data Seeding
-- This file contains the initial data for the system

-- Insert Admin User (pre-approved)
INSERT INTO users (
    username,
    email,
    password, -- This should be hashed in production
    role,
    first_name,
    last_name,
    phone,
    is_active,
    is_approved
) VALUES (
    'admin',
    'admin@company.ph',
    '$2a$10$X7UrH5YxX5YxX5YxX5YxX.5YxX5YxX5YxX5YxX5YxX5YxX5YxX', -- hashed 'admin123'
    'admin',
    'Juan',
    'Dela Cruz',
    '+639123456789',
    true,
    true
);

-- Insert Departments
INSERT INTO departments (name, description) VALUES
('IT', 'Information Technology Department - Handles all technical systems and digital infrastructure'),
('HR', 'Human Resources Department - Manages employee relations and organizational development'),
('ACCOUNTING', 'Accounting and Finance Department - Handles financial operations and reporting');

-- Insert Department Heads
INSERT INTO users (
    username,
    email,
    password, -- This should be hashed in production
    role,
    department_id,
    first_name,
    last_name,
    phone,
    is_active,
    is_approved
) VALUES
-- IT Department Head
(
    'it_head',
    'it.head@company.ph',
    '$2a$10$X7UrH5YxX5YxX5YxX5YxX.5YxX5YxX5YxX5YxX5YxX5YxX5YxX', -- hashed 'ithead123'
    'department_head',
    (SELECT id FROM departments WHERE name = 'IT'),
    'Maria',
    'Santos',
    '+639234567890',
    true,
    true
),
-- HR Department Head
(
    'hr_head',
    'hr.head@company.ph',
    '$2a$10$X7UrH5YxX5YxX5YxX5YxX.5YxX5YxX5YxX5YxX5YxX5YxX5YxX', -- hashed 'hrhead123'
    'department_head',
    (SELECT id FROM departments WHERE name = 'HR'),
    'Antonio',
    'Reyes',
    '+639345678901',
    true,
    true
),
-- Accounting Department Head
(
    'acc_head',
    'acc.head@company.ph',
    '$2a$10$X7UrH5YxX5YxX5YxX5YxX.5YxX5YxX5YxX5YxX5YxX5YxX5YxX', -- hashed 'acchead123'
    'department_head',
    (SELECT id FROM departments WHERE name = 'ACCOUNTING'),
    'Carmen',
    'Garcia',
    '+639456789012',
    true,
    true
);

-- Update Departments with their heads
UPDATE departments 
SET head_id = (SELECT id FROM users WHERE username = 'it_head')
WHERE name = 'IT';

UPDATE departments 
SET head_id = (SELECT id FROM users WHERE username = 'hr_head')
WHERE name = 'HR';

UPDATE departments 
SET head_id = (SELECT id FROM users WHERE username = 'acc_head')
WHERE name = 'ACCOUNTING';

-- Insert Employees
INSERT INTO users (
    username,
    email,
    password, -- This should be hashed in production
    role,
    department_id,
    first_name,
    last_name,
    phone,
    is_active,
    is_approved
) VALUES
-- IT Department Employee
(
    'it_emp1',
    'it.emp1@company.ph',
    '$2a$10$X7UrH5YxX5YxX5YxX5YxX.5YxX5YxX5YxX5YxX5YxX5YxX5YxX', -- hashed 'itemp123'
    'employee',
    (SELECT id FROM departments WHERE name = 'IT'),
    'Jose',
    'Mendoza',
    '+639567890123',
    true,
    true
),
-- HR Department Employee
(
    'hr_emp1',
    'hr.emp1@company.ph',
    '$2a$10$X7UrH5YxX5YxX5YxX5YxX.5YxX5YxX5YxX5YxX5YxX5YxX5YxX', -- hashed 'hremp123'
    'employee',
    (SELECT id FROM departments WHERE name = 'HR'),
    'Lourdes',
    'Torres',
    '+639678901234',
    true,
    true
),
-- Accounting Department Employee
(
    'acc_emp1',
    'acc.emp1@company.ph',
    '$2a$10$X7UrH5YxX5YxX5YxX5YxX.5YxX5YxX5YxX5YxX5YxX5YxX5YxX', -- hashed 'accemp123'
    'employee',
    (SELECT id FROM departments WHERE name = 'ACCOUNTING'),
    'Roberto',
    'Aquino',
    '+639789012345',
    true,
    true
);

-- Verify the data
SELECT 'Verifying data...' as '';

-- Check Admin
SELECT 'Admin User:' as '';
SELECT id, username, email, role, department_id, is_approved
FROM users WHERE role = 'admin';

-- Check Departments
SELECT 'Departments:' as '';
SELECT d.id, d.name, d.description, u.username as head_username
FROM departments d
LEFT JOIN users u ON d.head_id = u.id;

-- Check Department Heads
SELECT 'Department Heads:' as '';
SELECT u.id, u.username, u.email, u.role, d.name as department_name, 
       u.is_approved
FROM users u
JOIN departments d ON u.department_id = d.id
WHERE u.role = 'department_head';

-- Check Employees
SELECT 'Employees:' as '';
SELECT u.id, u.username, u.email, u.role, d.name as department_name,
       u.is_approved
FROM users u
JOIN departments d ON u.department_id = d.id
WHERE u.role = 'employee'; 
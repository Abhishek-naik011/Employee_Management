USE employee_management;

-- Insert Admin User (password is 'admin123' hashed with bcrypt)
-- You can generate new ones using bcrypt if needed, this is a placeholder standard hash for 'admin123'
INSERT INTO users (name, email, password) VALUES 
('System Admin', 'admin@example.com', '$2b$10$EPfP/G6Q4s/p0aC55W8qUud0U1qE.gJ8D3QY5X2Z9aL/H1QeF0xW.');

-- Insert Departments
INSERT INTO departments (department_name, department_code, department_head, description) VALUES
('Human Resources', 'HR', 'Jane Doe', 'Handles employee relations, payroll, and benefits.'),
('Software Development', 'IT-DEV', 'John Smith', 'Develops and maintains software applications.'),
('Marketing', 'MKT', 'Alice Johnson', 'Handles advertising, brand management, and market research.'),
('Sales', 'SLS', 'Robert Brown', 'Responsible for revenue generation and client acquisition.');

-- Insert Projects
INSERT INTO projects (project_name, project_code, client_name, start_date, end_date, status, description) VALUES
('Employee Portal', 'PRJ-EP', 'Internal', '2025-01-10', '2025-12-31', 'Active', 'Development of the internal employee management portal.'),
('Cloud Migration', 'PRJ-CM', 'TechCorp', '2025-03-01', '2026-06-30', 'Active', 'Migrating legacy systems to AWS cloud.'),
('Q3 Marketing Campaign', 'PRJ-MKT-Q3', 'RetailInc', '2025-07-01', '2025-09-30', 'Completed', 'Digital marketing campaign for Q3.');

-- Insert Employees
INSERT INTO employees (employee_id, first_name, last_name, email, phone, gender, dob, joining_date, designation, department_id, project_id, status) VALUES
('EMP001', 'Rahul', 'Sharma', 'rahul.sharma@example.com', '9876543210', 'Male', '1990-05-15', '2023-01-10', 'Frontend Developer', 2, 1, 'Active'),
('EMP002', 'Priya', 'Singh', 'priya.singh@example.com', '9876543211', 'Female', '1992-08-20', '2023-03-15', 'HR Manager', 1, NULL, 'Active'),
('EMP003', 'Amit', 'Patel', 'amit.patel@example.com', '9876543212', 'Male', '1988-11-10', '2022-06-01', 'Backend Developer', 2, 1, 'Active'),
('EMP004', 'Neha', 'Gupta', 'neha.gupta@example.com', '9876543213', 'Female', '1995-02-25', '2024-01-05', 'Marketing Specialist', 3, 3, 'Active');

-- Update Manager for some employees (assuming EMP003 is manager of EMP001)
UPDATE employees SET manager_id = (SELECT id FROM (SELECT id FROM employees WHERE employee_id = 'EMP003') as temp) WHERE employee_id = 'EMP001';

-- Create Project Assignments Table
CREATE TABLE IF NOT EXISTS project_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id VARCHAR(50) NOT NULL,
    project_id VARCHAR(50) NOT NULL,
    project_role VARCHAR(100),
    allocation_percentage INT DEFAULT 100,
    assignment_status VARCHAR(50) DEFAULT 'Active',
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id),
    FOREIGN KEY (project_id) REFERENCES projects(project_code)
);

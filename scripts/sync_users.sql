
-- Sync existing users to hr_employees
INSERT INTO hr_employees (id, user_id, full_name, email, department, job_title, status, hire_date, basic_salary, housing_allowance, transport_allowance)
SELECT 
    UUID(),             -- Generate new ID for employee record
    id,                 -- Link to user.id
    name,               -- Copy name
    email,              -- Copy email
    'General',          -- Default Department
    role,               -- Default Job Title (from role)
    'active',           -- Default Status
    CURDATE(),          -- Default Hire Date
    5000,               -- Default Basic Salary (Placeholder)
    1000,               -- Default Housing
    500                 -- Default Transport
FROM users
WHERE id NOT IN (SELECT user_id FROM hr_employees WHERE user_id IS NOT NULL);

-- Output result
SELECT COUNT(*) as new_employees_count FROM hr_employees;

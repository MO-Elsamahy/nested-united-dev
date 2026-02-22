
SELECT 'Users Count' as type, COUNT(*) as count FROM users
UNION ALL
SELECT 'HR Employees Count' as type, COUNT(*) as count FROM hr_employees;

SELECT id, name, email, role FROM users LIMIT 10;
SELECT id, full_name, user_id FROM hr_employees LIMIT 10;

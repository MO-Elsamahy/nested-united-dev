
-- تحديث حساب العامل للتجربة
UPDATE users SET role = 'maintenance_worker' WHERE email = 'worker@work.com';

-- تحديث حسابات الموظفين التجريبية (emp1, emp2, etc) لتصبح employee بدلاً من admin
UPDATE users SET role = 'employee' WHERE email IN ('emp1@nested.com', 'emp2@nested.com', 'emp3@nested.com', 'emp4@nested.com', 'emptest@test.com');

-- تحديث حسابات أخرى تبدو كحسابات تجريبية
UPDATE users SET role = 'employee' WHERE email IN ('ahmed@work.com', 'mho@work.com');

-- التحقق من النتائج
SELECT name, email, role FROM users WHERE email IN (
    'worker@work.com', 
    'emp1@nested.com', 
    'emp2@nested.com', 
    'emp3@nested.com', 
    'emp4@nested.com', 
    'emptest@test.com',
    'ahmed@work.com',
    'mho@work.com'
);

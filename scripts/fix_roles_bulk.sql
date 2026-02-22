
-- 1. تصحيح وضع العامل (worker)
UPDATE users SET role = 'maintenance_worker' WHERE email = 'worker@work.com';

-- 2. تحويل كل من هو "admin" حالياً إلى "employee" (حسب كلامك أنهم موظفين عاديين)
UPDATE users SET role = 'employee' WHERE role = 'admin';

-- عرض النتيجة النهائية للتأكد
SELECT name, email, role FROM users;

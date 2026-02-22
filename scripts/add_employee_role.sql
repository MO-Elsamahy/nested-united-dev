
-- 1. تعديل عمود الـ role ليقبل قيمة 'employee'
-- لاحظ: نقوم بإعادة تعريف العمود بالقيم القديمة + القيمة الجديدة
ALTER TABLE users MODIFY COLUMN role ENUM(
    'super_admin', 
    'admin', 
    'accountant', 
    'hr_manager', 
    'maintenance_worker', 
    'employee'
) NOT NULL DEFAULT 'employee';

-- 2. الآن يمكننا تحديث الموظفين إلى 'employee' بأمان
UPDATE users SET role = 'employee' WHERE role = '' OR role IS NULL; -- إصلاح من تم حذف دوره بسبب الخطأ السابق
UPDATE users SET role = 'employee' WHERE role = 'admin' AND email NOT LIKE '%admin%'; -- تحويل الادمنز الخطأ

-- 3. تصحيح وضع العامل worker@work.com إذا لم يتم تصحيحه
UPDATE users SET role = 'maintenance_worker' WHERE email = 'worker@work.com';

-- 4. التأكد من النتيجة
SELECT name, email, role FROM users;

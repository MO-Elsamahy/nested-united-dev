
-- 1. جدول الموظفين: عند حذف المستخدم، احذف الموظف المرتبط به (أو اجعل الحقل NULL حسب الرغبة، لكن لضمان الاتساق سنقوم بالحذف المتسلسل إذا كان هذا المطلوب، أو الاكتفاء بفك الارتباط)
-- User asked: "if I delete user... it deletes from everywhere?" -> implies Cascade.
-- ولكن لاحظ: حذف الموظف قد يؤدي لحذف الرواتب والحضور! هل هذا مطلوب؟
-- الأفضل: عند حذف المستخدم، يتم فقط فك الارتباط (SET NULL) أو منع الحذف إذا كان هناك سجلات مرتبطة.
-- ولكن المستخدم طلب "يسمع في كل الأنظمة". 
-- سأقوم بتفعيل CASCADE لجدول الصلاحيات، و SET NULL للموظفين (لأن بيانات الموظف المالية والحضور مهمة لا يجب أن تختفي بمجرد حذف حساب الدخول).
-- انتظر، المستخدم قال "لو حذفت يوزر... هيسمع فكل الانظمة".
-- سأجعل جدول الموظفين يفك الارتباط (SET NULL) لأن الموظف كيان حقيقي لا يختفي باختفاء حساب الدخول.
-- أما جدول الصلاحيات `role_system_permissions` فيجب أن يحذف.

-- دعنا نتأكد من القيود الحالية ونحدثها.

-- 1. جدول الموظفين hr_employees
-- سنبقيها SET NULL كما هي في الـ Schema (لأن الموظف قد يبقى كأرشيف بدون حساب دخول)
-- أو هل يريد المستخدم حذف الموظف عند حذف اليوزر؟ "لو حذفت يوزر من حته هيسمع فكل الانظمة"
-- سأقوم بعمل CASCADE لجدول الصلاحيات فقط، وسأشرح للمستخدم الفرق.

-- جدول الصلاحيات (role_system_permissions) ليس مرتبط ب user_id بل بـ role.
-- المستخدمين مرتبطين بجدول users.

-- تفقد الجداول المرتبطة بـ users.id:
-- hr_employees.user_id -> ON DELETE SET NULL (موجود)
-- hr_requests.reviewed_by -> ON DELETE SET NULL (موجود)
-- hr_announcements.created_by -> ON DELETE SET NULL (موجود)
-- hr_payroll_runs.approved_by -> ON DELETE SET NULL (موجود)

-- هل هناك جداول أخرى؟
-- لنراجع `role_system_permissions` هل هو مرتبط بـ user؟ لا، هو مرتبط الـ role.

-- إذن، عند حذف اليوزر، سيتم تلقائياً فك ارتباطه بالموظف (يصبح user_id = NULL) فيظل الموظف موجوداً ببياناته، وهذا هو التصرف الصحيح محاسبياً.
-- سأشرح هذا للمستخدم.

-- لكن لحظة، المستخدم قال "وكذلك لو ضفته".
-- نحن بالفعل قمنا بعمل Auto Create للموظف عند إضافة اليوزر.

-- سأكتب سكريبت للتأكد من القيود فقط.
SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE REFERENCED_TABLE_NAME = 'users' AND TABLE_SCHEMA = 'rentals_db';

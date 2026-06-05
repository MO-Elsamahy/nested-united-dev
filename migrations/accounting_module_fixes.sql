-- ============================================================
-- Migration: accounting_module_fixes
-- Date: 2026-06-05
-- ============================================================
-- ملخص التغييرات:
-- 1. إضافة عمود account_subtype لتمييز الخزينة عن البنك
-- 2. تحديث تصنيف الحسابات الموجودة تلقائياً بناءً على الاسم
-- ============================================================

-- ----------------------------------------------------------
-- 1. إضافة عمود account_subtype في جدول accounting_accounts
-- ----------------------------------------------------------
-- القيم المسموحة: 'cash' (خزينة/صندوق) | 'bank' (بنك) | NULL (غير مصنف)
-- العمود ينطبق فقط على الحسابات من نوع asset_bank

ALTER TABLE accounting_accounts
    ADD COLUMN IF NOT EXISTS account_subtype ENUM('cash', 'bank') NULL DEFAULT NULL
    COMMENT 'تمييز الخزينة (cash) عن البنك (bank) — ينطبق فقط على asset_bank';

-- ----------------------------------------------------------
-- 2. تصنيف تلقائي للحسابات الموجودة بناءً على الاسم
-- ----------------------------------------------------------
-- حسابات تحتوي على كلمات تدل على الخزينة → cash
UPDATE accounting_accounts
SET account_subtype = 'cash'
WHERE type = 'asset_bank'
  AND account_subtype IS NULL
  AND (
      name LIKE '%صندوق%'
      OR name LIKE '%نقد%'
      OR name LIKE '%نقدية%'
      OR name LIKE '%خزينة%'
      OR name LIKE '%كاش%'
      OR LOWER(name) LIKE '%cash%'
      OR LOWER(name) LIKE '%petty%'
  );

-- حسابات البنك المتبقية (لم تُصنَّف كـ cash) → bank
UPDATE accounting_accounts
SET account_subtype = 'bank'
WHERE type = 'asset_bank'
  AND account_subtype IS NULL;

-- ----------------------------------------------------------
-- 3. التحقق من نتيجة التصنيف (للمراجعة اليدوية)
-- ----------------------------------------------------------
-- شغّل هذا الاستعلام بعد التطبيق للتحقق من الحسابات:
-- SELECT id, code, name, type, account_subtype FROM accounting_accounts WHERE type = 'asset_bank';

-- إذا كان أي حساب مصنف خطأً، يمكن تصحيحه يدوياً:
-- UPDATE accounting_accounts SET account_subtype = 'cash' WHERE id = 'ACCOUNT_ID_HERE';
-- UPDATE accounting_accounts SET account_subtype = 'bank' WHERE id = 'ACCOUNT_ID_HERE';

-- ============================================================
-- ملاحظات ما بعد Migration:
-- ============================================================
-- ✅ الكود يدعم fallback تلقائي:
--    - إذا كان account_subtype موجوداً → يُستخدم مباشرةً
--    - إذا لم يكن موجوداً → يتم التصنيف بالاسم (متوافق مع الإصدارات السابقة)
-- ✅ لا تغيير في بنية جداول أخرى
-- ✅ لا تأثير على البيانات الموجودة

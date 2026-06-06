-- ============================================================
-- Production Sync Migration
-- Date: 2026-06-06
-- ============================================================
-- التعليمات:
--   شغّل هذا الملف على قاعدة بيانات الإنتاج مرة واحدة فقط.
--   الملف آمن للتشغيل المتكرر (IF NOT EXISTS / IF EXISTS).
-- ============================================================

-- ----------------------------------------------------------
-- 1. إضافة عمود account_subtype (إذا لم يكن موجوداً)
-- ----------------------------------------------------------
-- يُميّز حسابات الخزينة (cash) عن البنك (bank)
ALTER TABLE accounting_accounts
    ADD COLUMN IF NOT EXISTS account_subtype ENUM('cash', 'bank') NULL DEFAULT NULL
    COMMENT 'تمييز الخزينة (cash) عن البنك (bank)';

-- تصنيف الحسابات الموجودة تلقائياً
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

UPDATE accounting_accounts
SET account_subtype = 'bank'
WHERE type = 'asset_bank'
  AND account_subtype IS NULL;

-- ----------------------------------------------------------
-- 2. إصلاح الفواتير التي state فاضي أو NULL
-- ----------------------------------------------------------
-- فواتير بدون حالة → posted (الحالة الافتراضية للمؤكدة)
UPDATE accounting_invoices
SET state = 'posted'
WHERE (state = '' OR state IS NULL)
  AND deleted_at IS NULL;

-- ----------------------------------------------------------
-- 3. التحقق من النتائج (شغّل يدوياً للمراجعة)
-- ----------------------------------------------------------
-- SELECT id, invoice_number, state, amount_due
-- FROM accounting_invoices
-- WHERE deleted_at IS NULL
-- ORDER BY created_at DESC
-- LIMIT 20;

-- SELECT id, code, name, type, account_subtype
-- FROM accounting_accounts
-- WHERE deleted_at IS NULL AND type = 'asset_bank';

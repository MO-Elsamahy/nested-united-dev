-- ============================================================
-- Migration: Add GOSI employer rate & account settings to hr_settings
-- Date: 2026-02-22
-- Run this once on the database.
-- ============================================================

INSERT IGNORE INTO `hr_settings` (`id`, `setting_key`, `setting_value`, `description`)
VALUES
  (UUID(), 'gosi_employer_rate',    '12.5',  'نسبة تأمينات صاحب العمل (GOSI Employer Share %)'),
  (UUID(), 'gosi_expense_account_id', NULL,  'حساب مصروف GOSI صاحب العمل (اختياري — إذا تم تحديده يُضاف سطر ثالث للقيد)');

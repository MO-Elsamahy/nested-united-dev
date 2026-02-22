-- ============================================================
-- Migration: Add 'paid' and 'completed' stages to crm_deals
-- Date: 2026-02-22
-- Run this on the database BEFORE entering real data for
-- the new pipeline stages.
-- ============================================================

ALTER TABLE `crm_deals`
  MODIFY COLUMN `stage`
  ENUM('new','contacting','qualified','proposal','negotiation','won','paid','completed','lost')
  DEFAULT 'new';

-- Also update crm_custom_stages seed data to include the new stages
INSERT IGNORE INTO `crm_custom_stages`
  (`id`, `label`, `stage_key`, `color`, `stage_order`, `is_active`, `created_at`, `updated_at`)
VALUES
  (UUID(), 'تم الدفع',  'paid',      'bg-teal-50',    6, 1, NOW(), NOW()),
  (UUID(), 'مكتمل',     'completed', 'bg-emerald-50', 7, 1, NOW(), NOW());

-- Shift 'lost' order to 8
UPDATE `crm_custom_stages` SET `stage_order` = 8 WHERE `stage_key` = 'lost';

-- CRM Production Migration Queries
-- Run these commands on the production database to sync the schema with the latest CRM updates.

-- 1. Add Priority column to CRM deals
ALTER TABLE crm_deals
  ADD COLUMN priority VARCHAR(20) NOT NULL DEFAULT 'medium';

-- 2. Add Expected Close Date column to CRM deals
ALTER TABLE crm_deals
  ADD COLUMN expected_close_date DATE NULL;

-- ─────────────────────────────────────────────────────────
-- 3. Link deals to units (NEW - 2026-05-24)
--    Allows each CRM deal to be associated with a property unit
--    for accurate statistics and reporting.
-- ─────────────────────────────────────────────────────────
ALTER TABLE crm_deals
  ADD COLUMN unit_id CHAR(36) NULL DEFAULT NULL
  AFTER customer_id;

-- Add a foreign key (optional — remove if units table FK causes issues)
ALTER TABLE crm_deals
  ADD CONSTRAINT fk_crm_deals_unit
  FOREIGN KEY (unit_id) REFERENCES units(id)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- Note: All other improvements were strictly backend SQL query logic and frontend UI enhancements.

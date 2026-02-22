-- =====================================================
-- Fix Missing Columns in Existing Tables
-- Run this in phpMyAdmin, then re-run the import script
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- FIX UNITS TABLE (add readiness columns)
-- =====================================================
ALTER TABLE units
  ADD COLUMN IF NOT EXISTS readiness_status VARCHAR(50) NOT NULL DEFAULT 'ready' AFTER status,
  ADD COLUMN IF NOT EXISTS readiness_checkout_date DATE AFTER readiness_status,
  ADD COLUMN IF NOT EXISTS readiness_checkin_date DATE AFTER readiness_checkout_date,
  ADD COLUMN IF NOT EXISTS readiness_guest_name VARCHAR(255) AFTER readiness_checkin_date,
  ADD COLUMN IF NOT EXISTS readiness_notes TEXT AFTER readiness_guest_name,
  ADD COLUMN IF NOT EXISTS readiness_updated_by CHAR(36) AFTER readiness_notes,
  ADD COLUMN IF NOT EXISTS readiness_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP AFTER readiness_updated_by,
  ADD COLUMN IF NOT EXISTS readiness_group_id CHAR(36) AFTER readiness_updated_at;

-- =====================================================
-- FIX RESERVATIONS TABLE (add manual edit columns)
-- =====================================================
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS is_manually_edited BOOLEAN DEFAULT FALSE AFTER raw_event,
  ADD COLUMN IF NOT EXISTS manually_edited_at DATETIME AFTER is_manually_edited;

-- =====================================================
-- FIX MAINTENANCE_TICKETS TABLE (add worker columns)
-- =====================================================
ALTER TABLE maintenance_tickets
  ADD COLUMN IF NOT EXISTS assigned_to CHAR(36) AFTER created_by,
  ADD COLUMN IF NOT EXISTS accepted_at DATETIME AFTER assigned_to,
  ADD COLUMN IF NOT EXISTS worker_notes TEXT AFTER accepted_at;

-- Add foreign key for assigned_to
-- ALTER TABLE maintenance_tickets ADD FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;

-- =====================================================
-- DROP AND RECREATE BROWSER_ACCOUNTS TABLE
-- =====================================================
DROP TABLE IF EXISTS browser_accounts;
CREATE TABLE browser_accounts (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  platform ENUM('airbnb', 'gathern', 'whatsapp') NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  account_email VARCHAR(255),
  notes TEXT,
  platform_account_id CHAR(36),
  session_partition VARCHAR(255) NOT NULL UNIQUE,
  last_notification_at DATETIME,
  has_unread_notifications BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by CHAR(36) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_browser_accounts_platform (platform),
  FOREIGN KEY (platform_account_id) REFERENCES platform_accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- FIX USERS TABLE (update role enum if needed)
-- =====================================================
ALTER TABLE users MODIFY COLUMN role ENUM('super_admin', 'admin', 'maintenance_worker') NOT NULL DEFAULT 'admin';

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'Done! Columns added. Run import-all-data.js again.' as status;

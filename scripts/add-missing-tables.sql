-- =====================================================
-- Add Missing Tables to Existing Database
-- Run this in phpMyAdmin to add the 6 missing tables
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. UNIT_PLATFORMS TABLE
CREATE TABLE IF NOT EXISTS unit_platforms (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  unit_id CHAR(36) NOT NULL,
  platform ENUM('airbnb', 'gathern') NOT NULL,
  listing_code VARCHAR(255),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY idx_unit_platforms_unit_platform (unit_id, platform),
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS bookings (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  unit_id CHAR(36) NOT NULL,
  platform_account_id CHAR(36),
  platform ENUM('airbnb', 'gathern', 'whatsapp', 'manual', 'unknown'),
  guest_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  checkin_date DATE NOT NULL,
  checkout_date DATE NOT NULL,
  amount DECIMAL(12,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'SAR',
  notes TEXT,
  created_by CHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_bookings_unit_id (unit_id),
  INDEX idx_bookings_dates (checkin_date, checkout_date),
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
  FOREIGN KEY (platform_account_id) REFERENCES platform_accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. BROWSER_ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS browser_accounts (
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

-- 4. BROWSER_NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS browser_notifications (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  browser_account_id CHAR(36) NOT NULL,
  detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  notification_type VARCHAR(100),
  is_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  acknowledged_by CHAR(36),
  acknowledged_at DATETIME,
  INDEX idx_browser_notifications_account (browser_account_id),
  FOREIGN KEY (browser_account_id) REFERENCES browser_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (acknowledged_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. USER_PERMISSIONS TABLE
CREATE TABLE IF NOT EXISTS user_permissions (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  page_path VARCHAR(255) NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT FALSE,
  can_edit BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_page (user_id, page_path),
  INDEX idx_user_permissions_user_id (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. USER_ACTIVITY_LOGS TABLE
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  action_type VARCHAR(100) NOT NULL,
  page_path VARCHAR(255),
  resource_type VARCHAR(100),
  resource_id CHAR(36),
  description TEXT,
  metadata JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_activity_logs_user_id (user_id),
  INDEX idx_user_activity_logs_created_at (created_at DESC),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Update users table role to include maintenance_worker
ALTER TABLE users MODIFY COLUMN role ENUM('super_admin', 'admin', 'maintenance_worker') NOT NULL DEFAULT 'admin';

-- Update platform_accounts to include whatsapp and general
ALTER TABLE platform_accounts MODIFY COLUMN platform ENUM('airbnb', 'gathern', 'whatsapp', 'general') NOT NULL;

-- Update notifications audience to include maintenance_workers
ALTER TABLE notifications MODIFY COLUMN audience ENUM('all_admins', 'all_super_admins', 'all_users', 'maintenance_workers') NOT NULL DEFAULT 'all_admins';

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'Done! All 6 new tables created.' as status;

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

-- 4. Increase customers phone column length to VARCHAR(50) (NEW - 2026-06-01)
--    Prevents truncation of phone numbers containing country codes (+966)
ALTER TABLE customers
  MODIFY COLUMN phone VARCHAR(50) DEFAULT NULL;

-- 5. Update CRM deals stage column ENUM to support all pipeline stages (NEW - 2026-06-01)
--    Ensures that deals moved to 'partial_payment' or 'management' do not disappear or fail to save.
ALTER TABLE crm_deals
  MODIFY COLUMN stage ENUM('new','contacting','qualified','proposal','negotiation','won','paid','completed','lost','partial_payment','management') DEFAULT 'new';

-- 6. Insert Local/Production Super Admin User (NEW - 2026-06-02)
--    Creates a default super_admin account for system initialization.
INSERT INTO users (id, email, password_hash, role, name, is_active)
VALUES ('df706cfb-534a-4afe-b76a-c68e096cf446', 'admin@admin.com', '$2b$10$G8CWRdNXDOwfd60mko5A4OGgEvYfw1fJ3cKMi3RT7hYY7Vf2WhKdi', 'super_admin', 'Admin User', 1)
ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = VALUES(role), name = VALUES(name), is_active = VALUES(is_active);

-- 7. Clean up and correct employee job title typos (NEW - 2026-06-05)
--    Aligns spelling mistakes to prevent duplication in HR analytics charts.
UPDATE hr_employees 
SET job_title = 'موظف خدمة عملاء' 
WHERE job_title IN ('موظف حدمو عملاء', 'موظف خدمو عملاء');

UPDATE hr_employees 
SET job_title = 'مسؤول تسويق' 
WHERE job_title = 'مسوؤل تسويق';

-- 8. Database Index Optimizations for Advanced Analytics (NEW - 2026-06-08)
--    Significantly speeds up query processing and reduces database load.
ALTER TABLE bookings ADD INDEX idx_bookings_checkout_date (checkout_date);
ALTER TABLE reservations ADD INDEX idx_reservations_end_date (end_date);
ALTER TABLE hr_requests ADD INDEX idx_hr_requests_dates (start_date, end_date);
ALTER TABLE crm_deals ADD INDEX idx_crm_deals_status_created (status, created_at);


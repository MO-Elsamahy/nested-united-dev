-- Restoration script for missing accounting tables
-- Run this script in your MySQL console

CREATE TABLE IF NOT EXISTS `company_settings` (
    `id` CHAR(36) PRIMARY KEY,
    `company_name` VARCHAR(255) NOT NULL,
    `company_name_en` VARCHAR(255),
    `logo_url` TEXT,
    `primary_color` VARCHAR(7) DEFAULT '#3B82F6',
    `email` VARCHAR(255),
    `phone` VARCHAR(50),
    `mobile` VARCHAR(50),
    `website` VARCHAR(255),
    `address` TEXT,
    `city` VARCHAR(100),
    `country` VARCHAR(100) DEFAULT 'Saudi Arabia',
    `postal_code` VARCHAR(20),
    `tax_number` VARCHAR(50),
    `commercial_registration` VARCHAR(50),
    `default_payment_terms` VARCHAR(100) DEFAULT 'Net 30',
    `invoice_footer` TEXT,
    `invoice_notes` TEXT,
    `bank_name` VARCHAR(255),
    `bank_account` VARCHAR(100),
    `iban` VARCHAR(50),
    `swift_code` VARCHAR(20),
    `smtp_host` VARCHAR(255),
    `smtp_port` INT DEFAULT 587,
    `smtp_username` VARCHAR(255),
    `smtp_password` VARCHAR(255),
    `smtp_from_email` VARCHAR(255),
    `smtp_from_name` VARCHAR(255),
    `next_invoice_number` INT DEFAULT 1,
    `next_payment_number` INT DEFAULT 1,
    `invoice_number_prefix` VARCHAR(20) DEFAULT 'INV',
    `payment_number_prefix` VARCHAR(20) DEFAULT 'PAY',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert a default company record if none exists
INSERT IGNORE INTO `company_settings` (`id`, `company_name`, `company_name_en`, `country`) 
VALUES (uuid(), 'Nested United', 'Nested United', 'Saudi Arabia');

CREATE TABLE IF NOT EXISTS `accounting_invoices` (
    `id` CHAR(36) NOT NULL PRIMARY KEY,
    `invoice_number` VARCHAR(50) NOT NULL,
    `invoice_type` ENUM('customer_invoice', 'vendor_bill', 'customer_refund', 'vendor_refund') NOT NULL DEFAULT 'customer_invoice',
    `partner_id` CHAR(36) NOT NULL,
    `invoice_date` DATE NOT NULL,
    `due_date` DATE NOT NULL,
    `subtotal` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `tax_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `discount_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `total_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `amount_paid` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `amount_due` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `state` ENUM('draft', 'posted', 'confirmed', 'paid', 'cancelled') NOT NULL DEFAULT 'draft',
    `reference` VARCHAR(255) DEFAULT NULL,
    `notes` TEXT DEFAULT NULL,
    `payment_terms` TEXT DEFAULT NULL,
    `attachment_url` TEXT DEFAULT NULL,
    `accounting_move_id` CHAR(36) DEFAULT NULL,
    `journal_id` CHAR(36) DEFAULT NULL,
    `created_by` CHAR(36) NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` DATETIME DEFAULT NULL,
    KEY `idx_invoices_partner` (`partner_id`),
    KEY `idx_invoices_date` (`invoice_date`),
    KEY `idx_invoices_state` (`state`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `accounting_invoice_lines` (
    `id` CHAR(36) NOT NULL PRIMARY KEY,
    `invoice_id` CHAR(36) NOT NULL,
    `description` TEXT NOT NULL,
    `product_id` CHAR(36) DEFAULT NULL,
    `quantity` DECIMAL(15,2) NOT NULL DEFAULT 1.00,
    `unit_price` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `discount_type` ENUM('percentage', 'fixed') NOT NULL DEFAULT 'percentage',
    `discount_value` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `tax_rate` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    `tax_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `account_id` CHAR(36) DEFAULT NULL,
    `subtotal` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `line_total` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `line_total_with_tax` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    KEY `idx_invoice_lines_invoice` (`invoice_id`),
    CONSTRAINT `fk_invoice_lines_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `accounting_invoices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default Sales and Purchase journals if they don't already exist
INSERT INTO `accounting_journals` (`id`, `name`, `code`, `type`, `default_account_id`, `created_at`, `updated_at`, `deleted_at`)
SELECT uuid(), 'المبيعات', 'SALES', 'sale', NULL, NOW(), NOW(), NULL
WHERE NOT EXISTS (SELECT 1 FROM `accounting_journals` WHERE `type` = 'sale' AND `deleted_at` IS NULL);

INSERT INTO `accounting_journals` (`id`, `name`, `code`, `type`, `default_account_id`, `created_at`, `updated_at`, `deleted_at`)
SELECT uuid(), 'المشتريات', 'PURCH', 'purchase', NULL, NOW(), NOW(), NULL
WHERE NOT EXISTS (SELECT 1 FROM `accounting_journals` WHERE `type` = 'purchase' AND `deleted_at` IS NULL);

-- Invoice System Schema
-- Supports: Customer Invoices, Supplier Bills, Payments, and Company Branding
-- ZATCA Compliance Ready (basic structure)

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS accounting_payment_allocations;
DROP TABLE IF EXISTS accounting_payments;
DROP TABLE IF EXISTS accounting_invoice_lines;
DROP TABLE IF EXISTS accounting_invoices;
DROP TABLE IF EXISTS company_settings;

-- =====================================================
-- 1. INVOICES TABLE
-- =====================================================
CREATE TABLE accounting_invoices (
    id CHAR(36) PRIMARY KEY,
    
    -- Invoice Identification
    invoice_number VARCHAR(50) UNIQUE NOT NULL, -- Format: INV-2024-0001
    invoice_type ENUM('customer_invoice', 'supplier_bill', 'credit_note', 'debit_note') NOT NULL DEFAULT 'customer_invoice',
    
    -- Partner & Dates
    partner_id CHAR(36) NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    
    -- Financial Amounts
    subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(15, 2) NOT NULL,
    amount_paid DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    amount_due DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    
    -- Status & State
    state ENUM('draft', 'confirmed', 'paid', 'partial', 'cancelled') NOT NULL DEFAULT 'draft',
    
    -- Additional Information
    reference VARCHAR(255), -- Customer PO number, reference
    notes TEXT,
    payment_terms TEXT, -- "Net 30", custom terms
    attachment_url TEXT, -- Link to uploaded file (Image/PDF)
    
    -- Accounting Integration
    accounting_move_id CHAR(36), -- Links to journal entry when confirmed (nullable)
    journal_id CHAR(36), -- Sales/Purchase journal (nullable initially)
    
    -- ZATCA Compliance Fields (KSA E-Invoicing)
    zatca_uuid VARCHAR(255), -- Unique Invoice ID for ZATCA
    zatca_status ENUM('pending', 'submitted', 'cleared', 'rejected') DEFAULT 'pending',
    zatca_qr_code TEXT, -- QR Code data
    zatca_submission_date DATETIME,
    
    -- Metadata
    created_by CHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    
    FOREIGN KEY (partner_id) REFERENCES accounting_partners(id),
    FOREIGN KEY (accounting_move_id) REFERENCES accounting_moves(id) ON DELETE SET NULL,
    FOREIGN KEY (journal_id) REFERENCES accounting_journals(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    
    INDEX idx_invoice_number (invoice_number),
    INDEX idx_partner (partner_id),
    INDEX idx_state (state),
    INDEX idx_invoice_date (invoice_date),
    INDEX idx_due_date (due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 2. INVOICE LINES TABLE
-- =====================================================
CREATE TABLE accounting_invoice_lines (
    id CHAR(36) PRIMARY KEY,
    invoice_id CHAR(36) NOT NULL,
    
    -- Line Item Details
    description TEXT NOT NULL,
    product_id CHAR(36), -- Future: link to products catalog
    
    -- Quantities & Pricing
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1.00,
    unit_price DECIMAL(15, 2) NOT NULL,
    
    -- Discounts
    discount_type ENUM('percentage', 'fixed') DEFAULT 'percentage',
    discount_value DECIMAL(10, 2) DEFAULT 0.00,
    
    -- Tax
    tax_rate DECIMAL(5, 2) DEFAULT 0.00, -- e.g., 15.00 for 15% VAT
    tax_amount DECIMAL(15, 2) DEFAULT 0.00,
    
    -- Accounting
    account_id CHAR(36), -- Revenue/Expense account
    
    -- Calculated Totals
    subtotal DECIMAL(15, 2) NOT NULL, -- quantity * unit_price
    line_total DECIMAL(15, 2) NOT NULL, -- After discount, before tax
    line_total_with_tax DECIMAL(15, 2) NOT NULL, -- Final amount
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (invoice_id) REFERENCES accounting_invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounting_accounts(id),
    
    INDEX idx_invoice (invoice_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 3. PAYMENTS TABLE
-- =====================================================
CREATE TABLE accounting_payments (
    id CHAR(36) PRIMARY KEY,
    
    -- Payment Identification
    payment_number VARCHAR(50) UNIQUE NOT NULL, -- Format: PAY-2024-0001
    payment_date DATE NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    
    -- Payment Details
    payment_method ENUM('cash', 'bank_transfer', 'check', 'card', 'online', 'other') NOT NULL,
    reference VARCHAR(255), -- Check number, transaction ID
    
    -- Relationships
    partner_id CHAR(36) NOT NULL,
    journal_id CHAR(36) NOT NULL, -- Bank/Cash journal
    
    -- Accounting Integration
    accounting_move_id CHAR(36), -- Journal entry for payment
    
    notes TEXT,
    
    -- Metadata
    created_by CHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    
    FOREIGN KEY (partner_id) REFERENCES accounting_partners(id),
    FOREIGN KEY (journal_id) REFERENCES accounting_journals(id),
    FOREIGN KEY (accounting_move_id) REFERENCES accounting_moves(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id),
    
    INDEX idx_payment_number (payment_number),
    INDEX idx_partner (partner_id),
    INDEX idx_payment_date (payment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 4. PAYMENT ALLOCATIONS TABLE
-- =====================================================
CREATE TABLE accounting_payment_allocations (
    id CHAR(36) PRIMARY KEY,
    payment_id CHAR(36) NOT NULL,
    invoice_id CHAR(36) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (payment_id) REFERENCES accounting_payments(id) ON DELETE CASCADE,
    FOREIGN KEY (invoice_id) REFERENCES accounting_invoices(id),
    
    INDEX idx_payment (payment_id),
    INDEX idx_invoice (invoice_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 5. COMPANY SETTINGS TABLE
-- =====================================================
CREATE TABLE company_settings (
    id CHAR(36) PRIMARY KEY,
    
    -- Company Identity
    company_name VARCHAR(255) NOT NULL,
    company_name_en VARCHAR(255), -- English name
    
    -- Logo & Branding
    logo_url TEXT, -- Path to uploaded logo file
    primary_color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color for branding
    
    -- Contact Information
    email VARCHAR(255),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    website VARCHAR(255),
    
    -- Address
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Saudi Arabia',
    postal_code VARCHAR(20),
    
    -- Tax & Legal Information
    tax_number VARCHAR(50), -- VAT Registration Number
    commercial_registration VARCHAR(50), -- CR Number
    
    -- Invoice Settings
    default_payment_terms VARCHAR(100) DEFAULT 'Net 30',
    invoice_footer TEXT, -- Default footer text for invoices
    invoice_notes TEXT, -- Default notes
    
    -- Banking Information
    bank_name VARCHAR(255),
    bank_account VARCHAR(100),
    iban VARCHAR(50),
    swift_code VARCHAR(20),
    
    -- Email Settings
    smtp_host VARCHAR(255),
    smtp_port INT DEFAULT 587,
    smtp_username VARCHAR(255),
    smtp_password VARCHAR(255),
    smtp_from_email VARCHAR(255),
    smtp_from_name VARCHAR(255),
    
    -- Invoice Numbering
    next_invoice_number INT DEFAULT 1,
    next_payment_number INT DEFAULT 1,
    invoice_number_prefix VARCHAR(20) DEFAULT 'INV',
    payment_number_prefix VARCHAR(20) DEFAULT 'PAY',
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 6. ALTER PARTNERS TABLE (Add Invoice Fields)
-- =====================================================
ALTER TABLE accounting_partners 
ADD COLUMN IF NOT EXISTS billing_address TEXT,
ADD COLUMN IF NOT EXISTS shipping_address TEXT,
ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(100) DEFAULT 'Net 30',
ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(15, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS vat_number VARCHAR(50);

-- =====================================================
-- 7. INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_invoices_partner_state ON accounting_invoices(partner_id, state);
CREATE INDEX IF NOT EXISTS idx_invoices_dates ON accounting_invoices(invoice_date, due_date);
CREATE INDEX IF NOT EXISTS idx_payments_partner ON accounting_payments(partner_id, payment_date);

-- =====================================================
-- 8. INSERT DEFAULT COMPANY SETTINGS
-- =====================================================
INSERT INTO company_settings (id, company_name, company_name_en, country)
VALUES (UUID(), 'شركتي', 'My Company', 'Saudi Arabia')
ON DUPLICATE KEY UPDATE company_name = company_name; -- Prevent duplicates

-- =====================================================
-- 9. CREATE DEFAULT SALES & PURCHASE JOURNALS (if not exist)
-- =====================================================
INSERT IGNORE INTO accounting_journals (id, name, code, type, created_at)
VALUES 
    (UUID(), 'فواتير المبيعات', 'INV', 'sale', NOW()),
    (UUID(), 'فواتير المشتريات', 'BILL', 'purchase', NOW());

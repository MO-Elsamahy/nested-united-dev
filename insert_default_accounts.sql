-- Add missing columns to accounting_invoices (if not done yet)
-- ALTER TABLE accounting_invoices
--     ADD COLUMN accounting_move_id CHAR(36) DEFAULT NULL,
--     ADD COLUMN journal_id CHAR(36) DEFAULT NULL;

-- Create accounting_payments table
CREATE TABLE IF NOT EXISTS accounting_payments (
    id CHAR(36) NOT NULL PRIMARY KEY,
    payment_number VARCHAR(50) NOT NULL,
    payment_type ENUM('inbound', 'outbound') NOT NULL DEFAULT 'inbound',
    partner_id CHAR(36) DEFAULT NULL,
    payment_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'SAR',
    payment_method ENUM('cash', 'bank_transfer', 'cheque', 'card', 'other') DEFAULT 'bank_transfer',
    journal_id CHAR(36) DEFAULT NULL,
    state ENUM('draft', 'posted', 'cancelled') NOT NULL DEFAULT 'draft',
    notes TEXT DEFAULT NULL,
    created_by CHAR(36) DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    KEY idx_payments_partner (partner_id),
    KEY idx_payments_date (payment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create accounting_payment_allocations table
CREATE TABLE IF NOT EXISTS accounting_payment_allocations (
    id CHAR(36) NOT NULL PRIMARY KEY,
    payment_id CHAR(36) NOT NULL,
    invoice_id CHAR(36) NOT NULL,
    amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    KEY idx_alloc_payment (payment_id),
    KEY idx_alloc_invoice (invoice_id),
    CONSTRAINT fk_alloc_payment FOREIGN KEY (payment_id) REFERENCES accounting_payments (id) ON DELETE CASCADE,
    CONSTRAINT fk_alloc_invoice FOREIGN KEY (invoice_id) REFERENCES accounting_invoices (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default Chart of Accounts
INSERT INTO accounting_accounts (id, code, name, type, is_reconcilable)
SELECT uuid(), '1100', 'ذمم مدينة - عملاء', 'asset_receivable', 1
WHERE NOT EXISTS (SELECT 1 FROM accounting_accounts WHERE type = 'asset_receivable' AND deleted_at IS NULL);

INSERT INTO accounting_accounts (id, code, name, type, is_reconcilable)
SELECT uuid(), '2100', 'ذمم دائنة - موردين', 'liability_payable', 1
WHERE NOT EXISTS (SELECT 1 FROM accounting_accounts WHERE type = 'liability_payable' AND deleted_at IS NULL);

INSERT INTO accounting_accounts (id, code, name, type, is_reconcilable)
SELECT uuid(), '4100', 'إيرادات المبيعات', 'income', 0
WHERE NOT EXISTS (SELECT 1 FROM accounting_accounts WHERE type = 'income' AND deleted_at IS NULL);

INSERT INTO accounting_accounts (id, code, name, type, is_reconcilable)
SELECT uuid(), '5100', 'مصاريف عامة', 'expense', 0
WHERE NOT EXISTS (SELECT 1 FROM accounting_accounts WHERE type = 'expense' AND deleted_at IS NULL);

INSERT INTO accounting_accounts (id, code, name, type, is_reconcilable)
SELECT uuid(), '2210', 'ضريبة القيمة المضافة المستحقة', 'liability_current', 0
WHERE NOT EXISTS (SELECT 1 FROM accounting_accounts WHERE code LIKE '22%' AND deleted_at IS NULL);

INSERT INTO accounting_accounts (id, code, name, type, is_reconcilable)
SELECT uuid(), '1110', 'الحساب البنكي الرئيسي', 'asset_bank', 0
WHERE NOT EXISTS (SELECT 1 FROM accounting_accounts WHERE type = 'asset_bank' AND deleted_at IS NULL);

-- Default Sales and Purchase journals
INSERT INTO accounting_journals (id, name, code, type, default_account_id, created_at, updated_at, deleted_at)
SELECT uuid(), 'المبيعات', 'SALES', 'sale', NULL, NOW(), NOW(), NULL
WHERE NOT EXISTS (SELECT 1 FROM accounting_journals WHERE type = 'sale' AND deleted_at IS NULL);

INSERT INTO accounting_journals (id, name, code, type, default_account_id, created_at, updated_at, deleted_at)
SELECT uuid(), 'المشتريات', 'PURCH', 'purchase', NULL, NOW(), NOW(), NULL
WHERE NOT EXISTS (SELECT 1 FROM accounting_journals WHERE type = 'purchase' AND deleted_at IS NULL);

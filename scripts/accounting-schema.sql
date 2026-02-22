-- Accounting System Schema (Double-Entry) - Updated Phase 1.2 (Audit & Restore)

-- 1. Partners Table
CREATE TABLE IF NOT EXISTS accounting_partners (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    type ENUM('customer', 'supplier', 'employee', 'other') DEFAULT 'customer',
    tax_id VARCHAR(50),
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL -- Soft Delete
);

-- 2. Chart of Accounts
CREATE TABLE IF NOT EXISTS accounting_accounts (
    id CHAR(36) PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    type ENUM(
        'asset_receivable', 'asset_bank', 'asset_current', 'asset_fixed',
        'liability_payable', 'liability_current', 'liability_long_term',
        'equity', 'income', 'expense', 'cost_of_sales'
    ) NOT NULL,
    is_reconcilable BOOLEAN DEFAULT FALSE,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL -- Soft Delete
);

-- 3. Journals
CREATE TABLE IF NOT EXISTS accounting_journals (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(10) NOT NULL, 
    type ENUM('sale', 'purchase', 'cash', 'bank', 'general') NOT NULL,
    default_account_id CHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL, -- Soft Delete
    FOREIGN KEY (default_account_id) REFERENCES accounting_accounts(id) ON DELETE SET NULL
);

-- 4. Cost Centers
CREATE TABLE IF NOT EXISTS accounting_cost_centers (
    id CHAR(36) PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL -- Soft Delete
);

-- 5. Journal Entries (Header)
CREATE TABLE IF NOT EXISTS accounting_moves (
    id CHAR(36) PRIMARY KEY,
    journal_id CHAR(36) NOT NULL,
    date DATE NOT NULL,
    ref VARCHAR(255),
    narration TEXT,
    state ENUM('draft', 'posted', 'canceled') DEFAULT 'draft',
    partner_id CHAR(36),
    amount_total DECIMAL(15, 2) DEFAULT 0.00,
    attachment_url TEXT, 
    created_by CHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL, -- Soft Delete
    FOREIGN KEY (journal_id) REFERENCES accounting_journals(id),
    FOREIGN KEY (partner_id) REFERENCES accounting_partners(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 6. Journal Items (Lines)
CREATE TABLE IF NOT EXISTS accounting_move_lines (
    id CHAR(36) PRIMARY KEY,
    move_id CHAR(36) NOT NULL,
    account_id CHAR(36) NOT NULL,
    partner_id CHAR(36),
    cost_center_id CHAR(36),
    name VARCHAR(255),
    debit DECIMAL(15, 2) DEFAULT 0.00,
    credit DECIMAL(15, 2) DEFAULT 0.00,
    date_maturity DATE,
    reconciled BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL, -- Soft Delete (Cascaded mostly, but good to have)
    FOREIGN KEY (move_id) REFERENCES accounting_moves(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounting_accounts(id),
    FOREIGN KEY (partner_id) REFERENCES accounting_partners(id),
    FOREIGN KEY (cost_center_id) REFERENCES accounting_cost_centers(id) ON DELETE SET NULL
);

-- 7. Audit Log (Backlog) -- NEW
CREATE TABLE IF NOT EXISTS accounting_audit_logs (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36), -- Who did it
    action ENUM('create', 'update', 'delete', 'restore') NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- 'move', 'account', 'journal'
    entity_id CHAR(36) NOT NULL,
    details JSON, -- Store old/new values or description
    ip_address VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_move_lines_account ON accounting_move_lines(account_id);
CREATE INDEX idx_move_lines_partner ON accounting_move_lines(partner_id);
CREATE INDEX idx_moves_date ON accounting_moves(date);
CREATE INDEX idx_audit_created ON accounting_audit_logs(created_at);

-- Seed Default Accounting Accounts
-- Required for Invoicing and Payments

INSERT INTO accounting_accounts (id, code, name, type, is_reconcilable, description, created_at, updated_at) VALUES 
(UUID(), '110100', 'Accounts Receivable (Customers)', 'asset_receivable', 1, 'Default receivable account for customer invoices', NOW(), NOW()),
(UUID(), '210100', 'Accounts Payable (Vendors)', 'liability_payable', 1, 'Default payable account for vendor bills', NOW(), NOW()),
(UUID(), '400100', 'Sales Revenue', 'income', 0, 'Default income account for product sales', NOW(), NOW()),
(UUID(), '500100', 'Cost of Goods Sold', 'cost_of_sales', 0, 'Default expense account for cost of goods sold', NOW(), NOW()),
(UUID(), '220100', 'VAT Payable', 'liability_current', 0, 'Value Added Tax collected on sales', NOW(), NOW()),
(UUID(), '600100', 'General Expenses', 'expense', 0, 'General business expenses', NOW(), NOW());

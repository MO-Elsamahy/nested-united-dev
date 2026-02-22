-- Seed Data for Accounting System
-- Standard Chart of Accounts (Simplified)

-- 1. Assets
-- 101: Current Assets
INSERT INTO accounting_accounts (id, code, name, type, is_reconcilable) VALUES 
(UUID(), '101001', 'الصندوق / النقدية', 'asset_bank', TRUE),
(UUID(), '101002', 'البنك الأهلي', 'asset_bank', TRUE),
(UUID(), '101003', 'العملات الرقمية', 'asset_bank', TRUE),
(UUID(), '101100', 'العملاء (Accounts Receivable)', 'asset_receivable', TRUE),
(UUID(), '101200', 'المخزون', 'asset_current', FALSE),
(UUID(), '101300', 'سلف موظفين', 'asset_current', TRUE);

-- 102: Fixed Assets
INSERT INTO accounting_accounts (id, code, name, type, is_reconcilable) VALUES 
(UUID(), '102001', 'المباني والوحدات', 'asset_fixed', FALSE),
(UUID(), '102002', 'الأثاث والمفروشات', 'asset_fixed', FALSE),
(UUID(), '102003', 'الأجهزة الإلكترونية', 'asset_fixed', FALSE);

-- 2. Liabilities
INSERT INTO accounting_accounts (id, code, name, type, is_reconcilable) VALUES 
(UUID(), '201000', 'الموردين (Accounts Payable)', 'liability_payable', TRUE),
(UUID(), '201100', 'ضرائب مستحقة', 'liability_current', TRUE),
(UUID(), '202000', 'قروض طويلة الأجل', 'liability_long_term', FALSE);

-- 3. Equity
INSERT INTO accounting_accounts (id, code, name, type, is_reconcilable) VALUES 
(UUID(), '301000', 'رأس المال', 'equity', FALSE),
(UUID(), '302000', 'الأرباح المرحلة', 'equity', FALSE);

-- 4. Income
INSERT INTO accounting_accounts (id, code, name, type, is_reconcilable) VALUES 
(UUID(), '401000', 'إيرادات الحجوزات', 'income', FALSE),
(UUID(), '402000', 'إيرادات خدمات إضافية', 'income', FALSE);

-- 5. Expenses
INSERT INTO accounting_accounts (id, code, name, type, is_reconcilable) VALUES 
(UUID(), '501000', 'تكلفة الإيرادات (عمولات)', 'cost_of_sales', FALSE),
(UUID(), '502001', 'رواتب وأجور', 'expense', FALSE),
(UUID(), '502002', 'مصروفات الصيانة', 'expense', FALSE),
(UUID(), '502003', 'كهرباء ومياه', 'expense', FALSE),
(UUID(), '502004', 'تسويق وإعلانات', 'expense', FALSE),
(UUID(), '502005', 'نثريات ومصروفات مكتبية', 'expense', FALSE);

-- 6. Default Journals
-- Get account IDs for linking (This uses a variable approach valid in MySQL Procedure/Script context, 
-- but for direct execution we might need to look them up. For simplicity here, we insert directly).

INSERT INTO accounting_journals (id, name, code, type) VALUES 
(UUID(), 'فاتورة مبيعات', 'INV', 'sale'),
(UUID(), 'فاتورة مورد', 'BILL', 'purchase'),
(UUID(), 'عمليات متنوعة', 'GEN', 'general'),
(UUID(), 'الخزينة الرئيسية', 'CSH1', 'cash'),
(UUID(), 'البنك الأهلي', 'BNK1', 'bank');

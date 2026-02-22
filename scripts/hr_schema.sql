-- =============================================
-- HR Management System - Database Schema
-- =============================================

-- الموظفين
CREATE TABLE IF NOT EXISTS hr_employees (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36),
  employee_number VARCHAR(20) UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  national_id VARCHAR(20),
  phone VARCHAR(20),
  email VARCHAR(255),
  department VARCHAR(100),
  job_title VARCHAR(100),
  hire_date DATE,
  contract_type ENUM('full_time', 'part_time', 'contract') DEFAULT 'full_time',
  
  -- الراتب
  basic_salary DECIMAL(10,2) DEFAULT 0,
  housing_allowance DECIMAL(10,2) DEFAULT 0,
  transport_allowance DECIMAL(10,2) DEFAULT 0,
  other_allowances DECIMAL(10,2) DEFAULT 0,
  
  -- الأرصدة السنوية
  annual_leave_balance DECIMAL(5,2) DEFAULT 21,
  sick_leave_balance DECIMAL(5,2) DEFAULT 30,
  
  -- بيانات البنك
  bank_name VARCHAR(100),
  iban VARCHAR(30),
  
  status ENUM('active', 'inactive', 'terminated') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- سجل الحضور والانصراف
CREATE TABLE IF NOT EXISTS hr_attendance (
  id VARCHAR(36) PRIMARY KEY,
  employee_id VARCHAR(36) NOT NULL,
  date DATE NOT NULL,
  check_in DATETIME,
  check_out DATETIME,
  status ENUM('present', 'absent', 'late', 'leave', 'holiday') DEFAULT 'present',
  late_minutes INT DEFAULT 0,
  overtime_minutes INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_attendance (employee_id, date),
  FOREIGN KEY (employee_id) REFERENCES hr_employees(id) ON DELETE CASCADE
);

-- الطلبات
CREATE TABLE IF NOT EXISTS hr_requests (
  id VARCHAR(36) PRIMARY KEY,
  employee_id VARCHAR(36) NOT NULL,
  request_type ENUM('annual_leave', 'sick_leave', 'unpaid_leave', 'shift_swap', 'overtime', 'other') NOT NULL,
  start_date DATE,
  end_date DATE,
  days_count DECIMAL(4,1),
  reason TEXT,
  attachment_url VARCHAR(500),
  
  status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
  reviewed_by VARCHAR(36),
  reviewed_at DATETIME,
  reviewer_notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (employee_id) REFERENCES hr_employees(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- الإعلانات
CREATE TABLE IF NOT EXISTS hr_announcements (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
  target_departments JSON,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  published_at DATETIME,
  expires_at DATETIME,
  created_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- مسيرات الرواتب
CREATE TABLE IF NOT EXISTS hr_payroll_runs (
  id VARCHAR(36) PRIMARY KEY,
  period_month INT NOT NULL,
  period_year INT NOT NULL,
  status ENUM('draft', 'processing', 'approved', 'paid') DEFAULT 'draft',
  total_employees INT DEFAULT 0,
  total_amount DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  approved_by VARCHAR(36),
  approved_at DATETIME,
  created_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_period (period_month, period_year),
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- تفاصيل الرواتب لكل موظف
CREATE TABLE IF NOT EXISTS hr_payroll_details (
  id VARCHAR(36) PRIMARY KEY,
  payroll_run_id VARCHAR(36) NOT NULL,
  employee_id VARCHAR(36) NOT NULL,
  
  -- المستحقات
  basic_salary DECIMAL(10,2) DEFAULT 0,
  housing_allowance DECIMAL(10,2) DEFAULT 0,
  transport_allowance DECIMAL(10,2) DEFAULT 0,
  other_allowances DECIMAL(10,2) DEFAULT 0,
  overtime_amount DECIMAL(10,2) DEFAULT 0,
  
  -- الخصومات
  absence_deduction DECIMAL(10,2) DEFAULT 0,
  late_deduction DECIMAL(10,2) DEFAULT 0,
  loan_deduction DECIMAL(10,2) DEFAULT 0,
  other_deductions DECIMAL(10,2) DEFAULT 0,
  gosi_deduction DECIMAL(10,2) DEFAULT 0,
  
  -- الصافي
  gross_salary DECIMAL(10,2) DEFAULT 0,
  total_deductions DECIMAL(10,2) DEFAULT 0,
  net_salary DECIMAL(10,2) DEFAULT 0,
  
  working_days INT DEFAULT 0,
  absent_days INT DEFAULT 0,
  late_days INT DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (payroll_run_id) REFERENCES hr_payroll_runs(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES hr_employees(id) ON DELETE CASCADE
);

-- إعدادات HR
CREATE TABLE IF NOT EXISTS hr_settings (
  id VARCHAR(36) PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  description VARCHAR(255),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- إدخال إعدادات افتراضية
INSERT INTO hr_settings (id, setting_key, setting_value, description) VALUES
(UUID(), 'work_start_time', '09:00', 'وقت بداية الدوام'),
(UUID(), 'work_end_time', '17:00', 'وقت نهاية الدوام'),
(UUID(), 'late_grace_minutes', '15', 'دقائق السماح للتأخير'),
(UUID(), 'working_days_per_month', '22', 'عدد أيام العمل في الشهر'),
(UUID(), 'overtime_rate', '1.5', 'معامل الإضافي'),
(UUID(), 'gosi_employee_rate', '9.75', 'نسبة التأمينات على الموظف')
ON DUPLICATE KEY UPDATE setting_key = setting_key;

-- فهارس للأداء
CREATE INDEX idx_attendance_date ON hr_attendance(date);
CREATE INDEX idx_attendance_employee ON hr_attendance(employee_id);
CREATE INDEX idx_requests_status ON hr_requests(status);
CREATE INDEX idx_requests_employee ON hr_requests(employee_id);
CREATE INDEX idx_employees_status ON hr_employees(status);
CREATE INDEX idx_announcements_active ON hr_announcements(is_active, published_at);

-- =============================================
-- التكامل مع النظام المالي
-- =============================================

-- إضافة حقل ربط القيد المحاسبي لمسير الرواتب
ALTER TABLE hr_payroll_runs 
ADD COLUMN accounting_move_id VARCHAR(36) NULL,
ADD FOREIGN KEY (accounting_move_id) REFERENCES accounting_moves(id) ON DELETE SET NULL;

-- إنشاء دفتر يومية للرواتب إذا لم يكن موجوداً
INSERT INTO accounting_journals (id, name, code, type)
SELECT UUID(), 'الرواتب والأجور', 'SAL', 'general'
WHERE NOT EXISTS (SELECT 1 FROM accounting_journals WHERE code = 'SAL');

-- إضافة إعدادات حسابات الرواتب
INSERT INTO hr_settings (id, setting_key, setting_value, description) VALUES
(UUID(), 'salary_expense_account_id', NULL, 'حساب مصروف الرواتب في الدليل المحاسبي'),
(UUID(), 'salary_payable_account_id', NULL, 'حساب الرواتب المستحقة (دائن)'),
(UUID(), 'salary_journal_id', NULL, 'دفتر يومية الرواتب')
ON DUPLICATE KEY UPDATE setting_key = setting_key;

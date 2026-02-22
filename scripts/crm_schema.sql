
-- =============================================
-- CRM System Schema
-- =============================================

-- التأكد من وجود جدول العملاء (للتذكير فقط، يفترض أنه موجود)
-- -- 0. جدول العملاء (الأساسي)
CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(36) PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) UNIQUE, -- مهم جداً لكشف التكرار
  email VARCHAR(255),
  national_id VARCHAR(20),
  address TEXT,
  notes TEXT,
  
  -- تصنيف العميل
  type ENUM('individual', 'company') DEFAULT 'individual',
  status ENUM('active', 'blacklist', 'archived') DEFAULT 'active',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 1. جدول الصفقات (Deals/Opportunities)
CREATE TABLE IF NOT EXISTS crm_deals (
  id VARCHAR(36) PRIMARY KEY,
  customer_id VARCHAR(36) NOT NULL, -- يربط بالعميل
  title VARCHAR(255) NOT NULL,      -- عنوان الصفقة (مثلاً: إيجار فيلا 5 أيام)
  value DECIMAL(12,2) DEFAULT 0,    -- قيمة الصفقة المتوقعة
  
  -- مراحل الـ Pipeline
  stage ENUM('new', 'contacting', 'qualified', 'proposal', 'negotiation', 'won', 'lost') DEFAULT 'new',
  
  priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
  expected_close_date DATE,
  
  assigned_to VARCHAR(36), -- الموظف المسؤول (users.id)
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

-- 2. جدول سجل الأنشطة (Activity Timeline)
CREATE TABLE IF NOT EXISTS crm_activities (
  id VARCHAR(36) PRIMARY KEY,
  deal_id VARCHAR(36),          -- النشاط قد يكون مرتبط بصفقة محددة
  customer_id VARCHAR(36),      -- أو مرتبط بالعميل بشكل عام
  
  -- نوع النشاط
  type ENUM('note', 'call', 'meeting', 'email', 'status_change', 'log') NOT NULL,
  
  title VARCHAR(255),  -- عنوان مختصر (مثلاً: اتصال هاتفي)
  description TEXT,    -- تفاصيل النشاط
  
  performed_by VARCHAR(36), -- من قام بالنشاط (users.id)
  performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (deal_id) REFERENCES crm_deals(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 3. فهارس للأداء (Indexes)
CREATE INDEX idx_crm_deals_stage ON crm_deals(stage);
CREATE INDEX idx_crm_deals_customer ON crm_deals(customer_id);
CREATE INDEX idx_crm_activities_deal ON crm_activities(deal_id);
CREATE INDEX idx_crm_activities_customer ON crm_activities(customer_id);

-- 4. التأكد من فهرس الهاتف في جدول العملاء (لكشف التكرار) 
-- (ملاحظة: إذا كان الفهرس موجوداً مسبقاً قد يعطي تحذيراً، لكنه ضروري)
-- CREATE INDEX idx_customers_phone ON customers(phone);

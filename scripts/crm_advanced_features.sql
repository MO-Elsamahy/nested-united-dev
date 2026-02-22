-- CRM Advanced Features Schema

-- 1. Custom Pipeline Stages (مراحل مخصصة)
CREATE TABLE IF NOT EXISTS crm_custom_stages (
    id VARCHAR(36) PRIMARY KEY,
    label VARCHAR(100) NOT NULL,
    stage_key VARCHAR(50) UNIQUE NOT NULL, -- unique identifier
    color VARCHAR(50) DEFAULT 'bg-gray-100',
    stage_order INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Customer Tags (تصنيفات العملاء)
CREATE TABLE IF NOT EXISTS crm_tags (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(50) DEFAULT 'bg-blue-100',
    text_color VARCHAR(50) DEFAULT 'text-blue-700',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS crm_customer_tags (
    customer_id VARCHAR(36),
    tag_id VARCHAR(36),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (customer_id, tag_id),
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES crm_tags(id) ON DELETE CASCADE
);

-- 3. Notifications System (نظام الإشعارات)
CREATE TABLE IF NOT EXISTS crm_notifications (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    title VARCHAR(255) NOT NULL,
    message TEXT,
    type ENUM('deal_status', 'new_customer', 'new_activity', 'automation', 'system') DEFAULT 'system',
    link VARCHAR(500), -- رابط للانتقال للعنصر المرتبط
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Automation Rules (قواعد الأتمتة)
CREATE TABLE IF NOT EXISTS crm_automation_rules (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_event ENUM('deal_stage_change', 'deal_created', 'customer_created', 'activity_created') NOT NULL,
    trigger_condition JSON, -- شروط التفعيل (مثلاً: stage = 'won')
    action_type ENUM('create_notification', 'send_email', 'create_activity', 'update_field') NOT NULL,
    action_config JSON, -- إعدادات الإجراء
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert Default Stages
INSERT INTO crm_custom_stages (id, label, stage_key, color, stage_order) VALUES
(UUID(), 'جديد', 'new', 'bg-gray-100', 1),
(UUID(), 'جاري التواصل', 'contacting', 'bg-blue-50', 2),
(UUID(), 'إرسال عرض', 'proposal', 'bg-purple-50', 3),
(UUID(), 'تفاوض', 'negotiation', 'bg-yellow-50', 4),
(UUID(), 'تم الاتفاق', 'won', 'bg-green-50', 5),
(UUID(), 'خسارة', 'lost', 'bg-red-50', 6)
ON DUPLICATE KEY UPDATE label=label;

-- Insert Default Tags
INSERT INTO crm_tags (id, name, color, text_color) VALUES
(UUID(), 'VIP', 'bg-amber-100', 'text-amber-700'),
(UUID(), 'عميل جديد', 'bg-blue-100', 'text-blue-700'),
(UUID(), 'مهم', 'bg-red-100', 'text-red-700'),
(UUID(), 'عميل نشط', 'bg-green-100', 'text-green-700'),
(UUID(), 'عميل محتمل', 'bg-purple-100', 'text-purple-700')
ON DUPLICATE KEY UPDATE name=name;

-- Default Automation Rule: Notify on Won Deal
INSERT INTO crm_automation_rules (id, name, description, trigger_event, trigger_condition, action_type, action_config) VALUES
(UUID(), 
 'إشعار عند إتمام صفقة', 
 'إرسال إشعار تلقائي عندما تصل الصفقة لمرحلة "تم الاتفاق"',
 'deal_stage_change',
 '{"stage": "won"}',
 'create_notification',
 '{"title": "صفقة جديدة!", "message": "تم إتمام صفقة بنجاح"}'
)
ON DUPLICATE KEY UPDATE name=name;

CREATE INDEX idx_notifications_user ON crm_notifications(user_id, is_read);
CREATE INDEX idx_customer_tags_customer ON crm_customer_tags(customer_id);
CREATE INDEX idx_custom_stages_order ON crm_custom_stages(stage_order);

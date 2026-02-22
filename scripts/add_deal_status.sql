-- Add status column to crm_deals to support "Open/Closed" states independent of stage
ALTER TABLE crm_deals ADD COLUMN status ENUM('open', 'closed', 'archived') DEFAULT 'open';
CREATE INDEX idx_crm_deals_status ON crm_deals(status);

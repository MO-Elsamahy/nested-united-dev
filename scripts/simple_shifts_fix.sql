-- 1. Create Shifts Table (If not exists)
CREATE TABLE IF NOT EXISTS hr_shifts (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    late_grace_minutes INT DEFAULT 15,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Add shift_id to hr_employees
-- Try running this line directly. 
-- If you get an error "Duplicate column name 'shift_id'", it means it's already done and you can ignore it.
ALTER TABLE hr_employees ADD COLUMN shift_id VARCHAR(36) REFERENCES hr_shifts(id);

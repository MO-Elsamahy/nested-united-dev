-- Create Shifts Table
CREATE TABLE IF NOT EXISTS hr_shifts (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    late_grace_minutes INT DEFAULT 15,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add shift_id to hr_employees
-- We use a stored procedure to safely add column if not exists
DROP PROCEDURE IF EXISTS AddShiftIdColumn;
DELIMITER //
CREATE PROCEDURE AddShiftIdColumn()
BEGIN
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_NAME = 'hr_employees' AND COLUMN_NAME = 'shift_id'
        AND TABLE_SCHEMA = DATABASE()
    ) THEN
        ALTER TABLE hr_employees ADD COLUMN shift_id VARCHAR(36) REFERENCES hr_shifts(id);
    END IF;
END //
DELIMITER ;
CALL AddShiftIdColumn();
DROP PROCEDURE AddShiftIdColumn;

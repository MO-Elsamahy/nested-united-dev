-- =====================================================
-- Migration: Add ical_uid column to reservations table
-- Purpose: Prevent duplicate bookings when employee edits a reservation
-- =====================================================

-- Add ical_uid column to store the unique iCal event ID
ALTER TABLE reservations 
ADD COLUMN ical_uid VARCHAR(255) NULL AFTER summary;

-- Create index for faster lookups by ical_uid
CREATE INDEX idx_reservations_ical_uid ON reservations(ical_uid);

-- Optional: Update existing reservations to extract ical_uid from raw_event
-- This extracts the uid from the JSON raw_event if it exists
UPDATE reservations 
SET ical_uid = JSON_UNQUOTE(JSON_EXTRACT(raw_event, '$.uid'))
WHERE raw_event IS NOT NULL 
  AND JSON_EXTRACT(raw_event, '$.uid') IS NOT NULL
  AND ical_uid IS NULL;

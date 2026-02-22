-- Add 'zomrahub' platform to all ENUM columns
-- Run this script against your database to add zomrahub support

-- browser_accounts.platform
ALTER TABLE browser_accounts 
MODIFY COLUMN platform ENUM('airbnb', 'gathern', 'whatsapp', 'zomrahub') NOT NULL;

-- booking_requests.platform (if exists)
ALTER TABLE booking_requests 
MODIFY COLUMN platform ENUM('airbnb', 'gathern', 'zomrahub') DEFAULT NULL;

-- platform_accounts.platform
ALTER TABLE platform_accounts 
MODIFY COLUMN platform ENUM('airbnb', 'gathern', 'whatsapp', 'zomrahub', 'general') NOT NULL;

-- unit_calendars.platform
ALTER TABLE unit_calendars 
MODIFY COLUMN platform ENUM('airbnb', 'gathern', 'zomrahub') NOT NULL;

-- calendar_events.platform
ALTER TABLE calendar_events 
MODIFY COLUMN platform ENUM('airbnb', 'gathern', 'zomrahub') NOT NULL;

-- unit_platforms.platform
ALTER TABLE unit_platforms 
MODIFY COLUMN platform ENUM('airbnb', 'gathern', 'zomrahub') NOT NULL;

-- bookings.platform (if exists)
ALTER TABLE bookings 
MODIFY COLUMN platform ENUM('airbnb', 'gathern', 'whatsapp', 'zomrahub', 'manual', 'unknown') DEFAULT NULL;

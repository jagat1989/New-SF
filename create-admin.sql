-- Create or update your admin account (specialfare21@gmail.com / Kairavi@123)
-- Handles every case without breaking foreign keys.
-- The passwordHash below is a REAL scrypt hash — login WILL work after this.

-- Step 1: If a row with this email already exists, just UPDATE its password + role.
--         (UPDATE avoids the duplicate-email error AND preserves foreign keys.)
UPDATE "User"
SET "passwordHash" = '71ce3355f361da30d00b1fb3f80ad9a0:983ef6f67d7317c063dffaffe38738cd665f0983d0f537e7b824bb66626a8a75099075f09432b46ea4106e9c81dc57f47c431bef1fbb775404b4498725c2a3a5',
    "role" = 'ADMIN',
    "name" = 'Special Fare Admin',
    "active" = true,
    "updatedAt" = NOW()
WHERE email = 'specialfare21@gmail.com';

-- Step 2: If no row existed (the UPDATE above matched 0 rows), INSERT one.
--         Only runs if the email isn't already taken.
INSERT INTO "User" ("id", "email", "passwordHash", "name", "role", "active", "balance", "commissionRate", "createdAt", "updatedAt")
SELECT 'admin1', 'specialfare21@gmail.com', '71ce3355f361da30d00b1fb3f80ad9a0:983ef6f67d7317c063dffaffe38738cd665f0983d0f537e7b824bb66626a8a75099075f09432b46ea4106e9c81dc57f47c431bef1fbb775404b4498725c2a3a5', 'Special Fare Admin', 'ADMIN', true, 0, 0, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "User" WHERE email = 'specialfare21@gmail.com');

-- Show the result (should say password_status = OK and hash_length = 161):
SELECT email, role, active, LENGTH("passwordHash") AS hash_length, CASE WHEN "passwordHash" IS NULL OR "passwordHash" = '' THEN 'BROKEN — empty hash' ELSE 'OK — ready to login' END AS password_status FROM "User" WHERE email = 'specialfare21@gmail.com';

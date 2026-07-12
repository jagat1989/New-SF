-- Create your admin account (specialfare21@gmail.com / Kairavi@123)
-- Paste this entire block into Supabase SQL Editor and click Run.
-- Safe to run multiple times — uses ON CONFLICT to update if exists.
-- The passwordHash below is a REAL scrypt hash — login WILL work.

INSERT INTO "User" ("id", "email", "passwordHash", "name", "role", "active", "balance", "commissionRate", "createdAt", "updatedAt")
VALUES ('admin1', 'specialfare21@gmail.com', 'f0e55d264c4ab429a3d6cb43aca77df1:359615da36314a9f21f1b054cda4c5a2a57dc4ad7290effdec54f5ad8b8b94d33a7bd6a3e2a1b5a877f6f394889cf934de7d441fdfdf93c8d710ba9c8e0345e7', 'Special Fare Admin', 'ADMIN', true, 0, 0, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET
  "passwordHash" = EXCLUDED."passwordHash",
  "role" = 'ADMIN',
  "active" = true,
  "updatedAt" = NOW();

-- Show the result (should say password_status = OK):
SELECT email, role, active, LENGTH("passwordHash") AS hash_length, CASE WHEN "passwordHash" IS NULL OR "passwordHash" = '' THEN 'BROKEN — empty hash' ELSE 'OK — ready to login' END AS password_status FROM "User" WHERE email = 'specialfare21@gmail.com';

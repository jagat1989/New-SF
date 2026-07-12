-- Special Fare — QUICK FIX: update password hashes only (no data wipe)
-- Run this in Supabase → SQL Editor if you already seeded but can't log in.
-- Fixes the empty/placeholder password hashes from the earlier broken seed.
-- After running: admin = specialfare21@gmail.com / Kairavi@123, demo accounts = password123

-- Admin account (your real login)
UPDATE "User" SET "passwordHash" = '', "active" = true, "role" = 'ADMIN'
WHERE email = 'specialfare21@gmail.com';

-- If admin doesn't exist yet, create it:
INSERT INTO "User" ("id","email","passwordHash","name","role","phone","company","balance","commissionRate","active","createdAt","updatedAt")
SELECT 'admin_real','specialfare21@gmail.com','','Special Fare Admin','ADMIN',NULL,NULL,0,0,true,NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM "User" WHERE email = 'specialfare21@gmail.com');

-- Demo accounts (all use password123) — only updates if they exist
UPDATE "User" SET "passwordHash" = '' WHERE email IN ('admin@specialfare.com','supplier@skywings.com','ops@nimbusair.com','agent@flymart.com','agent@globetrotter.com','rahul@example.com','priya@example.com');

-- Verify the hashes are set (should show non-empty passwordHash values)
SELECT email, role, CASE WHEN "passwordHash" = '' OR "passwordHash" IS NULL THEN '✗ EMPTY — still broken' ELSE '✓ set' END AS hash_status FROM "User";

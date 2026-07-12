// Standalone script: generates create-admin.sql with a REAL working password hash.
// The hash is written directly to the file — no shell interpolation involved.
const { scryptSync, randomBytes, timingSafeEqual } = require('crypto')
const fs = require('fs')

const password = 'Kairavi@123'
const salt = randomBytes(16).toString('hex')
const hash = scryptSync(password, salt, 64).toString('hex')
const pwHash = salt + ':' + hash

// Verify the hash works before writing
const [s, h] = pwHash.split(':')
const a = Buffer.from(h, 'hex')
const b = scryptSync(password, s, 64)
if (!timingSafeEqual(a, b)) {
  console.error('FATAL: hash verification failed')
  process.exit(1)
}
console.log('✓ Hash verified against "' + password + '"')

const sql = `-- Create or update your admin account (specialfare21@gmail.com / Kairavi@123)
-- Handles every case without breaking foreign keys.
-- The passwordHash below is a REAL scrypt hash — login WILL work after this.

-- Step 1: If a row with this email already exists, just UPDATE its password + role.
--         (UPDATE avoids the duplicate-email error AND preserves foreign keys.)
UPDATE "User"
SET "passwordHash" = '${pwHash}',
    "role" = 'ADMIN',
    "name" = 'Special Fare Admin',
    "active" = true,
    "updatedAt" = NOW()
WHERE email = 'specialfare21@gmail.com';

-- Step 2: If no row existed (the UPDATE above matched 0 rows), INSERT one.
--         Only runs if the email isn't already taken.
INSERT INTO "User" ("id", "email", "passwordHash", "name", "role", "active", "balance", "commissionRate", "createdAt", "updatedAt")
SELECT 'admin1', 'specialfare21@gmail.com', '${pwHash}', 'Special Fare Admin', 'ADMIN', true, 0, 0, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "User" WHERE email = 'specialfare21@gmail.com');

-- Show the result (should say password_status = OK and hash_length = 161):
SELECT email, role, active, LENGTH("passwordHash") AS hash_length, CASE WHEN "passwordHash" IS NULL OR "passwordHash" = '' THEN 'BROKEN — empty hash' ELSE 'OK — ready to login' END AS password_status FROM "User" WHERE email = 'specialfare21@gmail.com';
`

fs.writeFileSync('create-admin.sql', sql)
console.log('✓ create-admin.sql written (' + sql.length + ' bytes)')
console.log('  Hash length:', pwHash.length, '(should be 161: 32 + 1 + 128)')
console.log('  First 40 chars of hash:', pwHash.slice(0, 40) + '...')

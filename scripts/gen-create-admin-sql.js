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

const sql = `-- Create your admin account (specialfare21@gmail.com / Kairavi@123)
-- Paste this entire block into Supabase SQL Editor and click Run.
-- Safe to run multiple times — uses ON CONFLICT to update if exists.
-- The passwordHash below is a REAL scrypt hash — login WILL work.

INSERT INTO "User" ("id", "email", "passwordHash", "name", "role", "active", "balance", "commissionRate", "createdAt", "updatedAt")
VALUES ('admin1', 'specialfare21@gmail.com', '${pwHash}', 'Special Fare Admin', 'ADMIN', true, 0, 0, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET
  "passwordHash" = EXCLUDED."passwordHash",
  "role" = 'ADMIN',
  "active" = true,
  "updatedAt" = NOW();

-- Show the result (should say password_status = OK):
SELECT email, role, active, LENGTH("passwordHash") AS hash_length, CASE WHEN "passwordHash" IS NULL OR "passwordHash" = '' THEN 'BROKEN — empty hash' ELSE 'OK — ready to login' END AS password_status FROM "User" WHERE email = 'specialfare21@gmail.com';
`

fs.writeFileSync('create-admin.sql', sql)
console.log('✓ create-admin.sql written (' + sql.length + ' bytes)')
console.log('  Hash length:', pwHash.length, '(should be 161: 32 + 1 + 128)')
console.log('  First 40 chars of hash:', pwHash.slice(0, 40) + '...')

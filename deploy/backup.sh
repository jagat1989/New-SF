#!/usr/bin/env bash
# ============================================================================
#  Special Fare — SQLite backup script
#  Creates a timestamped backup of the database and prunes old backups.
#  Set up as a daily cron job: crontab -e
#    0 2 * * * /var/www/special-fare/deploy/backup.sh
# ============================================================================

set -euo pipefail

APP_DIR="/var/www/special-fare"
DB_FILE="${APP_DIR}/db/custom.db"
BACKUP_DIR="/var/backups/special-fare"
KEEP_DAYS=14

mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/special-fare-${TIMESTAMP}.db"

if [[ ! -f "$DB_FILE" ]]; then
  echo "Database not found at ${DB_FILE}" >&2
  exit 1
fi

# Use sqlite3 .backup for a safe, consistent snapshot (handles concurrent writes)
sqlite3 "$DB_FILE" ".backup '${BACKUP_FILE}'"

# Also gzip to save space
gzip -f "$BACKUP_FILE"

# Prune backups older than KEEP_DAYS
find "$BACKUP_DIR" -name "special-fare-*.db.gz" -mtime "+${KEEP_DAYS}" -delete

echo "Backup created: ${BACKUP_FILE}.gz ($(du -h ${BACKUP_FILE}.gz | cut -f1))"
echo "Backups older than ${KEEP_DAYS} days pruned."
echo "Total backups: $(ls -1 ${BACKUP_DIR}/special-fare-*.db.gz 2>/dev/null | wc -l)"

#!/bin/bash

# Daily backup of the V2 CRM database — local disk, rotated. Reads DB credentials straight
# from Laravel's own .env so there's exactly one place these ever need to change.
#
# Cron (as root): 0 4 * * * /var/www/crm-kw/backup-db.sh >> /var/log/crm-db-backup.log 2>&1

set -e

LARAVEL_DIR="/var/www/crm-kw/LARAVEL CRM V2"
BACKUP_DIR="/var/backups/crm-kw-db"
RETENTION_DAYS=14
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)

ENV_FILE="$LARAVEL_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
    echo "[$(date)] ERROR: .env not found at $ENV_FILE" >&2
    exit 1
fi

DB_DATABASE=$(grep -m1 "^DB_DATABASE=" "$ENV_FILE" | cut -d= -f2-)
DB_USERNAME=$(grep -m1 "^DB_USERNAME=" "$ENV_FILE" | cut -d= -f2-)
DB_PASSWORD=$(grep -m1 "^DB_PASSWORD=" "$ENV_FILE" | cut -d= -f2-)
DB_HOST=$(grep -m1 "^DB_HOST=" "$ENV_FILE" | cut -d= -f2-)

mkdir -p "$BACKUP_DIR"

DUMP_FILE="$BACKUP_DIR/crm_v2_${TIMESTAMP}.sql.gz"

echo "[$(date)] Starting backup of $DB_DATABASE -> $DUMP_FILE"

MYSQL_PWD="$DB_PASSWORD" mysqldump \
    --host="$DB_HOST" \
    --user="$DB_USERNAME" \
    --single-transaction \
    --quick \
    --routines \
    "$DB_DATABASE" | gzip > "$DUMP_FILE"

DUMP_SIZE=$(du -h "$DUMP_FILE" | cut -f1)
echo "[$(date)] Backup complete: $DUMP_FILE ($DUMP_SIZE)"

# Rotation — delete anything older than RETENTION_DAYS so this never quietly fills the disk.
DELETED_COUNT=$(find "$BACKUP_DIR" -name "crm_v2_*.sql.gz" -mtime +$RETENTION_DAYS -print -delete | wc -l)
if [ "$DELETED_COUNT" -gt 0 ]; then
    echo "[$(date)] Rotated out $DELETED_COUNT backup(s) older than $RETENTION_DAYS days"
fi

echo "[$(date)] Done."

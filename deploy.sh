#!/bin/bash

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

LARAVEL_DIR="/var/www/crm-kw/LARAVEL CRM"
REACT_DIR="/var/www/crm-kw/REACT CRM"

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}   🚀 CRM Deploy - مركز مطمئنة${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# ── 1. Git Pull ──────────────────────────────
echo -e "\n${GREEN}[1/5] سحب آخر التعديلات...${NC}"
cd "/var/www/crm-kw"
git pull origin main

# ── 2. Laravel ──────────────────────────────
echo -e "\n${GREEN}[2/5] تحديث Laravel...${NC}"
cd "$LARAVEL_DIR"

composer install --no-interaction --prefer-dist --optimize-autoloader --no-dev

php artisan migrate --force
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache

# ── 3. React Build ───────────────────────────
echo -e "\n${GREEN}[3/5] بناء React...${NC}"
cd "$REACT_DIR"

npm ci --silent
npm run build

# ── 4. Permissions ───────────────────────────
echo -e "\n${GREEN}[4/5] ضبط الصلاحيات...${NC}"
chown -R www-data:www-data "$LARAVEL_DIR/storage"
chown -R www-data:www-data "$LARAVEL_DIR/bootstrap/cache"
chmod -R 775 "$LARAVEL_DIR/storage"
chmod -R 775 "$LARAVEL_DIR/bootstrap/cache"

# ── 5. Restart Services ──────────────────────
echo -e "\n${GREEN}[5/5] إعادة تشغيل الخدمات...${NC}"
systemctl reload nginx
systemctl restart php8.2-fpm

# Horizon (اختياري - شغّله لو مستخدم Queue)
# systemctl restart horizon

echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}   ✅ تم النشر بنجاح!${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

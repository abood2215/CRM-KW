# دليل نشر CRM V2 (فرع/سيرفر مستقل)

هذا الدليل لنشر نسخة **مستقلة تماماً** من النظام (بيانات وموارد خاصة بيها) على سيرفر جديد — مثلاً لفرع آخر برقم واتساب مختلف. المشروعين مطلوبين معاً:

- `LARAVEL CRM V2/` — الباك اند (Laravel API)
- `REACT CRM V2/` — الفرونت اند (React + Vite)

## المتطلبات على السيرفر

- Ubuntu/Debian (أو أي توزيعة Linux حديثة) مع صلاحية root/sudo
- PHP 8.2+ مع الإضافات المعتادة (`pdo_mysql`, `mbstring`, `curl`, `zip`, `bcmath`)
- [Composer](https://getcomposer.org)
- Node.js 18+ و npm
- MySQL 8+ (أو MariaDB)
- nginx (أو أي سيرفر ويب آخر يدعم PHP-FPM)
- (اختياري) Supervisor — لتشغيل queue worker و Reverb كخدمات دائمة

## 1. سحب الكود

```bash
git clone https://github.com/abood2215/CRM-KW.git
cd CRM-KW
# لو الفرع الجديد على git branch مخصص:
# git checkout <branch-name>
```

## 2. قاعدة البيانات

```sql
CREATE DATABASE crm_v2 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'crm_v2_user'@'localhost' IDENTIFIED BY 'كلمة-سر-قوية';
GRANT ALL PRIVILEGES ON crm_v2.* TO 'crm_v2_user'@'localhost';
FLUSH PRIVILEGES;
```

## 3. الباك اند (`LARAVEL CRM V2`)

```bash
cd "LARAVEL CRM V2"
cp .env.example .env
composer install --no-interaction --prefer-dist --optimize-autoloader --no-dev
php artisan key:generate --force
```

افتح `.env` وعدّل:

| المتغير | القيمة |
|---|---|
| `APP_URL` | رابط الدومين الفعلي (`https://your-domain.com`) |
| `DB_DATABASE` / `DB_USERNAME` / `DB_PASSWORD` | بيانات قاعدة البيانات بالخطوة 2 |
| `CORS_ALLOWED_ORIGINS` | نفس رابط الفرونت اند (نفس `APP_URL` لو نفس الدومين) |
| `MAIL_*` | إعدادات بريد فعلية (اختياري، `log` كافي مؤقتاً) |

**ملاحظات مهمة:**
- `LEGACY_DB_*` و `LEGACY_APP_KEY` خاصة فقط بترحيل بيانات من نظام قديم — **تجاهلها بالكامل** إذا الفرع الجديد يبدأ ببيانات فاضية.
- `WHATSAPP_APP_SECRET` / `WHATSAPP_WEBHOOK_VERIFY_TOKEN` هذي إعدادات **مستوى تطبيق Meta** (تُنشأ من [Meta for Developers](https://developers.facebook.com))، مش خاصة برقم معيّن. أرقام الواتساب نفسها (Cloud API أو Baileys) **تُضاف من داخل النظام بعد تسجيل الدخول** (Settings → أرقام واتساب) — بدون أي تعديل كود أو `.env`.
- `CHATWOOT_*` و `BAILEYS_BASE_URL` اختيارية، فقط لو الفرع يستخدم هذي التكاملات.

بعد ضبط `.env`:

```bash
php artisan migrate --force
php artisan storage:link --force
```

أنشئ أول مستخدم admin:

```bash
php artisan tinker --execute="
App\Models\User::create([
    'name' => 'اسمك',
    'email' => 'admin@example.com',
    'password' => Hash::make('كلمة-سر-قوية'),
    'role' => 'admin',
    'is_active' => true,
]);
"
```

### إعداد Reverb (البث اللحظي — إشعارات، رسائل مباشرة)

```bash
php artisan reverb:install   # لو ما ضبط شي، جاهز مسبقاً بهذا المشروع
```

عيّن بـ `.env`: `REVERB_APP_ID` / `REVERB_APP_KEY` / `REVERB_APP_SECRET` (أي قيم عشوائية فريدة)، و `REVERB_HOST`/`REVERB_PORT`/`REVERB_SCHEME` حسب بيئتك. بعدها فعّل: `BROADCAST_CONNECTION=reverb` بـ `.env`.

شغّل السيرفر (يدوياً للتجربة، أو عبر Supervisor بالإنتاج — انظر تحت):

```bash
php artisan reverb:start
```

## 4. الفرونت اند (`REACT CRM V2`)

```bash
cd "../REACT CRM V2"
cp .env.example .env
```

عدّل `.env`:
- `VITE_API_BASE_URL` → `https://your-domain.com/api`
- `VITE_PUSHER_APP_KEY` → نفس قيمة `REVERB_APP_KEY` من الباك اند
- `VITE_PUSHER_HOST` → نفس دومين الموقع (لو عبر nginx على 443) أو `localhost` (لو تجربة محلية)
- `VITE_PUSHER_PORT` → `443` (إنتاج عبر nginx) أو `8080` (محلي مباشر)
- `VITE_PUSHER_SCHEME` → `https` (إنتاج) أو `http` (محلي)

```bash
npm install
npm run build
```

الناتج بمجلد `dist/` — هذا اللي يُخدّم عبر nginx.

## 5. nginx (مثال)

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;
    ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    root /path/to/CRM-KW/REACT CRM V2/dist;
    index index.html;

    location ^~ /storage/ {
        alias /path/to/CRM-KW/LARAVEL CRM V2/storage/app/public/;
    }

    location ^~ /api {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME /path/to/CRM-KW/LARAVEL CRM V2/public/index.php;
        fastcgi_param REQUEST_URI $request_uri;
        fastcgi_param REQUEST_METHOD $request_method;
        fastcgi_param CONTENT_TYPE $content_type;
        fastcgi_param CONTENT_LENGTH $content_length;
        fastcgi_param QUERY_STRING $query_string;
        fastcgi_param SERVER_NAME $server_name;
        fastcgi_param HTTPS on;
        include fastcgi_params;
    }

    # Reverb WebSocket
    location /app {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

استخدم `certbot --nginx -d your-domain.com` لشهادة SSL مجانية.

## 6. خدمات دائمة (Supervisor)

Queue worker:

```ini
# /etc/supervisor/conf.d/laravel-worker.conf
[program:laravel-worker]
command=php /path/to/CRM-KW/LARAVEL CRM V2/artisan queue:work --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
user=www-data
numprocs=1
stdout_logfile=/path/to/CRM-KW/LARAVEL CRM V2/storage/logs/worker.log
```

Reverb:

```ini
# /etc/supervisor/conf.d/reverb.conf
[program:reverb]
command=php /path/to/CRM-KW/LARAVEL CRM V2/artisan reverb:start
autostart=true
autorestart=true
user=www-data
stdout_logfile=/path/to/CRM-KW/LARAVEL CRM V2/storage/logs/reverb.log
```

Cron (لجدولة `schedule:run`):

```bash
* * * * * cd "/path/to/CRM-KW/LARAVEL CRM V2" && php artisan schedule:run >> /dev/null 2>&1
```

```bash
supervisorctl reread && supervisorctl update
```

## 7. الخطوة الأخيرة — إضافة رقم واتساب

سجّل دخول بحساب الـ admin اللي أنشأته بالخطوة 3، روح على **الإعدادات → أرقام واتساب → رقم جديد**، واختر:

- **Cloud API** (المُوصى بها): تحتاج `phone_number_id` و `access_token` من [Meta Business Manager](https://business.facebook.com) — تُدخل هنا مباشرة، بدون أي تعديل كود.
- **Baileys (واتساب ويب)**: يحتاج تشغيل خدمة Baileys منفصلة (Node.js) على السيرفر مسبقاً (`BAILEYS_BASE_URL` بـ `.env`)، وبعدها مسح رمز QR من نفس الصفحة.

لو استخدمت Cloud API، سجّل webhook بلوحة Meta على:
```
https://your-domain.com/api/webhooks/whatsapp
```
مع نفس قيمة `WHATSAPP_WEBHOOK_VERIFY_TOKEN` من `.env`.

## التحقق النهائي

- فتح الموقع وتسجيل الدخول ينجح
- إنشاء جهة اتصال وحملة تجريبية
- إرسال رسالة واتساب فعلية من رقم مضاف حديثاً والتأكد من التسليم
- فتح صفحتين متزامنتين والتأكد إن الإشعارات تصل لحظياً (يتحقق من إعداد Reverb)

# داشبورد پایش یخچال‌های خون

یک داشبورد Laravel + React + TypeScript + Tailwind برای پایش یخچال‌های نگهداری خون. سامانه شامل ورود مشتری و مدیر، داشبورد فارسی RTL، مدیریت مشتریان/کاربران/یخچال‌ها، دریافت تله‌متری از HTTP یا MQTT، هشدارها، تاریخچه، خروجی CSV و PWA نصب‌پذیر است.

## پیش‌نیازها

- PHP 8.3 یا جدیدتر
- Composer
- Node.js و npm
- MySQL برای محیط واقعی، یا SQLite برای اجرای محلی سبک

## نصب اولیه

```bash
composer install
npm install
cp .env.example .env
php artisan key:generate
```

در ویندوز اگر PowerShell اجرای `npm.ps1` را مسدود کرد، از `npm.cmd install` استفاده کنید.

## تنظیم فایل env

برای MySQL مقدارهای زیر را در `.env` تنظیم کنید:

```dotenv
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=device_monitoring
DB_USERNAME=root
DB_PASSWORD=
```

برای SQLite محلی:

```bash
touch database/database.sqlite
```

در PowerShell:

```powershell
New-Item -ItemType File database/database.sqlite
```

```dotenv
DB_CONNECTION=sqlite
DB_DATABASE=/absolute/path/to/database/database.sqlite
```

برای دریافت تله‌متری، مقدار `INGESTION_SECRET` را در `.env` تغییر دهید:

```dotenv
INGESTION_SECRET=change-this-local-secret
```

## دیتابیس و داده نمونه

برای نصب تازه و داده‌های دمو:

```bash
php artisan migrate:fresh --seed
```

داده نمونه شامل یک مشتری، کاربر مدیر، کاربر مشتری، دو یخچال خون، رکوردهای تله‌متری و چند وضعیت هشدار نمونه است.

## اجرای محلی

ترمینال اول:

```bash
php artisan serve
```

ترمینال دوم:

```bash
npm run dev
```

سپس `http://localhost:8000` را باز کنید.

## ساخت production

```bash
npm run build
```

## حساب‌های دمو

- مدیر: `admin` / `password`
- مشتری: `demo` / `password`

## تست دریافت تله‌متری با curl

```bash
curl -X POST http://localhost:8000/api/ingest/telemetry \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-Ingestion-Secret: change-this-local-secret" \
  -d '{
    "device_code": "device-001",
    "temperature_1": 4.5,
    "temperature_2": 4.6,
    "temperature_3": 4.7,
    "temperature_4": 4.8,
    "door_status": "closed",
    "pf_status": "normal",
    "timestamp": "2026-05-07T10:20:00Z"
  }'
```

اگر کد دستگاه داخل JSON نیست، می‌توان آن را از تاپیک MQTT دریافت کرد:

```bash
curl -X POST http://localhost:8000/api/ingest/telemetry \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-Ingestion-Secret: change-this-local-secret" \
  -H "X-MQTT-Topic: devices/device-001/telemetry" \
  -d '{
    "t1": 4.5,
    "t2": 4.6,
    "t3": 4.7,
    "t4": 4.8,
    "door": "closed",
    "pf": "normal",
    "time": "2026-05-07T10:20:00Z"
  }'
```

## MQTT

فرانت‌اند مستقیم به MQTT وصل نمی‌شود. پیام‌های MQTT سمت سرور دریافت شده و از همان سرویس دریافت تله‌متری ذخیره می‌شوند.

نمونه تنظیمات:

```dotenv
MQTT_HOST=127.0.0.1
MQTT_PORT=1883
MQTT_USERNAME=
MQTT_PASSWORD=
MQTT_CLIENT_ID=blood-refrigerator-monitor
MQTT_TOPIC=devices/+/telemetry
MQTT_QOS=0
MQTT_KEEP_ALIVE=60
MQTT_USE_TLS=false
MQTT_DEVICE_CODE_TOPIC_REGEX=
```

اجرای listener در محیط محلی:

```bash
php artisan mqtt:listen
```

برای تست یک پیام:

```bash
php artisan mqtt:listen --once
```

فرمت‌های پیش‌فرض تاپیک برای استخراج کد دستگاه:

- `refrigerators/{device_code}/telemetry`
- `devices/{device_code}/telemetry`
- `clients/{client_code}/refrigerators/{device_code}/telemetry`

برای فرمت اختصاصی، `MQTT_DEVICE_CODE_TOPIC_REGEX` را با یک گروه `device_code` تنظیم کنید.

## حالت‌های production برای MQTT

حالت ۱، سرور دارای فرایند دائمی:

`php artisan mqtt:listen` را با Supervisor، systemd، Docker، Render worker، یا process manager مشابه اجرا کنید. روی deploy ری‌استارت و برای لاگ‌ها retention تنظیم شود.

حالت ۲، هاست اشتراکی:

اگر هاست PHP اجازه فرایند دائمی نمی‌دهد، یک MQTT bridge بیرونی، Node-RED، broker webhook، worker کوچک، یا gateway باید MQTT را subscribe کند و پیام JSON را به `POST /api/ingest/telemetry` با هدر `X-Ingestion-Secret` بفرستد.

## PWA

فایل‌های PWA در `public/` قرار دارند:

- `manifest.webmanifest`
- `sw.js`
- `offline.html`
- `icons/icon-192.png`
- `icons/icon-512.png`
- `icons/maskable-icon-512.png`
- `icons/apple-touch-icon.png`

نکات تست:

- روی `localhost` یا HTTPS اجرا کنید.
- `npm run build` را اجرا کنید.
- در Chrome DevTools بخش Application، Manifest و Service Worker را بررسی کنید.
- حالت Offline را فعال و صفحه را reload کنید؛ باید صفحه fallback فارسی RTL نمایش داده شود.

Service worker فقط assetهای استاتیک و صفحه آفلاین را cache می‌کند. پاسخ‌های `/api/*`، تله‌متری، هشدارها، تاریخچه، کاربران، مشتریان، یخچال‌ها و APIهای مدیریتی cache نمی‌شوند. در حالت آفلاین، سامانه صریحا اعلام می‌کند که پایش زنده به اتصال اینترنت نیاز دارد.

## APIهای اصلی

احراز هویت:

- `POST /api/login`
- `POST /api/logout`
- `GET /api/me`

یخچال‌ها:

- `GET /api/devices`
- `GET /api/devices/{device}`
- `GET /api/devices/{device}/latest`
- `GET /api/devices/{device}/history`
- `GET /api/devices/{device}/history/export`

مدیریت:

- `GET|POST /api/admin/customers`
- `GET|PUT|DELETE /api/admin/customers/{customer}`
- `GET|POST /api/admin/users`
- `PUT|DELETE /api/admin/users/{user}`
- `POST /api/admin/users/{user}/reset-password`
- `GET|POST /api/admin/devices`
- `GET|PUT|DELETE /api/admin/devices/{device}`
- `GET /api/admin/devices/{device}/raw-telemetry`

دریافت تله‌متری:

- `POST /api/ingest/telemetry`

کاربر مشتری فقط یخچال‌هایی را می‌بیند که `devices.customer_id` آن‌ها با `users.customer_id` خودش برابر باشد. کاربر مدیر `customer_id = null` دارد.

## چک‌لیست production

- `APP_ENV=production`
- `APP_DEBUG=false`
- `APP_KEY` قوی و واقعی
- `INGESTION_SECRET` قوی و غیرقابل حدس
- HTTPS فعال
- اطلاعات واقعی دیتابیس تنظیم شده باشد
- `npm run build`
- `php artisan config:cache`
- `php artisan route:cache`
- `php artisan view:cache`
- backup دیتابیس فعال باشد
- حالت deploy برای MQTT مشخص شده باشد: process دائمی یا bridge/HTTP forwarding
- مقدارهای واقعی MQTT و لیست واقعی مشتری/کاربر/دستگاه جایگزین داده‌های دمو شوند

## تنظیم payload واقعی

parser فعلی فرمت اصلی و چند نام جایگزین را می‌پذیرد. پس از دریافت نمونه JSON واقعی دستگاه‌ها، در صورت نیاز فقط mapping این فایل را تنظیم کنید:

```text
app/Services/Telemetry/TelemetryPayloadParser.php
```

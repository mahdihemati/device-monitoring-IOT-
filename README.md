# Blood Refrigerator Monitor

Laravel + MySQL backend with a React, TypeScript, Vite, Tailwind CSS frontend for client-owned blood refrigerator monitoring.

## Stack

- Backend: Laravel, MySQL
- Frontend: React, TypeScript, Vite, Tailwind CSS
- Charts: Recharts
- API client: Axios
- Auth: Laravel session auth
- MQTT ingestion: `php artisan mqtt:listen`
- HTTP ingestion: `POST /api/ingest/telemetry`

## Setup

Install PHP 8.3+, Composer, Node.js, npm, and MySQL. The current `composer.json` requires PHP 8.3 or newer.

```bash
composer install
npm install
cp .env.example .env
php artisan key:generate
```

Create a MySQL database named `device_monitoring`, then set the database values and `INGESTION_SECRET` in `.env`.

```bash
php artisan migrate --seed
```

Demo login:

- Admin username: `admin`
- Admin password: `password`
- Username: `demo`
- Password: `password`

## Run Locally

Run Laravel:

```bash
php artisan serve
```

Run the Vite dev server in another terminal:

```bash
npm run dev
```

Open `http://localhost:8000`.

For a production-style frontend build:

```bash
npm run build
```

## PWA Installable App

The dashboard is configured as an installable PWA for quick phone and desktop access.

Build the production assets:

```bash
npm run build
```

PWA files are served from `public/`:

- `manifest.webmanifest`
- `sw.js`
- `offline.html`
- `icons/icon-192.png`
- `icons/icon-512.png`
- `icons/maskable-icon-512.png`

Test installability:

1. Serve the app over HTTPS in production, or use `localhost` for local testing.
2. Run `npm run build`.
3. Open the app in Chrome or Edge.
4. Confirm the browser shows install support, or open DevTools > Application > Manifest.
5. Use DevTools > Application > Service Workers to confirm `/sw.js` is registered.
6. Enable offline mode in DevTools and reload a page to verify the offline fallback.

Offline behavior is intentionally conservative. The service worker caches static build assets and the offline page, but it does not cache `/api/*` responses. Telemetry, alarms, history, users, clients, and admin data require live network access and are not shown from cache.

Live refrigerator monitoring requires an internet connection. Do not treat the offline fallback as an operational monitoring screen.

## Telemetry Ingestion

The frontend never connects to MQTT. It only reads Laravel APIs. Telemetry can enter through the HTTP endpoint or the MQTT listener; both paths use the same parser and ingestion service.

For now, ingestion is protected by `INGESTION_SECRET` through the `X-Ingestion-Secret` header. The authentication code is isolated so it can later support per-device API keys without changing controllers or the frontend.

Expected primary payload:

```json
{
  "device_code": "device-001",
  "temperature_1": 4.5,
  "temperature_2": 4.6,
  "temperature_3": 4.7,
  "temperature_4": 4.8,
  "door_status": "closed",
  "pf_status": "normal",
  "timestamp": "2026-05-07T10:20:00Z"
}
```

The parser also accepts common alternatives while the final firmware payload is being confirmed:

- Device identifier: `device_code`, `device_id`, `serial`, `refrigerator_id`, `refrigerator_code`
- Sensors: `temperature_1..4`, `t1..4`, `temp1..4`, `sensor1..4`
- Door: `door_status`, `door`, `door_state`
- PF: `pf_status`, `pf`, `power_failure`, `power_status`
- Time: `timestamp`, `time`, `recorded_at`

Test HTTP ingestion:

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

## Real MQTT Integration

The frontend must not connect to MQTT. Real devices publish JSON to the MQTT broker, and the Laravel listener ingests those messages server-side.

Required MQTT `.env` values:

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

If `device_code` is not present in JSON, the app can derive it from these topic formats by default:

- `refrigerators/{device_code}/telemetry`
- `devices/{device_code}/telemetry`
- `clients/{client_code}/refrigerators/{device_code}/telemetry`

For a custom topic format, set `MQTT_DEVICE_CODE_TOPIC_REGEX` with either a named `device_code` group or one capture group. Example:

```dotenv
MQTT_DEVICE_CODE_TOPIC_REGEX=/^site\/[^\/]+\/unit\/(?P<device_code>[^\/]+)\/data$/
```

Example MQTT topic:

```text
devices/device-001/telemetry
```

Example payload where the device code comes from the topic:

```json
{
  "t1": 4.5,
  "t2": 4.6,
  "t3": 4.7,
  "t4": 4.8,
  "door": "closed",
  "power_status": "normal",
  "time": "2026-05-07T10:20:00Z"
}
```

Run in development:

```bash
php artisan mqtt:listen
```

For a single-message test:

```bash
php artisan mqtt:listen --once
```

The listener logs connection attempts, subscribed topics, invalid JSON, validation failures, unknown device codes, and successful telemetry writes. Bad messages are skipped so the listener can continue.

To test topic-derived device codes without a broker, send `X-MQTT-Topic`:

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

Production mode A: process-capable server

Run `php artisan mqtt:listen` under Supervisor, systemd, a container process manager, or an equivalent always-on worker. Restart it on deploys and configure log retention.

Production mode B: shared hosting or low-cost hosting

Many shared PHP hosts do not allow permanent processes. In that case, use an external MQTT bridge, gateway, Node-RED flow, ThingsBoard integration, broker webhook, or small worker service to subscribe to MQTT and POST JSON to `POST /api/ingest/telemetry` with the `X-Ingestion-Secret` header.

## API

Session auth:

- `POST /api/login`
- `POST /api/logout`
- `GET /api/me`

Devices:

- `GET /api/devices`
- `GET /api/devices/{device}`
- `GET /api/devices/{device}/latest`
- `GET /api/devices/{device}/history`
- `GET /api/devices/{device}/history/export`

Admin:

- `GET|POST /api/admin/customers`
- `GET|PUT|DELETE /api/admin/customers/{customer}`
- `GET|POST /api/admin/users`
- `PUT|DELETE /api/admin/users/{user}`
- `POST /api/admin/users/{user}/reset-password`
- `GET|POST /api/admin/devices`
- `GET|PUT|DELETE /api/admin/devices/{device}`
- `GET /api/admin/devices/{device}/raw-telemetry`

Ingestion:

- `POST /api/ingest/telemetry`

Logged-in users only receive devices where `devices.customer_id` matches their `users.customer_id`.

Simple MVP rate limits are enabled for login and ingestion. Tune these values in `.env` if needed:

```dotenv
LOGIN_RATE_LIMIT_PER_MINUTE=5
INGESTION_RATE_LIMIT_PER_MINUTE=120
```

## Production Checklist

- Set `APP_DEBUG=false`.
- Use a strong, random `INGESTION_SECRET`.
- Serve the dashboard over HTTPS.
- Run `npm run build`.
- Verify `manifest.webmanifest` and `/sw.js` are reachable.
- Confirm the PWA install prompt works on a target mobile or desktop browser.
- Confirm offline fallback appears and does not show stale telemetry.
- Run `php artisan config:cache route:cache view:cache`.
- Confirm whether `php artisan mqtt:listen` can run continuously on the target host; if not, use an external MQTT bridge that posts to `POST /api/ingest/telemetry`.

## Real Payload Adjustment

When the real device JSON arrives, update the field map in:

```text
app/Services/Telemetry/TelemetryPayloadParser.php
```

Controllers, models, database schema, MQTT handling, and frontend components do not need to change unless the business fields themselves change.

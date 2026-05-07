# Device Monitoring Dashboard MVP

Laravel + MySQL backend with a React, TypeScript, Vite, Tailwind CSS frontend for customer-owned hardware device monitoring.

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

## Telemetry Ingestion

The frontend never connects to MQTT. It only reads Laravel APIs. Telemetry can enter through the HTTP endpoint or the MQTT listener; both paths use the same parser and ingestion service.

For now, ingestion is protected by `INGESTION_SECRET` through the `X-Ingestion-Secret` header. The authentication code is isolated so it can later support per-device API keys without changing controllers or the frontend.

Expected temporary payload:

```json
{
  "device_code": "device-001",
  "temperature_1": 24.5,
  "temperature_2": 25.1,
  "temperature_3": 26.0,
  "temperature_4": 24.8,
  "door_status": "closed",
  "pf_status": "normal",
  "timestamp": "2026-05-07T10:20:00Z"
}
```

Test HTTP ingestion:

```bash
curl -X POST http://localhost:8000/api/ingest/telemetry \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-Ingestion-Secret: change-this-local-secret" \
  -d '{
    "device_code": "device-001",
    "temperature_1": 24.5,
    "temperature_2": 25.1,
    "temperature_3": 26.0,
    "temperature_4": 24.8,
    "door_status": "closed",
    "pf_status": "normal",
    "timestamp": "2026-05-07T10:20:00Z"
  }'
```

## MQTT Listener

Set these `.env` values for your broker:

```dotenv
MQTT_HOST=127.0.0.1
MQTT_PORT=1883
MQTT_USERNAME=
MQTT_PASSWORD=
MQTT_TOPIC=devices/+/telemetry
MQTT_USE_TLS=false
```

Run in development:

```bash
php artisan mqtt:listen
```

For a single-message test:

```bash
php artisan mqtt:listen --once
```

Normal shared PHP hosting may not allow permanent processes. In that case, run an external MQTT bridge that posts device JSON to `POST /api/ingest/telemetry` with the `X-Ingestion-Secret` header.

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
- Run `php artisan config:cache route:cache view:cache`.
- Confirm whether `php artisan mqtt:listen` can run continuously on the target host; if not, use an external MQTT bridge that posts to `POST /api/ingest/telemetry`.

## Real Payload Adjustment

When the real device JSON arrives, update the field map in:

```text
app/Services/Telemetry/TelemetryPayloadParser.php
```

Controllers, models, database schema, MQTT handling, and frontend components do not need to change unless the business fields themselves change.

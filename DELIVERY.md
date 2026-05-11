# Delivery Notes

## Complete

- Laravel API for login, customer-scoped refrigerator access, admin management, telemetry ingestion, alarms, history filters, CSV export, and raw telemetry inspection.
- React/TypeScript/Tailwind Persian RTL dashboard with customer and admin flows.
- MQTT-ready parser/listener with invalid JSON handling and topic-derived device code support.
- Real factory payload structure integrated: `id`, `temp1`, `temp2`, `temp3`, `temp4`, `door`, and `pf`.
- Factory alarm codes integrated for per-sensor high/low temperature alarms: `ot1` to `ot4`, `ut1` to `ut4`, plus `pf` and `DOOR`.
- Fresh database schema and seeder for demo delivery.
- Installable PWA shell with manifest, icons, service worker, and RTL offline fallback.

## Configurable

- Database connection in `.env`.
- Temperature thresholds, door alarm behavior, offline timeout, login throttling, and ingestion throttling.
- `INGESTION_SECRET`.
- MQTT host, port, token, username/password fallback, topic, QoS, TLS, client id, and optional topic regex.
- Door/PF boolean meaning through `DOOR_TRUE_MEANS_OPEN` and `PF_TRUE_MEANS_FAULT`.
- Seconds-level offline threshold through `OFFLINE_AFTER_SECONDS`.

## Data Still Needed From Employer/Customer

- Production MQTT token in `.env`.
- Real refrigerator device ids added as `device_code` in the admin panel.
- Real client, user, and device list.
- Final confirmation of PF boolean meaning.
- Final confirmation of door boolean meaning.
- Confirmation whether the MQTT token allows backend subscription or only device publish.

The integrated factory MQTT details are:

- Host: `185.105.239.74`
- Port: `1883`
- Protocol: MQTT over TCP without TLS
- Topic: `v1/devices/me/telemetry`
- Payload id mapping: JSON `id` must match the refrigerator `device_code`
- Expected interval: every 5 seconds

## Deployment Notes

- Use HTTPS in production.
- Run `npm run build` before deployment.
- Run Laravel cache commands after final `.env` is set.
- Put the real MQTT token only in `.env`; do not commit it.
- Add the real factory module ids as refrigerator `device_code` values before go-live.
- Choose the MQTT deployment mode before go-live:
  - always-on process with Supervisor/systemd/container worker, or
  - external MQTT bridge/HTTP forwarding for shared hosting.
- The device publishes to `v1/devices/me/telemetry`. The backend can subscribe to this topic only if the MQTT broker permits a server-side subscriber with the provided token/credentials. If the token is device-only, use broker-side bridge/webhook, Node-RED, ThingsBoard/API forwarding, or factory HTTP forwarding to `/api/ingest/telemetry`.
- Configure database backup and log retention.

## Known Limitations

- No push notifications yet.
- No SMS or email alerting yet.
- No advanced compliance reports yet.
- No real customer data, production MQTT token, or production device list is included.

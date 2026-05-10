# Delivery Notes

## Complete

- Laravel API for login, customer-scoped refrigerator access, admin management, telemetry ingestion, alarms, history filters, CSV export, and raw telemetry inspection.
- React/TypeScript/Tailwind Persian RTL dashboard with customer and admin flows.
- MQTT-ready parser/listener with invalid JSON handling and topic-derived device code support.
- Fresh database schema and seeder for demo delivery.
- Installable PWA shell with manifest, icons, service worker, and RTL offline fallback.

## Configurable

- Database connection in `.env`.
- Temperature thresholds, door alarm behavior, offline timeout, login throttling, and ingestion throttling.
- `INGESTION_SECRET`.
- MQTT host, port, credentials, topic, QoS, TLS, client id, and optional topic regex.

## Data Still Needed From Employer/Customer

- Real MQTT host, port, username, password, and topic.
- Real JSON sample from the device firmware.
- Real refrigerator device codes.
- Real client, user, and device list.
- Meaning of PF values.
- Meaning of door values.
- Expected telemetry interval.

## Deployment Notes

- Use HTTPS in production.
- Run `npm run build` before deployment.
- Run Laravel cache commands after final `.env` is set.
- Choose the MQTT deployment mode before go-live:
  - always-on process with Supervisor/systemd/container worker, or
  - external MQTT bridge/HTTP forwarding for shared hosting.
- Configure database backup and log retention.

## Known Limitations

- No push notifications yet.
- No SMS or email alerting yet.
- No advanced compliance reports yet.
- No real customer, broker, or device data is included.

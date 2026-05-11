-- Blood Refrigerator Monitoring Dashboard
-- Ready-to-import MySQL schema and demo data.
-- This file is an additional delivery option; Laravel migrations remain the recommended install path.
-- No production secrets, real customer data, real device list, or real MQTT token are included.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS=0;

DROP TABLE IF EXISTS `alarms`;
DROP TABLE IF EXISTS `telemetry`;
DROP TABLE IF EXISTS `devices`;
DROP TABLE IF EXISTS `failed_jobs`;
DROP TABLE IF EXISTS `job_batches`;
DROP TABLE IF EXISTS `jobs`;
DROP TABLE IF EXISTS `cache_locks`;
DROP TABLE IF EXISTS `cache`;
DROP TABLE IF EXISTS `sessions`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `customers`;
DROP TABLE IF EXISTS `migrations`;

CREATE TABLE `customers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contact_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` bigint unsigned DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `username` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'client',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_username_unique` (`username`),
  KEY `users_customer_id_foreign` (`customer_id`),
  CONSTRAINT `users_customer_id_foreign` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sessions` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_activity` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `cache` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` bigint NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `cache_locks` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` bigint NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_locks_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempts` smallint unsigned NOT NULL,
  `reserved_at` int unsigned DEFAULT NULL,
  `available_at` int unsigned NOT NULL,
  `created_at` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `job_batches` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_jobs` int NOT NULL,
  `pending_jobs` int NOT NULL,
  `failed_jobs` int NOT NULL,
  `failed_job_ids` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `options` mediumtext COLLATE utf8mb4_unicode_ci,
  `cancelled_at` int DEFAULT NULL,
  `created_at` int NOT NULL,
  `finished_at` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `failed_jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `connection` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `queue` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `exception` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `devices` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` bigint unsigned NOT NULL,
  `device_code` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `serial_number` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `last_seen_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `devices_device_code_unique` (`device_code`),
  KEY `devices_customer_id_foreign` (`customer_id`),
  CONSTRAINT `devices_customer_id_foreign` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `telemetry` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `device_id` bigint unsigned NOT NULL,
  `temperature_1` decimal(8,2) DEFAULT NULL,
  `temperature_2` decimal(8,2) DEFAULT NULL,
  `temperature_3` decimal(8,2) DEFAULT NULL,
  `temperature_4` decimal(8,2) DEFAULT NULL,
  `door_status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pf_status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `raw_payload` json NOT NULL,
  `recorded_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `telemetry_recorded_at_index` (`recorded_at`),
  KEY `telemetry_device_id_recorded_at_index` (`device_id`, `recorded_at`),
  CONSTRAINT `telemetry_device_id_foreign` FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `alarms` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `device_id` bigint unsigned NOT NULL,
  `type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sensor_number` tinyint unsigned DEFAULT NULL,
  `severity` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` decimal(8,2) DEFAULT NULL,
  `threshold` decimal(8,2) DEFAULT NULL,
  `is_resolved` tinyint(1) NOT NULL DEFAULT '0',
  `resolved_at` timestamp NULL DEFAULT NULL,
  `triggered_at` timestamp NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `alarms_triggered_at_index` (`triggered_at`),
  KEY `alarms_device_id_type_is_resolved_index` (`device_id`, `type`, `is_resolved`),
  KEY `alarms_is_resolved_severity_index` (`is_resolved`, `severity`),
  KEY `alarms_device_code_resolved_index` (`device_id`, `code`, `is_resolved`),
  KEY `alarms_device_type_sensor_resolved_index` (`device_id`, `type`, `sensor_number`, `is_resolved`),
  CONSTRAINT `alarms_device_id_foreign` FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES
(1, '0001_01_01_000000_create_users_table', 1),
(2, '0001_01_01_000001_create_cache_table', 1),
(3, '0001_01_01_000002_create_jobs_table', 1),
(4, '2026_05_07_000001_create_devices_table', 1),
(5, '2026_05_07_000002_create_telemetry_table', 1),
(6, '2026_05_09_000001_create_alarms_table', 1),
(7, '2026_05_09_000002_add_admin_management_fields', 1),
(8, '2026_05_11_000001_add_factory_alarm_fields_to_alarms_table', 1);

INSERT INTO `customers` (`id`, `name`, `contact_name`, `phone`, `email`, `notes`, `created_at`, `updated_at`) VALUES
(1, 'مرکز انتقال خون نمونه', 'مسئول فنی نمونه', '021-00000000', 'demo@example.com', 'مشتری نمونه برای اجرای دمو و بررسی سامانه.', NOW(), NOW());

-- Demo password for both users is: password
-- The hash below is a valid bcrypt hash for "password".
INSERT INTO `users` (`id`, `customer_id`, `name`, `username`, `password`, `role`, `created_at`, `updated_at`) VALUES
(1, NULL, 'مدیر سامانه', 'admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', NOW(), NOW()),
(2, 1, 'کاربر نمونه', 'demo', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'client', NOW(), NOW());

INSERT INTO `devices` (`id`, `customer_id`, `device_code`, `name`, `serial_number`, `location`, `notes`, `last_seen_at`, `created_at`, `updated_at`) VALUES
(1, 1, 'device-001', 'یخچال خون شماره ۱', 'SN-BR-001', 'اتاق نگهداری خون', 'یخچال اصلی نمونه برای دمو.', NOW(), NOW(), NOW()),
(2, 1, 'device-002', 'یخچال خون شماره ۲', 'SN-BR-002', 'آزمایشگاه اورژانس', 'یخچال دوم نمونه با یک هشدار فعال برای نمایش دمو.', NOW(), NOW(), NOW());

INSERT INTO `telemetry` (`id`, `device_id`, `temperature_1`, `temperature_2`, `temperature_3`, `temperature_4`, `door_status`, `pf_status`, `raw_payload`, `recorded_at`, `created_at`, `updated_at`) VALUES
(1, 1, 4.10, 4.80, 5.20, 4.40, 'closed', 'normal', JSON_OBJECT('id', 'device-001', 'temp1', 4.10, 'temp2', 4.80, 'temp3', 5.20, 'temp4', 4.40, 'door', false, 'pf', false), DATE_SUB(NOW(), INTERVAL 75 MINUTE), NOW(), NOW()),
(2, 1, 4.08, 4.78, 5.18, 4.38, 'closed', 'normal', JSON_OBJECT('id', 'device-001', 'temp1', 4.08, 'temp2', 4.78, 'temp3', 5.18, 'temp4', 4.38, 'door', false, 'pf', false), DATE_SUB(NOW(), INTERVAL 70 MINUTE), NOW(), NOW()),
(3, 1, 4.06, 4.76, 5.16, 4.36, 'closed', 'normal', JSON_OBJECT('id', 'device-001', 'temp1', 4.06, 'temp2', 4.76, 'temp3', 5.16, 'temp4', 4.36, 'door', false, 'pf', false), DATE_SUB(NOW(), INTERVAL 65 MINUTE), NOW(), NOW()),
(4, 1, 4.04, 4.74, 5.14, 4.34, 'closed', 'normal', JSON_OBJECT('id', 'device-001', 'temp1', 4.04, 'temp2', 4.74, 'temp3', 5.14, 'temp4', 4.34, 'door', false, 'pf', false), DATE_SUB(NOW(), INTERVAL 60 MINUTE), NOW(), NOW()),
(5, 1, 4.02, 4.72, 5.12, 4.32, 'closed', 'normal', JSON_OBJECT('id', 'device-001', 'temp1', 4.02, 'temp2', 4.72, 'temp3', 5.12, 'temp4', 4.32, 'door', false, 'pf', false), DATE_SUB(NOW(), INTERVAL 55 MINUTE), NOW(), NOW()),
(6, 1, 4.00, 4.70, 5.10, 4.30, 'closed', 'normal', JSON_OBJECT('id', 'device-001', 'temp1', 4.00, 'temp2', 4.70, 'temp3', 5.10, 'temp4', 4.30, 'door', false, 'pf', false), DATE_SUB(NOW(), INTERVAL 50 MINUTE), NOW(), NOW()),
(7, 1, 3.98, 4.68, 5.08, 4.28, 'closed', 'normal', JSON_OBJECT('id', 'device-001', 'temp1', 3.98, 'temp2', 4.68, 'temp3', 5.08, 'temp4', 4.28, 'door', false, 'pf', false), DATE_SUB(NOW(), INTERVAL 45 MINUTE), NOW(), NOW()),
(8, 1, 3.96, 4.66, 5.06, 4.26, 'closed', 'normal', JSON_OBJECT('id', 'device-001', 'temp1', 3.96, 'temp2', 4.66, 'temp3', 5.06, 'temp4', 4.26, 'door', false, 'pf', false), DATE_SUB(NOW(), INTERVAL 40 MINUTE), NOW(), NOW()),
(9, 1, 3.94, 4.64, 5.04, 4.24, 'closed', 'normal', JSON_OBJECT('id', 'device-001', 'temp1', 3.94, 'temp2', 4.64, 'temp3', 5.04, 'temp4', 4.24, 'door', false, 'pf', false), DATE_SUB(NOW(), INTERVAL 35 MINUTE), NOW(), NOW()),
(10, 1, 3.92, 4.62, 5.02, 4.22, 'closed', 'normal', JSON_OBJECT('id', 'device-001', 'temp1', 3.92, 'temp2', 4.62, 'temp3', 5.02, 'temp4', 4.22, 'door', false, 'pf', false), DATE_SUB(NOW(), INTERVAL 30 MINUTE), NOW(), NOW()),
(11, 1, 3.90, 4.60, 5.00, 4.20, 'closed', 'normal', JSON_OBJECT('id', 'device-001', 'temp1', 3.90, 'temp2', 4.60, 'temp3', 5.00, 'temp4', 4.20, 'door', false, 'pf', false), DATE_SUB(NOW(), INTERVAL 25 MINUTE), NOW(), NOW()),
(12, 1, 3.88, 4.58, 4.98, 4.18, 'closed', 'normal', JSON_OBJECT('id', 'device-001', 'temp1', 3.88, 'temp2', 4.58, 'temp3', 4.98, 'temp4', 4.18, 'door', false, 'pf', false), DATE_SUB(NOW(), INTERVAL 20 MINUTE), NOW(), NOW()),
(13, 1, 3.86, 4.56, 4.96, 4.16, 'open', 'normal', JSON_OBJECT('id', 'device-001', 'temp1', 3.86, 'temp2', 4.56, 'temp3', 4.96, 'temp4', 4.16, 'door', true, 'pf', false), DATE_SUB(NOW(), INTERVAL 15 MINUTE), NOW(), NOW()),
(14, 1, 3.84, 4.54, 4.94, 4.14, 'closed', 'normal', JSON_OBJECT('id', 'device-001', 'temp1', 3.84, 'temp2', 4.54, 'temp3', 4.94, 'temp4', 4.14, 'door', false, 'pf', false), DATE_SUB(NOW(), INTERVAL 10 MINUTE), NOW(), NOW()),
(15, 1, 3.82, 4.52, 4.92, 4.12, 'closed', 'normal', JSON_OBJECT('id', 'device-001', 'temp1', 3.82, 'temp2', 4.52, 'temp3', 4.92, 'temp4', 4.12, 'door', false, 'pf', false), DATE_SUB(NOW(), INTERVAL 5 MINUTE), NOW(), NOW()),
(16, 1, 3.80, 4.50, 4.90, 4.10, 'closed', 'normal', JSON_OBJECT('id', 'device-001', 'temp1', 3.80, 'temp2', 4.50, 'temp3', 4.90, 'temp4', 4.10, 'door', false, 'pf', false), NOW(), NOW(), NOW()),
(17, 2, 4.30, 5.00, 5.40, 4.60, 'closed', 'normal', JSON_OBJECT('id', 'device-002', 'temp1', 4.30, 'temp2', 5.00, 'temp3', 5.40, 'temp4', 4.60, 'door', false, 'pf', false), DATE_SUB(NOW(), INTERVAL 75 MINUTE), NOW(), NOW()),
(18, 2, 4.28, 4.98, 5.38, 4.58, 'closed', 'normal', JSON_OBJECT('id', 'device-002', 'temp1', 4.28, 'temp2', 4.98, 'temp3', 5.38, 'temp4', 4.58, 'door', false, 'pf', false), DATE_SUB(NOW(), INTERVAL 70 MINUTE), NOW(), NOW()),
(19, 2, 4.26, 4.96, 5.36, 4.56, 'closed', 'normal', JSON_OBJECT('id', 'device-002', 'temp1', 4.26, 'temp2', 4.96, 'temp3', 5.36, 'temp4', 4.56, 'door', false, 'pf', false), DATE_SUB(NOW(), INTERVAL 65 MINUTE), NOW(), NOW()),
(20, 2, 4.24, 4.94, 5.34, 4.54, 'closed', 'normal', JSON_OBJECT('id', 'device-002', 'temp1', 4.24, 'temp2', 4.94, 'temp3', 5.34, 'temp4', 4.54, 'door', false, 'pf', false), DATE_SUB(NOW(), INTERVAL 60 MINUTE), NOW(), NOW()),
(21, 2, 4.22, 4.92, 5.32, 4.52, 'closed', 'normal', JSON_OBJECT('id', 'device-002', 'temp1', 4.22, 'temp2', 4.92, 'temp3', 5.32, 'temp4', 4.52, 'door', false, 'pf', false), DATE_SUB(NOW(), INTERVAL 55 MINUTE), NOW(), NOW()),
(22, 2, 4.20, 4.90, 5.30, 4.50, 'closed', 'normal', JSON_OBJECT('id', 'device-002', 'temp1', 4.20, 'temp2', 4.90, 'temp3', 5.30, 'temp4', 4.50, 'door', false, 'pf', false), DATE_SUB(NOW(), INTERVAL 50 MINUTE), NOW(), NOW()),
(23, 2, 4.18, 4.88, 5.28, 4.48, 'closed', 'normal', JSON_OBJECT('id', 'device-002', 'temp1', 4.18, 'temp2', 4.88, 'temp3', 5.28, 'temp4', 4.48, 'door', false, 'pf', false), DATE_SUB(NOW(), INTERVAL 45 MINUTE), NOW(), NOW()),
(24, 2, 4.16, 4.86, 5.26, 4.46, 'closed', 'normal', JSON_OBJECT('id', 'device-002', 'temp1', 4.16, 'temp2', 4.86, 'temp3', 5.26, 'temp4', 4.46, 'door', false, 'pf', false), DATE_SUB(NOW(), INTERVAL 40 MINUTE), NOW(), NOW()),
(25, 2, 4.14, 4.84, 5.24, 4.44, 'closed', 'warning', JSON_OBJECT('id', 'device-002', 'temp1', 4.14, 'temp2', 4.84, 'temp3', 5.24, 'temp4', 4.44, 'door', false, 'pf', true), DATE_SUB(NOW(), INTERVAL 35 MINUTE), NOW(), NOW()),
(26, 2, 4.12, 4.82, 5.22, 4.42, 'closed', 'normal', JSON_OBJECT('id', 'device-002', 'temp1', 4.12, 'temp2', 4.82, 'temp3', 5.22, 'temp4', 4.42, 'door', false, 'pf', false), DATE_SUB(NOW(), INTERVAL 30 MINUTE), NOW(), NOW()),
(27, 2, 4.10, 4.80, 5.20, 4.40, 'closed', 'normal', JSON_OBJECT('id', 'device-002', 'temp1', 4.10, 'temp2', 4.80, 'temp3', 5.20, 'temp4', 4.40, 'door', false, 'pf', false), DATE_SUB(NOW(), INTERVAL 25 MINUTE), NOW(), NOW()),
(28, 2, 4.08, 4.78, 5.18, 4.38, 'closed', 'normal', JSON_OBJECT('id', 'device-002', 'temp1', 4.08, 'temp2', 4.78, 'temp3', 5.18, 'temp4', 4.38, 'door', false, 'pf', false), DATE_SUB(NOW(), INTERVAL 20 MINUTE), NOW(), NOW()),
(29, 2, 4.06, 4.76, 5.16, 4.36, 'closed', 'normal', JSON_OBJECT('id', 'device-002', 'temp1', 4.06, 'temp2', 4.76, 'temp3', 5.16, 'temp4', 4.36, 'door', false, 'pf', false), DATE_SUB(NOW(), INTERVAL 15 MINUTE), NOW(), NOW()),
(30, 2, 4.04, 4.74, 5.14, 4.34, 'closed', 'normal', JSON_OBJECT('id', 'device-002', 'temp1', 4.04, 'temp2', 4.74, 'temp3', 5.14, 'temp4', 4.34, 'door', false, 'pf', false), DATE_SUB(NOW(), INTERVAL 10 MINUTE), NOW(), NOW()),
(31, 2, 4.02, 4.72, 5.12, 4.32, 'closed', 'normal', JSON_OBJECT('id', 'device-002', 'temp1', 4.02, 'temp2', 4.72, 'temp3', 5.12, 'temp4', 4.32, 'door', false, 'pf', false), DATE_SUB(NOW(), INTERVAL 5 MINUTE), NOW(), NOW()),
(32, 2, 4.00, 4.70, 5.10, 4.30, 'closed', 'warning', JSON_OBJECT('id', 'device-002', 'temp1', 4.00, 'temp2', 4.70, 'temp3', 5.10, 'temp4', 4.30, 'door', false, 'pf', true), NOW(), NOW(), NOW());

INSERT INTO `alarms` (`id`, `device_id`, `type`, `code`, `sensor_number`, `severity`, `message`, `value`, `threshold`, `is_resolved`, `resolved_at`, `triggered_at`, `created_at`, `updated_at`) VALUES
(1, 1, 'DOOR_OPEN', 'DOOR', NULL, 'warning', 'درب یخچال باز است.', NULL, NULL, 1, DATE_SUB(NOW(), INTERVAL 10 MINUTE), DATE_SUB(NOW(), INTERVAL 15 MINUTE), NOW(), NOW()),
(2, 2, 'PF_FAULT', 'pf', NULL, 'warning', 'وضعیت PF نشان‌دهنده قطع برق یا خطا است.', NULL, NULL, 1, DATE_SUB(NOW(), INTERVAL 30 MINUTE), DATE_SUB(NOW(), INTERVAL 35 MINUTE), NOW(), NOW()),
(3, 2, 'PF_FAULT', 'pf', NULL, 'warning', 'وضعیت PF نشان‌دهنده قطع برق یا خطا است.', NULL, NULL, 0, NULL, NOW(), NOW(), NOW());

ALTER TABLE `customers` AUTO_INCREMENT = 2;
ALTER TABLE `users` AUTO_INCREMENT = 3;
ALTER TABLE `devices` AUTO_INCREMENT = 3;
ALTER TABLE `telemetry` AUTO_INCREMENT = 33;
ALTER TABLE `alarms` AUTO_INCREMENT = 4;
ALTER TABLE `migrations` AUTO_INCREMENT = 9;

SET FOREIGN_KEY_CHECKS=1;

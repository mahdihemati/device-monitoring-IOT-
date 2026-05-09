<?php

return [
    'host' => env('MQTT_HOST', '127.0.0.1'),
    'port' => env('MQTT_PORT', 1883),
    'username' => env('MQTT_USERNAME'),
    'password' => env('MQTT_PASSWORD'),
    'client_id' => env('MQTT_CLIENT_ID', 'device-monitoring-dashboard'),
    'topic' => env('MQTT_TOPIC', 'devices/+/telemetry'),
    'qos' => env('MQTT_QOS', 0),
    'keep_alive' => env('MQTT_KEEP_ALIVE', 60),
    'use_tls' => env('MQTT_USE_TLS', false),
    'device_code_topic_regex' => env('MQTT_DEVICE_CODE_TOPIC_REGEX'),
    'device_code_topic_patterns' => [
        'refrigerators/{device_code}/telemetry',
        'devices/{device_code}/telemetry',
        'clients/{client_code}/refrigerators/{device_code}/telemetry',
    ],
];

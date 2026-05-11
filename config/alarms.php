<?php

return [
    'temperature' => [
        'min_celsius' => (float) env('TEMP_MIN_CELSIUS', 2),
        'max_celsius' => (float) env('TEMP_MAX_CELSIUS', 6),
    ],

    'door_open_is_alarm' => (bool) env('DOOR_OPEN_IS_ALARM', true),

    'door_true_means_open' => (bool) env('DOOR_TRUE_MEANS_OPEN', true),

    'pf_true_means_fault' => (bool) env('PF_TRUE_MEANS_FAULT', true),

    'offline_after_seconds' => env('OFFLINE_AFTER_SECONDS') !== null
        ? (int) env('OFFLINE_AFTER_SECONDS')
        : null,

    'offline_after_minutes' => (int) env('OFFLINE_AFTER_MINUTES', 1),
];

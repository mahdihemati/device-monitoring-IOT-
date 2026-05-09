<?php

return [
    'temperature' => [
        'min_celsius' => (float) env('TEMP_MIN_CELSIUS', 2),
        'max_celsius' => (float) env('TEMP_MAX_CELSIUS', 6),
    ],

    'door_open_is_alarm' => (bool) env('DOOR_OPEN_IS_ALARM', true),

    'offline_after_minutes' => (int) env('OFFLINE_AFTER_MINUTES', 5),
];

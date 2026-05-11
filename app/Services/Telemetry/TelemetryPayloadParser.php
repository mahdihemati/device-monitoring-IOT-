<?php

namespace App\Services\Telemetry;

use Carbon\CarbonImmutable;
use Closure;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class TelemetryPayloadParser
{
    /**
     * Update this map when the real device JSON format arrives.
     * Values may be plain keys, Laravel dot paths, or common aliases.
     */
    private array $fieldMap = [
        'device_code' => [
            'id',
            'device_code',
            'device_id',
            'serial',
            'refrigerator_id',
            'refrigerator_code',
            'device.code',
            'device.id',
            'refrigerator.code',
            'refrigerator.id',
        ],
        'temperature_1' => ['temperature_1', 't1', 'temp1', 'sensor1', 'sensors.0', 'sensors.1', 'sensors.sensor1', 'temperatures.0', 'temperatures.1'],
        'temperature_2' => ['temperature_2', 't2', 'temp2', 'sensor2', 'sensors.1', 'sensors.2', 'sensors.sensor2', 'temperatures.1', 'temperatures.2'],
        'temperature_3' => ['temperature_3', 't3', 'temp3', 'sensor3', 'sensors.2', 'sensors.3', 'sensors.sensor3', 'temperatures.2', 'temperatures.3'],
        'temperature_4' => ['temperature_4', 't4', 'temp4', 'sensor4', 'sensors.3', 'sensors.4', 'sensors.sensor4', 'temperatures.3', 'temperatures.4'],
        'door_status' => ['door_status', 'door', 'door_state'],
        'pf_status' => ['pf_status', 'pf', 'power_failure', 'power_status'],
        'timestamp' => ['timestamp', 'time', 'recorded_at'],
    ];

    public function __construct(
        private readonly TopicDeviceCodeExtractor $topicDeviceCodeExtractor,
    ) {
    }

    public function parse(array $payload, ?string $topic = null): ParsedTelemetryData
    {
        $mapped = [];

        foreach ($this->fieldMap as $target => $sources) {
            $mapped[$target] = $this->firstMappedValue($payload, (array) $sources);
        }

        if (! filled($mapped['device_code'] ?? null)) {
            $mapped['device_code'] = $this->topicDeviceCodeExtractor->extract($topic ?? Arr::get($payload, 'topic'));
        }

        $validated = Validator::make($mapped, [
            'device_code' => ['required', 'string', 'max:255'],
            'temperature_1' => ['nullable', 'numeric'],
            'temperature_2' => ['nullable', 'numeric'],
            'temperature_3' => ['nullable', 'numeric'],
            'temperature_4' => ['nullable', 'numeric'],
            'door_status' => $this->statusRules(),
            'pf_status' => $this->statusRules(),
            'timestamp' => ['nullable', 'date'],
        ])->validate();

        return new ParsedTelemetryData(
            deviceCode: trim($validated['device_code']),
            temperature1: $this->nullableFloat($validated['temperature_1'] ?? null),
            temperature2: $this->nullableFloat($validated['temperature_2'] ?? null),
            temperature3: $this->nullableFloat($validated['temperature_3'] ?? null),
            temperature4: $this->nullableFloat($validated['temperature_4'] ?? null),
            doorStatus: $this->normalizeDoorStatus($validated['door_status'] ?? null),
            pfStatus: $this->normalizePfStatus($validated['pf_status'] ?? null),
            recordedAt: $this->nullableTimestamp($validated['timestamp'] ?? null),
            rawPayload: $payload,
        );
    }

    private function firstMappedValue(array $payload, array $sources): mixed
    {
        foreach ($sources as $source) {
            if (Arr::has($payload, $source)) {
                return Arr::get($payload, $source);
            }
        }

        return null;
    }

    private function nullableFloat(mixed $value): ?float
    {
        return $value === null || $value === '' ? null : (float) $value;
    }

    private function statusRules(): array
    {
        return [
            'nullable',
            function (string $attribute, mixed $value, Closure $fail): void {
                if (! is_scalar($value)) {
                    $fail("The {$attribute} must be a string, number, or boolean.");

                    return;
                }

                if (mb_strlen(trim((string) $value)) > 50) {
                    $fail("The {$attribute} must not be greater than 50 characters.");
                }
            },
        ];
    }

    private function normalizeDoorStatus(mixed $value): ?string
    {
        $status = $this->statusToken($value);

        if ($status === null) {
            return null;
        }

        return match ($status) {
            '1', 'true', 'yes', 'y', 'on' => $this->doorTrueMeansOpen() ? 'open' : 'closed',
            '0', 'false', 'no', 'n', 'off' => $this->doorTrueMeansOpen() ? 'closed' : 'open',
            'open', 'opened' => 'open',
            'closed', 'close' => 'closed',
            default => $status,
        };
    }

    private function normalizePfStatus(mixed $value): ?string
    {
        $status = $this->statusToken($value);

        if ($status === null) {
            return null;
        }

        return match ($status) {
            '1', 'true', 'yes', 'y', 'on' => $this->pfTrueMeansFault() ? 'fault' : 'normal',
            '0', 'false', 'no', 'n', 'off' => $this->pfTrueMeansFault() ? 'normal' : 'fault',
            'ok', 'okay', 'good', 'healthy', 'normal' => 'normal',
            'fault', 'failed', 'failure', 'fail', 'error', 'alarm', 'trip', 'tripped' => 'fault',
            'warn', 'warning' => 'warning',
            default => $status,
        };
    }

    private function statusToken(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_bool($value)) {
            return $value ? 'true' : 'false';
        }

        return Str::lower(trim((string) $value));
    }

    private function nullableTimestamp(mixed $value): ?CarbonImmutable
    {
        return filled($value) ? CarbonImmutable::parse($value) : null;
    }

    private function doorTrueMeansOpen(): bool
    {
        return (bool) config('alarms.door_true_means_open', true);
    }

    private function pfTrueMeansFault(): bool
    {
        return (bool) config('alarms.pf_true_means_fault', true);
    }
}

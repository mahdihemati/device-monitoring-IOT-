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
     * Values may be plain keys or Laravel dot paths for nested payloads.
     */
    private array $fieldMap = [
        'device_code' => 'device_code',
        'temperature_1' => 'temperature_1',
        'temperature_2' => 'temperature_2',
        'temperature_3' => 'temperature_3',
        'temperature_4' => 'temperature_4',
        'door_status' => 'door_status',
        'pf_status' => 'pf_status',
        'timestamp' => 'timestamp',
    ];

    public function parse(array $payload): ParsedTelemetryData
    {
        $mapped = [];

        foreach ($this->fieldMap as $target => $source) {
            $mapped[$target] = Arr::get($payload, $source);
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
            '1', 'true', 'yes', 'y', 'on', 'open', 'opened' => 'open',
            '0', 'false', 'no', 'n', 'off', 'closed', 'close' => 'closed',
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
            '1', 'true', 'yes', 'y', 'on', 'ok', 'okay', 'good', 'healthy', 'normal' => 'normal',
            '0', 'false', 'no', 'n', 'off', 'fault', 'failed', 'failure', 'fail', 'error', 'alarm', 'trip', 'tripped' => 'fault',
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
}

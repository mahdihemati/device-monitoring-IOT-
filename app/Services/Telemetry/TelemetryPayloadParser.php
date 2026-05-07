<?php

namespace App\Services\Telemetry;

use Carbon\CarbonImmutable;
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
            'door_status' => ['nullable', 'string', 'max:50'],
            'pf_status' => ['nullable', 'string', 'max:50'],
            'timestamp' => ['nullable', 'date'],
        ])->validate();

        return new ParsedTelemetryData(
            deviceCode: trim($validated['device_code']),
            temperature1: $this->nullableFloat($validated['temperature_1'] ?? null),
            temperature2: $this->nullableFloat($validated['temperature_2'] ?? null),
            temperature3: $this->nullableFloat($validated['temperature_3'] ?? null),
            temperature4: $this->nullableFloat($validated['temperature_4'] ?? null),
            doorStatus: $this->normalizeStatus($validated['door_status'] ?? null),
            pfStatus: $this->normalizeStatus($validated['pf_status'] ?? null),
            recordedAt: $this->nullableTimestamp($validated['timestamp'] ?? null),
            rawPayload: $payload,
        );
    }

    private function nullableFloat(mixed $value): ?float
    {
        return $value === null || $value === '' ? null : (float) $value;
    }

    private function normalizeStatus(?string $value): ?string
    {
        return filled($value) ? Str::lower(trim($value)) : null;
    }

    private function nullableTimestamp(mixed $value): ?CarbonImmutable
    {
        return filled($value) ? CarbonImmutable::parse($value) : null;
    }
}

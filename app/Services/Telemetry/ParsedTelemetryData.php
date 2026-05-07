<?php

namespace App\Services\Telemetry;

use Carbon\CarbonImmutable;

final readonly class ParsedTelemetryData
{
    public function __construct(
        public string $deviceCode,
        public ?float $temperature1,
        public ?float $temperature2,
        public ?float $temperature3,
        public ?float $temperature4,
        public ?string $doorStatus,
        public ?string $pfStatus,
        public ?CarbonImmutable $recordedAt,
        public array $rawPayload,
    ) {
    }

    public function telemetryAttributes(): array
    {
        return [
            'temperature_1' => $this->temperature1,
            'temperature_2' => $this->temperature2,
            'temperature_3' => $this->temperature3,
            'temperature_4' => $this->temperature4,
            'door_status' => $this->doorStatus,
            'pf_status' => $this->pfStatus,
            'raw_payload' => $this->rawPayload,
        ];
    }
}

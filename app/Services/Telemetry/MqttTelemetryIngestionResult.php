<?php

namespace App\Services\Telemetry;

use App\Models\Telemetry;

final readonly class MqttTelemetryIngestionResult
{
    private function __construct(
        public string $status,
        public string $message,
        public ?Telemetry $telemetry = null,
    ) {
    }

    public static function stored(Telemetry $telemetry): self
    {
        return new self(
            status: 'stored',
            message: "Stored telemetry #{$telemetry->id} from {$telemetry->device->device_code}.",
            telemetry: $telemetry,
        );
    }

    public static function ignored(string $message): self
    {
        return new self(status: 'ignored', message: $message);
    }

    public static function failed(string $message): self
    {
        return new self(status: 'failed', message: $message);
    }

    public function wasStored(): bool
    {
        return $this->status === 'stored';
    }
}

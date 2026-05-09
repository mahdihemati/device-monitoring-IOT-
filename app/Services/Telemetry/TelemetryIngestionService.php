<?php

namespace App\Services\Telemetry;

use App\Models\Device;
use App\Models\Telemetry;
use App\Services\Alarms\AlarmEvaluationService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TelemetryIngestionService
{
    public function __construct(
        private readonly TelemetryPayloadParser $parser,
        private readonly AlarmEvaluationService $alarmEvaluationService,
    ) {
    }

    public function ingest(array $payload): Telemetry
    {
        $data = $this->parser->parse($payload);

        return DB::transaction(function () use ($data): Telemetry {
            $device = Device::query()
                ->where('device_code', $data->deviceCode)
                ->lockForUpdate()
                ->first();

            if (! $device) {
                throw ValidationException::withMessages([
                    'device_code' => ['No device exists for this device_code.'],
                ]);
            }

            $recordedAt = $data->recordedAt ?? now();

            $telemetry = $device->telemetry()->create([
                ...$data->telemetryAttributes(),
                'recorded_at' => $recordedAt,
            ]);

            $device->forceFill([
                'last_seen_at' => $recordedAt,
            ])->save();

            $this->alarmEvaluationService->evaluateTelemetry($device, $telemetry);

            return $telemetry->load('device');
        });
    }
}

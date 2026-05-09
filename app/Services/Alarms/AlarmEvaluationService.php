<?php

namespace App\Services\Alarms;

use App\Models\Alarm;
use App\Models\Device;
use App\Models\Telemetry;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class AlarmEvaluationService
{
    public function evaluateTelemetry(Device $device, Telemetry $telemetry): void
    {
        $this->evaluateTemperatures($device, $telemetry);
        $this->evaluateSensorCompleteness($device, $telemetry);
        $this->evaluateDoor($device, $telemetry);
        $this->evaluatePf($device, $telemetry);
        $this->evaluateConnectivity($device);
    }

    public function evaluateConnectivity(Device $device): void
    {
        if ($this->isOffline($device)) {
            $this->activate(
                device: $device,
                type: Alarm::TYPE_DEVICE_OFFLINE,
                severity: Alarm::SEVERITY_CRITICAL,
                message: 'Refrigerator is offline or has not reported telemetry recently.',
                triggeredAt: now(),
            );

            return;
        }

        $this->resolve($device, Alarm::TYPE_DEVICE_OFFLINE);
    }

    /**
     * @param  Collection<int, Device>  $devices
     */
    public function evaluateConnectivityForDevices(Collection $devices): void
    {
        $devices->each(function (Device $device): void {
            $this->evaluateConnectivity($device);
        });
    }

    public function isOffline(Device $device): bool
    {
        if (! $device->last_seen_at) {
            return true;
        }

        return $device->last_seen_at->lt(now()->subMinutes($this->offlineAfterMinutes()));
    }

    public function overallStatus(Device $device): string
    {
        if ($this->isOffline($device)) {
            return 'offline';
        }

        $activeAlarms = $device->relationLoaded('activeAlarms')
            ? $device->activeAlarms
            : $device->activeAlarms()->get();

        if ($activeAlarms->contains('severity', Alarm::SEVERITY_CRITICAL)) {
            return 'critical';
        }

        if ($activeAlarms->contains('severity', Alarm::SEVERITY_WARNING)) {
            return 'warning';
        }

        return 'normal';
    }

    private function evaluateTemperatures(Device $device, Telemetry $telemetry): void
    {
        $readings = $this->sensorReadings($telemetry);
        $max = $this->maxTemperature();
        $min = $this->minTemperature();

        $highReadings = collect($readings)
            ->filter(fn (?float $value): bool => $value !== null && $value > $max);

        if ($highReadings->isNotEmpty()) {
            $highest = $highReadings->max();
            $this->activate(
                device: $device,
                type: Alarm::TYPE_HIGH_TEMPERATURE,
                severity: Alarm::SEVERITY_CRITICAL,
                message: sprintf(
                    'High temperature on %s. Highest reading %.1f C exceeds %.1f C.',
                    $highReadings->keys()->implode(', '),
                    $highest,
                    $max,
                ),
                value: $highest,
                threshold: $max,
                triggeredAt: $telemetry->recorded_at,
            );
        } else {
            $this->resolve($device, Alarm::TYPE_HIGH_TEMPERATURE);
        }

        $lowReadings = collect($readings)
            ->filter(fn (?float $value): bool => $value !== null && $value < $min);

        if ($lowReadings->isNotEmpty()) {
            $lowest = $lowReadings->min();
            $this->activate(
                device: $device,
                type: Alarm::TYPE_LOW_TEMPERATURE,
                severity: Alarm::SEVERITY_CRITICAL,
                message: sprintf(
                    'Low temperature on %s. Lowest reading %.1f C is below %.1f C.',
                    $lowReadings->keys()->implode(', '),
                    $lowest,
                    $min,
                ),
                value: $lowest,
                threshold: $min,
                triggeredAt: $telemetry->recorded_at,
            );
        } else {
            $this->resolve($device, Alarm::TYPE_LOW_TEMPERATURE);
        }
    }

    private function evaluateSensorCompleteness(Device $device, Telemetry $telemetry): void
    {
        $missingSensors = collect($this->sensorReadings($telemetry))
            ->filter(fn (?float $value): bool => $value === null);

        if ($missingSensors->isNotEmpty()) {
            $this->activate(
                device: $device,
                type: Alarm::TYPE_INVALID_SENSOR_READING,
                severity: Alarm::SEVERITY_WARNING,
                message: sprintf('Missing or invalid readings for %s.', $missingSensors->keys()->implode(', ')),
                triggeredAt: $telemetry->recorded_at,
            );

            return;
        }

        $this->resolve($device, Alarm::TYPE_INVALID_SENSOR_READING);
    }

    private function evaluateDoor(Device $device, Telemetry $telemetry): void
    {
        $doorStatus = $this->normalizeStatus($telemetry->door_status);

        if (! $this->doorOpenIsAlarm()) {
            $this->resolve($device, Alarm::TYPE_DOOR_OPEN);

            return;
        }

        if ($doorStatus === 'open') {
            $this->activate(
                device: $device,
                type: Alarm::TYPE_DOOR_OPEN,
                severity: Alarm::SEVERITY_WARNING,
                message: 'Door is open.',
                triggeredAt: $telemetry->recorded_at,
            );

            return;
        }

        if ($doorStatus === 'closed') {
            $this->resolve($device, Alarm::TYPE_DOOR_OPEN);
        }
    }

    private function evaluatePf(Device $device, Telemetry $telemetry): void
    {
        $pfStatus = $this->normalizeStatus($telemetry->pf_status);
        $faultStatuses = ['fault', 'failed', 'failure', 'fail', 'error', 'warning', 'alarm', 'trip', 'tripped', 'offline'];

        if (in_array($pfStatus, $faultStatuses, true)) {
            $severity = $pfStatus === 'warning' ? Alarm::SEVERITY_WARNING : Alarm::SEVERITY_CRITICAL;

            $this->activate(
                device: $device,
                type: Alarm::TYPE_PF_FAULT,
                severity: $severity,
                message: sprintf('PF status is %s.', $pfStatus),
                triggeredAt: $telemetry->recorded_at,
            );

            return;
        }

        if ($pfStatus === 'normal') {
            $this->resolve($device, Alarm::TYPE_PF_FAULT);
        }
    }

    /**
     * @return array<string, float|null>
     */
    private function sensorReadings(Telemetry $telemetry): array
    {
        return [
            'Sensor 1' => $telemetry->temperature_1,
            'Sensor 2' => $telemetry->temperature_2,
            'Sensor 3' => $telemetry->temperature_3,
            'Sensor 4' => $telemetry->temperature_4,
        ];
    }

    private function activate(
        Device $device,
        string $type,
        string $severity,
        string $message,
        ?float $value = null,
        ?float $threshold = null,
        ?CarbonInterface $triggeredAt = null,
    ): Alarm {
        $alarm = $device->activeAlarms()
            ->where('type', $type)
            ->first();

        if (! $alarm) {
            return $device->alarms()->create([
                'type' => $type,
                'severity' => $severity,
                'message' => $message,
                'value' => $value,
                'threshold' => $threshold,
                'triggered_at' => $triggeredAt ?? now(),
            ]);
        }

        $alarm->forceFill([
            'severity' => $severity,
            'message' => $message,
            'value' => $value,
            'threshold' => $threshold,
        ])->save();

        return $alarm;
    }

    private function resolve(Device $device, string $type): void
    {
        $device->activeAlarms()
            ->where('type', $type)
            ->update([
                'is_resolved' => true,
                'resolved_at' => now(),
            ]);
    }

    private function normalizeStatus(?string $status): string
    {
        return Str::lower(trim($status ?? ''));
    }

    private function minTemperature(): float
    {
        return (float) config('alarms.temperature.min_celsius', 2);
    }

    private function maxTemperature(): float
    {
        return (float) config('alarms.temperature.max_celsius', 6);
    }

    private function doorOpenIsAlarm(): bool
    {
        return (bool) config('alarms.door_open_is_alarm', true);
    }

    private function offlineAfterMinutes(): int
    {
        return max(1, (int) config('alarms.offline_after_minutes', 5));
    }
}

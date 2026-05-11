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
                code: Alarm::CODE_DEVICE_OFFLINE,
                severity: Alarm::SEVERITY_CRITICAL,
                message: 'یخچال آفلاین است یا در بازه اخیر داده‌ای ارسال نکرده است.',
                triggeredAt: now(),
            );

            return;
        }

        $this->resolve($device, Alarm::TYPE_DEVICE_OFFLINE, code: Alarm::CODE_DEVICE_OFFLINE);
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

        return $device->last_seen_at->lt(now()->subSeconds($this->offlineAfterSeconds()));
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

    public function telemetryStatus(Telemetry $telemetry): string
    {
        $readings = collect($this->sensorReadings($telemetry));

        if ($readings->contains(fn (?float $value): bool => $value !== null && ($value > $this->maxTemperature() || $value < $this->minTemperature()))) {
            return 'critical';
        }

        if (in_array($this->normalizeStatus($telemetry->pf_status), ['fault', 'failed', 'failure', 'fail', 'error', 'alarm', 'trip', 'tripped', 'offline'], true)) {
            return 'critical';
        }

        if ($readings->contains(fn (?float $value): bool => $value === null)) {
            return 'warning';
        }

        if ($this->normalizeStatus($telemetry->door_status) === 'open') {
            return 'warning';
        }

        if ($this->normalizeStatus($telemetry->pf_status) === 'warning') {
            return 'warning';
        }

        return 'normal';
    }

    private function evaluateTemperatures(Device $device, Telemetry $telemetry): void
    {
        $readings = $this->sensorReadings($telemetry);
        $max = $this->maxTemperature();
        $min = $this->minTemperature();

        foreach ($readings as $sensorNumber => $value) {
            $highCode = Alarm::CODE_HIGH_TEMPERATURE_PREFIX.$sensorNumber;
            $lowCode = Alarm::CODE_LOW_TEMPERATURE_PREFIX.$sensorNumber;

            if ($value !== null && $value > $max) {
                $this->activate(
                    device: $device,
                    type: Alarm::TYPE_HIGH_TEMPERATURE,
                    code: $highCode,
                    sensorNumber: $sensorNumber,
                    severity: Alarm::SEVERITY_CRITICAL,
                    message: sprintf('دمای سنسور %s بالاتر از حد مجاز است.', $this->persianSensorNumber($sensorNumber)),
                    value: $value,
                    threshold: $max,
                    triggeredAt: $telemetry->recorded_at,
                );
            } else {
                $this->resolve($device, Alarm::TYPE_HIGH_TEMPERATURE, code: $highCode);
            }

            if ($value !== null && $value < $min) {
                $this->activate(
                    device: $device,
                    type: Alarm::TYPE_LOW_TEMPERATURE,
                    code: $lowCode,
                    sensorNumber: $sensorNumber,
                    severity: Alarm::SEVERITY_CRITICAL,
                    message: sprintf('دمای سنسور %s پایین‌تر از حد مجاز است.', $this->persianSensorNumber($sensorNumber)),
                    value: $value,
                    threshold: $min,
                    triggeredAt: $telemetry->recorded_at,
                );
            } else {
                $this->resolve($device, Alarm::TYPE_LOW_TEMPERATURE, code: $lowCode);
            }
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
                code: Alarm::CODE_INVALID_SENSOR_READING,
                severity: Alarm::SEVERITY_WARNING,
                message: sprintf('داده %s موجود نیست یا معتبر نیست.', $missingSensors->keys()->map(fn (int $sensorNumber): string => 'سنسور '.$this->persianSensorNumber($sensorNumber))->implode(', ')),
                triggeredAt: $telemetry->recorded_at,
            );

            return;
        }

        $this->resolve($device, Alarm::TYPE_INVALID_SENSOR_READING, code: Alarm::CODE_INVALID_SENSOR_READING);
    }

    private function evaluateDoor(Device $device, Telemetry $telemetry): void
    {
        $doorStatus = $this->normalizeStatus($telemetry->door_status);

        if (! $this->doorOpenIsAlarm()) {
            $this->resolve($device, Alarm::TYPE_DOOR_OPEN, code: Alarm::CODE_DOOR_OPEN);

            return;
        }

        if ($doorStatus === 'open') {
            $this->activate(
                device: $device,
                type: Alarm::TYPE_DOOR_OPEN,
                code: Alarm::CODE_DOOR_OPEN,
                severity: Alarm::SEVERITY_WARNING,
                message: 'درب یخچال باز است.',
                triggeredAt: $telemetry->recorded_at,
            );

            return;
        }

        if ($doorStatus === 'closed') {
            $this->resolve($device, Alarm::TYPE_DOOR_OPEN, code: Alarm::CODE_DOOR_OPEN);
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
                code: Alarm::CODE_PF_FAULT,
                severity: $severity,
                message: 'وضعیت PF نشان‌دهنده قطع برق یا خطا است.',
                triggeredAt: $telemetry->recorded_at,
            );

            return;
        }

        if ($pfStatus === 'normal') {
            $this->resolve($device, Alarm::TYPE_PF_FAULT, code: Alarm::CODE_PF_FAULT);
        }
    }

    /**
     * @return array<int, float|null>
     */
    private function sensorReadings(Telemetry $telemetry): array
    {
        return [
            1 => $telemetry->temperature_1,
            2 => $telemetry->temperature_2,
            3 => $telemetry->temperature_3,
            4 => $telemetry->temperature_4,
        ];
    }

    private function persianSensorNumber(int $sensorNumber): string
    {
        return ['۱', '۲', '۳', '۴'][$sensorNumber - 1] ?? (string) $sensorNumber;
    }

    private function activate(
        Device $device,
        string $type,
        string $severity,
        string $message,
        ?string $code = null,
        ?int $sensorNumber = null,
        ?float $value = null,
        ?float $threshold = null,
        ?CarbonInterface $triggeredAt = null,
    ): Alarm {
        $alarm = $this->alarmIdentityQuery($device, $type, $code, $sensorNumber)->first();

        if (! $alarm) {
            return $device->alarms()->create([
                'type' => $type,
                'code' => $code,
                'sensor_number' => $sensorNumber,
                'severity' => $severity,
                'message' => $message,
                'value' => $value,
                'threshold' => $threshold,
                'triggered_at' => $triggeredAt ?? now(),
            ]);
        }

        $alarm->forceFill([
            'code' => $code,
            'sensor_number' => $sensorNumber,
            'severity' => $severity,
            'message' => $message,
            'value' => $value,
            'threshold' => $threshold,
        ])->save();

        return $alarm;
    }

    private function resolve(Device $device, string $type, ?string $code = null, ?int $sensorNumber = null): void
    {
        $this->alarmIdentityQuery($device, $type, $code, $sensorNumber)
            ->update([
                'is_resolved' => true,
                'resolved_at' => now(),
            ]);
    }

    private function alarmIdentityQuery(Device $device, string $type, ?string $code = null, ?int $sensorNumber = null)
    {
        $query = $device->activeAlarms();

        if ($code !== null) {
            return $query->where('code', $code);
        }

        $query->where('type', $type);

        if ($sensorNumber !== null) {
            return $query->where('sensor_number', $sensorNumber);
        }

        return $query->whereNull('sensor_number');
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

    private function offlineAfterSeconds(): int
    {
        $seconds = config('alarms.offline_after_seconds');

        if ($seconds !== null && (int) $seconds > 0) {
            return (int) $seconds;
        }

        return max(1, (int) config('alarms.offline_after_minutes', 1)) * 60;
    }
}

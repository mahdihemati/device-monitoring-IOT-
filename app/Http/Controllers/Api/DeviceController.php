<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Device;
use App\Models\Telemetry;
use App\Services\Alarms\AlarmEvaluationService;
use App\Services\Telemetry\TelemetryHistoryQueryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DeviceController extends Controller
{
    public function __construct(
        private readonly AlarmEvaluationService $alarmEvaluationService,
        private readonly TelemetryHistoryQueryService $historyQueryService,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $devices = Device::query()
            ->where('customer_id', $request->user()->customer_id)
            ->with('latestTelemetry')
            ->orderBy('name')
            ->get();

        $this->alarmEvaluationService->evaluateConnectivityForDevices($devices);

        $devices->load('activeAlarms')->loadCount('activeAlarms');

        return response()->json([
            'devices' => $devices->map(fn (Device $device): array => $this->devicePayload($device)),
        ]);
    }

    public function show(Request $request, Device $device): JsonResponse
    {
        $this->abortIfDeviceIsNotOwnedByUser($request, $device);

        $this->alarmEvaluationService->evaluateConnectivity($device);
        $device->load('latestTelemetry', 'activeAlarms')->loadCount('activeAlarms');

        return response()->json([
            'device' => $this->devicePayload($device),
        ]);
    }

    public function latest(Request $request, Device $device): JsonResponse
    {
        $this->abortIfDeviceIsNotOwnedByUser($request, $device);

        return response()->json([
            'telemetry' => $this->telemetryPayload($device->latestTelemetry()->first()),
        ]);
    }

    public function history(Request $request, Device $device): JsonResponse
    {
        $this->abortIfDeviceIsNotOwnedByUser($request, $device);

        $history = $this->historyQueryService->latest($device, $request)
            ->map(fn (Telemetry $telemetry): array => $this->telemetryPayload($telemetry));

        return response()->json([
            'telemetry' => $history,
        ]);
    }

    public function exportHistory(Request $request, Device $device): StreamedResponse
    {
        $this->abortIfDeviceIsNotOwnedByUser($request, $device);

        $filename = sprintf('%s-history.csv', str($device->device_code)->slug());

        return response()->streamDownload(function () use ($device, $request): void {
            $handle = fopen('php://output', 'w');

            fputcsv($handle, [
                'recorded_at',
                'device_code',
                'device_name',
                'sensor_1',
                'sensor_2',
                'sensor_3',
                'sensor_4',
                'door_status',
                'pf_status',
                'overall_status',
            ]);

            $this->historyQueryService
                ->exportQuery($device, $request)
                ->cursor()
                ->each(function (Telemetry $telemetry) use ($device, $handle): void {
                    fputcsv($handle, [
                        $telemetry->recorded_at?->toISOString(),
                        $device->device_code,
                        $device->name,
                        $telemetry->temperature_1,
                        $telemetry->temperature_2,
                        $telemetry->temperature_3,
                        $telemetry->temperature_4,
                        $telemetry->door_status,
                        $telemetry->pf_status,
                        $this->alarmEvaluationService->telemetryStatus($telemetry),
                    ]);
                });

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    private function abortIfDeviceIsNotOwnedByUser(Request $request, Device $device): void
    {
        abort_unless($device->customer_id === $request->user()->customer_id, 404);
    }

    private function devicePayload(Device $device): array
    {
        $latestTelemetry = $device->relationLoaded('latestTelemetry')
            ? $device->latestTelemetry
            : $device->latestTelemetry()->first();

        return [
            'id' => $device->id,
            'device_code' => $device->device_code,
            'name' => $device->name,
            'serial_number' => $device->serial_number,
            'last_seen_at' => $device->last_seen_at?->toISOString(),
            'latest_telemetry' => $this->telemetryPayload($latestTelemetry),
            'previous_telemetry' => $this->telemetryPayload($this->previousTelemetry($device, $latestTelemetry)),
            'overall_status' => $this->alarmEvaluationService->overallStatus($device),
            'active_alarm_count' => $device->getAttribute('active_alarms_count') ?? $device->activeAlarms()->count(),
        ];
    }

    private function previousTelemetry(Device $device, ?Telemetry $latestTelemetry): ?Telemetry
    {
        if (! $latestTelemetry) {
            return null;
        }

        return $device->telemetry()
            ->whereKeyNot($latestTelemetry->id)
            ->orderByRaw('recorded_at is null asc')
            ->latest('recorded_at')
            ->latest('id')
            ->first();
    }

    private function telemetryPayload(?Telemetry $telemetry): ?array
    {
        if (! $telemetry) {
            return null;
        }

        $overallStatus = $this->alarmEvaluationService->telemetryStatus($telemetry);

        return [
            'id' => $telemetry->id,
            'device_id' => $telemetry->device_id,
            'temperature_1' => $telemetry->temperature_1,
            'temperature_2' => $telemetry->temperature_2,
            'temperature_3' => $telemetry->temperature_3,
            'temperature_4' => $telemetry->temperature_4,
            'door_status' => $telemetry->door_status,
            'pf_status' => $telemetry->pf_status,
            'overall_status' => $overallStatus,
            'alarm_indicator' => $overallStatus !== 'normal',
            'recorded_at' => $telemetry->recorded_at?->toISOString(),
            'created_at' => $telemetry->created_at?->toISOString(),
        ];
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Device;
use App\Models\Telemetry;
use App\Services\Alarms\AlarmEvaluationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DeviceController extends Controller
{
    public function __construct(
        private readonly AlarmEvaluationService $alarmEvaluationService,
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

        $limit = max(1, min((int) $request->integer('limit', 100), 300));

        $history = $device->telemetry()
            ->orderByRaw('recorded_at is null asc')
            ->latest('recorded_at')
            ->latest('id')
            ->limit($limit)
            ->get()
            ->map(fn (Telemetry $telemetry): array => $this->telemetryPayload($telemetry));

        return response()->json([
            'telemetry' => $history,
        ]);
    }

    private function abortIfDeviceIsNotOwnedByUser(Request $request, Device $device): void
    {
        abort_unless($device->customer_id === $request->user()->customer_id, 404);
    }

    private function devicePayload(Device $device): array
    {
        return [
            'id' => $device->id,
            'device_code' => $device->device_code,
            'name' => $device->name,
            'serial_number' => $device->serial_number,
            'last_seen_at' => $device->last_seen_at?->toISOString(),
            'latest_telemetry' => $this->telemetryPayload($device->latestTelemetry),
            'overall_status' => $this->alarmEvaluationService->overallStatus($device),
            'active_alarm_count' => $device->getAttribute('active_alarms_count') ?? $device->activeAlarms()->count(),
        ];
    }

    private function telemetryPayload(?Telemetry $telemetry): ?array
    {
        if (! $telemetry) {
            return null;
        }

        return [
            'id' => $telemetry->id,
            'device_id' => $telemetry->device_id,
            'temperature_1' => $telemetry->temperature_1,
            'temperature_2' => $telemetry->temperature_2,
            'temperature_3' => $telemetry->temperature_3,
            'temperature_4' => $telemetry->temperature_4,
            'door_status' => $telemetry->door_status,
            'pf_status' => $telemetry->pf_status,
            'recorded_at' => $telemetry->recorded_at?->toISOString(),
            'created_at' => $telemetry->created_at?->toISOString(),
        ];
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Alarm;
use App\Models\Device;
use App\Services\Alarms\AlarmEvaluationService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AlarmController extends Controller
{
    public function __construct(
        private readonly AlarmEvaluationService $alarmEvaluationService,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $this->refreshOfflineAlarms($request);

        $limit = max(1, min((int) $request->integer('limit', 100), 300));

        $alarms = $this->baseAlarmQuery($request)
            ->when($request->filled('device_id'), fn (Builder $query): Builder => $query->where('device_id', $request->integer('device_id')))
            ->when($request->string('status')->toString() === 'active', fn (Builder $query): Builder => $query->where('is_resolved', false))
            ->when($request->string('status')->toString() === 'resolved', fn (Builder $query): Builder => $query->where('is_resolved', true))
            ->when($request->has('is_resolved'), fn (Builder $query): Builder => $query->where('is_resolved', $request->boolean('is_resolved')))
            ->latest('triggered_at')
            ->latest('id')
            ->limit($limit)
            ->get()
            ->map(fn (Alarm $alarm): array => $this->alarmPayload($alarm));

        return response()->json([
            'alarms' => $alarms,
        ]);
    }

    public function active(Request $request): JsonResponse
    {
        $this->refreshOfflineAlarms($request);

        $alarms = $this->baseAlarmQuery($request)
            ->where('is_resolved', false)
            ->latest('triggered_at')
            ->latest('id')
            ->get()
            ->map(fn (Alarm $alarm): array => $this->alarmPayload($alarm));

        return response()->json([
            'alarms' => $alarms,
        ]);
    }

    public function resolve(Request $request, Alarm $alarm): JsonResponse
    {
        $alarm->load('device');

        abort_unless($alarm->device->customer_id === $request->user()->customer_id, 404);

        if (! $alarm->is_resolved) {
            $alarm->forceFill([
                'is_resolved' => true,
                'resolved_at' => now(),
            ])->save();
        }

        return response()->json([
            'alarm' => $this->alarmPayload($alarm->refresh()->load('device')),
        ]);
    }

    private function baseAlarmQuery(Request $request): Builder
    {
        return Alarm::query()
            ->with('device')
            ->whereHas('device', fn (Builder $query): Builder => $query->where('customer_id', $request->user()->customer_id));
    }

    private function refreshOfflineAlarms(Request $request): void
    {
        $devices = Device::query()
            ->where('customer_id', $request->user()->customer_id)
            ->get();

        $this->alarmEvaluationService->evaluateConnectivityForDevices($devices);
    }

    private function alarmPayload(Alarm $alarm): array
    {
        return [
            'id' => $alarm->id,
            'device_id' => $alarm->device_id,
            'type' => $alarm->type,
            'code' => $alarm->code,
            'sensor_number' => $alarm->sensor_number,
            'severity' => $alarm->severity,
            'message' => $alarm->message,
            'value' => $alarm->value,
            'threshold' => $alarm->threshold,
            'is_resolved' => $alarm->is_resolved,
            'resolved_at' => $alarm->resolved_at?->toISOString(),
            'triggered_at' => $alarm->triggered_at?->toISOString(),
            'created_at' => $alarm->created_at?->toISOString(),
            'updated_at' => $alarm->updated_at?->toISOString(),
            'device' => [
                'id' => $alarm->device->id,
                'device_code' => $alarm->device->device_code,
                'name' => $alarm->device->name,
            ],
        ];
    }
}

<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Admin\Concerns\AuthorizesAdminRequests;
use App\Http\Controllers\Controller;
use App\Models\Device;
use App\Models\Telemetry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminDeviceController extends Controller
{
    use AuthorizesAdminRequests;

    public function index(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $devices = Device::query()
            ->with('customer')
            ->withCount('activeAlarms')
            ->orderBy('name')
            ->get()
            ->map(fn (Device $device): array => $this->devicePayload($device));

        return response()->json([
            'devices' => $devices,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $device = Device::query()->create($this->validatedDeviceData($request));

        return response()->json([
            'device' => $this->devicePayload($device->load('customer')->loadCount('activeAlarms')),
        ], 201);
    }

    public function show(Request $request, Device $device): JsonResponse
    {
        $this->authorizeAdmin($request);

        return response()->json([
            'device' => $this->devicePayload($device->load('customer')->loadCount('activeAlarms')),
        ]);
    }

    public function rawTelemetry(Request $request, Device $device): JsonResponse
    {
        $this->authorizeAdmin($request);

        $limit = max(1, min((int) $request->integer('limit', 20), 100));

        $telemetry = $device->telemetry()
            ->latest('recorded_at')
            ->latest('id')
            ->limit($limit)
            ->get()
            ->map(fn (Telemetry $telemetry): array => [
                'id' => $telemetry->id,
                'recorded_at' => $telemetry->recorded_at?->toISOString(),
                'created_at' => $telemetry->created_at?->toISOString(),
                'raw_payload' => $telemetry->raw_payload,
            ]);

        return response()->json([
            'telemetry' => $telemetry,
        ]);
    }

    public function update(Request $request, Device $device): JsonResponse
    {
        $this->authorizeAdmin($request);

        $device->update($this->validatedDeviceData($request, $device));

        return response()->json([
            'device' => $this->devicePayload($device->refresh()->load('customer')->loadCount('activeAlarms')),
        ]);
    }

    public function destroy(Request $request, Device $device): JsonResponse
    {
        $this->authorizeAdmin($request);

        $device->delete();

        return response()->json([
            'message' => 'یخچال حذف شد.',
        ]);
    }

    private function validatedDeviceData(Request $request, ?Device $device = null): array
    {
        $deviceCodeRule = Rule::unique('devices', 'device_code');

        if ($device) {
            $deviceCodeRule->ignore($device);
        }

        return $request->validate([
            'customer_id' => ['required', 'integer', 'exists:customers,id'],
            'name' => ['required', 'string', 'max:255'],
            'device_code' => [
                'required',
                'string',
                'max:255',
                $deviceCodeRule,
            ],
            'serial_number' => ['nullable', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);
    }

    private function devicePayload(Device $device): array
    {
        return [
            'id' => $device->id,
            'customer_id' => $device->customer_id,
            'device_code' => $device->device_code,
            'name' => $device->name,
            'serial_number' => $device->serial_number,
            'location' => $device->location,
            'notes' => $device->notes,
            'last_seen_at' => $device->last_seen_at?->toISOString(),
            'active_alarm_count' => $device->getAttribute('active_alarms_count'),
            'customer' => $device->customer ? [
                'id' => $device->customer->id,
                'name' => $device->customer->name,
                'contact_name' => $device->customer->contact_name,
                'phone' => $device->customer->phone,
                'email' => $device->customer->email,
                'notes' => $device->customer->notes,
            ] : null,
            'created_at' => $device->created_at?->toISOString(),
            'updated_at' => $device->updated_at?->toISOString(),
        ];
    }
}

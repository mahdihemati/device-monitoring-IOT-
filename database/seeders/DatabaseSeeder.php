<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\Device;
use App\Models\User;
use App\Services\Alarms\AlarmEvaluationService;
use Carbon\CarbonImmutable;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $alarmEvaluationService = app(AlarmEvaluationService::class);

        $customer = Customer::query()->create([
            'name' => 'مرکز انتقال خون نمونه',
            'contact_name' => 'مسئول فنی نمونه',
            'phone' => '021-00000000',
            'email' => 'demo@example.com',
            'notes' => 'مشتری نمونه برای اجرای دمو و بررسی سامانه.',
        ]);

        User::query()->create([
            'customer_id' => null,
            'name' => 'مدیر سامانه',
            'username' => 'admin',
            'password' => Hash::make('password'),
            'role' => User::ROLE_ADMIN,
        ]);

        User::query()->create([
            'customer_id' => $customer->id,
            'name' => 'کاربر نمونه',
            'username' => 'demo',
            'password' => Hash::make('password'),
            'role' => User::ROLE_CLIENT,
        ]);

        $devices = [
            Device::query()->create([
                'customer_id' => $customer->id,
                'device_code' => 'device-001',
                'name' => 'یخچال خون شماره ۱',
                'serial_number' => 'SN-BR-001',
                'location' => 'اتاق نگهداری خون',
                'notes' => 'یخچال اصلی نمونه برای دمو.',
            ]),
            Device::query()->create([
                'customer_id' => $customer->id,
                'device_code' => 'device-002',
                'name' => 'یخچال خون شماره ۲',
                'serial_number' => 'SN-BR-002',
                'location' => 'آزمایشگاه اورژانس',
                'notes' => 'یخچال دوم نمونه با یک هشدار فعال برای نمایش دمو.',
            ]),
        ];

        foreach ($devices as $deviceIndex => $device) {
            for ($i = 15; $i >= 0; $i--) {
                $recordedAt = CarbonImmutable::now()->subMinutes($i * 5);
                $baseTemperature = 3.8 + ($deviceIndex * 0.2) + ($i * 0.02);
                $doorStatus = $i === 3 && $deviceIndex === 0 ? 'open' : 'closed';
                $pfStatus = ($deviceIndex === 1 && ($i === 7 || $i === 0)) ? 'warning' : 'normal';

                $telemetry = $device->telemetry()->create([
                    'temperature_1' => round($baseTemperature, 2),
                    'temperature_2' => round($baseTemperature + 0.7, 2),
                    'temperature_3' => round($baseTemperature + 1.1, 2),
                    'temperature_4' => round($baseTemperature + 0.3, 2),
                    'door_status' => $doorStatus,
                    'pf_status' => $pfStatus,
                    'raw_payload' => [
                        'id' => $device->device_code,
                        'temp1' => round($baseTemperature, 2),
                        'temp2' => round($baseTemperature + 0.7, 2),
                        'temp3' => round($baseTemperature + 1.1, 2),
                        'temp4' => round($baseTemperature + 0.3, 2),
                        'door' => $doorStatus === 'open',
                        'pf' => $pfStatus !== 'normal',
                    ],
                    'recorded_at' => $recordedAt,
                ]);

                $device->forceFill([
                    'last_seen_at' => $recordedAt,
                ])->save();

                $alarmEvaluationService->evaluateTelemetry($device, $telemetry);
            }
        }
    }
}

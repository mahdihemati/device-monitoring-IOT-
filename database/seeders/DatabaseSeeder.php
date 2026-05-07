<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\Device;
use Carbon\CarbonImmutable;
use App\Models\User;
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
        $customer = Customer::query()->create([
            'name' => 'Demo Factory Customer',
        ]);

        User::query()->create([
            'customer_id' => $customer->id,
            'name' => 'Demo Operator',
            'username' => 'demo',
            'password' => Hash::make('password'),
        ]);

        $devices = [
            Device::query()->create([
                'customer_id' => $customer->id,
                'device_code' => 'device-001',
                'name' => 'Cold Room Controller',
                'serial_number' => 'SN-CR-001',
            ]),
            Device::query()->create([
                'customer_id' => $customer->id,
                'device_code' => 'device-002',
                'name' => 'Packing Line Cabinet',
                'serial_number' => 'SN-PL-002',
            ]),
        ];

        foreach ($devices as $deviceIndex => $device) {
            for ($i = 15; $i >= 0; $i--) {
                $recordedAt = CarbonImmutable::now()->subMinutes($i * 5);
                $baseTemperature = 23.8 + $deviceIndex + ($i * 0.08);

                $device->telemetry()->create([
                    'temperature_1' => round($baseTemperature, 2),
                    'temperature_2' => round($baseTemperature + 0.7, 2),
                    'temperature_3' => round($baseTemperature + 1.1, 2),
                    'temperature_4' => round($baseTemperature + 0.3, 2),
                    'door_status' => $i === 3 && $deviceIndex === 0 ? 'open' : 'closed',
                    'pf_status' => $i === 7 && $deviceIndex === 1 ? 'warning' : 'normal',
                    'raw_payload' => [
                        'device_code' => $device->device_code,
                        'temperature_1' => round($baseTemperature, 2),
                        'temperature_2' => round($baseTemperature + 0.7, 2),
                        'temperature_3' => round($baseTemperature + 1.1, 2),
                        'temperature_4' => round($baseTemperature + 0.3, 2),
                        'door_status' => $i === 3 && $deviceIndex === 0 ? 'open' : 'closed',
                        'pf_status' => $i === 7 && $deviceIndex === 1 ? 'warning' : 'normal',
                        'timestamp' => $recordedAt->toISOString(),
                    ],
                    'recorded_at' => $recordedAt,
                ]);
            }

            $device->forceFill([
                'last_seen_at' => CarbonImmutable::now(),
            ])->save();
        }
    }
}

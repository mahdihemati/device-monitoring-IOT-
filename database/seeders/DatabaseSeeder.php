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
            'name' => 'Demo Blood Bank',
            'contact_name' => 'Demo Supervisor',
            'phone' => '+1 555 0100',
            'email' => 'demo@example.com',
            'notes' => 'Seed client for refrigerator monitoring demos.',
        ]);

        User::query()->create([
            'customer_id' => null,
            'name' => 'Company Admin',
            'username' => 'admin',
            'password' => Hash::make('password'),
            'role' => User::ROLE_ADMIN,
        ]);

        User::query()->create([
            'customer_id' => $customer->id,
            'name' => 'Demo Operator',
            'username' => 'demo',
            'password' => Hash::make('password'),
            'role' => User::ROLE_CLIENT,
        ]);

        $devices = [
            Device::query()->create([
                'customer_id' => $customer->id,
                'device_code' => 'device-001',
                'name' => 'Blood Refrigerator A',
                'serial_number' => 'SN-BR-001',
                'location' => 'Blood bank storage room',
                'notes' => 'Primary refrigerator for demo telemetry.',
            ]),
            Device::query()->create([
                'customer_id' => $customer->id,
                'device_code' => 'device-002',
                'name' => 'Blood Refrigerator B',
                'serial_number' => 'SN-BR-002',
                'location' => 'Emergency department lab',
                'notes' => 'Secondary refrigerator for demo telemetry.',
            ]),
        ];

        foreach ($devices as $deviceIndex => $device) {
            for ($i = 15; $i >= 0; $i--) {
                $recordedAt = CarbonImmutable::now()->subMinutes($i * 5);
                $baseTemperature = 3.8 + ($deviceIndex * 0.2) + ($i * 0.02);

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

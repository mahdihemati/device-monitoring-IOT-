<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Device;
use App\Models\Telemetry;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class DeviceMonitoringApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_succeeds_with_valid_username_and_password(): void
    {
        $customer = Customer::query()->create(['name' => 'Acme Factory']);

        User::query()->create([
            'customer_id' => $customer->id,
            'name' => 'Operator',
            'username' => 'operator',
            'password' => Hash::make('secret-password'),
        ]);

        $this->postJson('/api/login', [
            'username' => 'operator',
            'password' => 'secret-password',
        ])
            ->assertOk()
            ->assertJsonPath('user.username', 'operator')
            ->assertJsonPath('user.customer.name', 'Acme Factory');

        $this->assertAuthenticated();
    }

    public function test_login_fails_with_invalid_credentials(): void
    {
        $customer = Customer::query()->create(['name' => 'Acme Factory']);

        User::query()->create([
            'customer_id' => $customer->id,
            'name' => 'Operator',
            'username' => 'operator',
            'password' => Hash::make('secret-password'),
        ]);

        $this->postJson('/api/login', [
            'username' => 'operator',
            'password' => 'wrong-password',
        ])->assertUnprocessable();

        $this->assertGuest();
    }

    public function test_authenticated_user_can_see_only_own_devices(): void
    {
        [$customer, $user] = $this->makeCustomerUser('owned-user');
        [$otherCustomer] = $this->makeCustomerUser('other-user');

        Device::query()->create([
            'customer_id' => $customer->id,
            'device_code' => 'owned-device',
            'name' => 'Owned Device',
        ]);

        Device::query()->create([
            'customer_id' => $otherCustomer->id,
            'device_code' => 'other-device',
            'name' => 'Other Device',
        ]);

        $response = $this->actingAs($user)->getJson('/api/devices')->assertOk();

        $devices = $response->json('devices');

        $this->assertCount(1, $devices);
        $this->assertSame('owned-device', $devices[0]['device_code']);
        $this->assertArrayNotHasKey('customer_id', $devices[0]);
    }

    public function test_authenticated_user_cannot_access_another_customers_device_by_id(): void
    {
        [, $user] = $this->makeCustomerUser('owned-user');
        [$otherCustomer] = $this->makeCustomerUser('other-user');

        $otherDevice = Device::query()->create([
            'customer_id' => $otherCustomer->id,
            'device_code' => 'other-device',
            'name' => 'Other Device',
        ]);

        $this->actingAs($user)
            ->getJson("/api/devices/{$otherDevice->id}")
            ->assertNotFound();
    }

    public function test_ingestion_requires_x_ingestion_secret(): void
    {
        config(['services.ingestion.secret' => 'test-secret']);

        $this->postJson('/api/ingest/telemetry', [
            'device_code' => 'device-001',
        ])->assertForbidden();
    }

    public function test_ingestion_stores_telemetry_and_updates_device_last_seen_at(): void
    {
        config(['services.ingestion.secret' => 'test-secret']);

        [$customer] = $this->makeCustomerUser('owned-user');

        $device = Device::query()->create([
            'customer_id' => $customer->id,
            'device_code' => 'device-001',
            'name' => 'Cold Room Controller',
        ]);

        $recordedAt = CarbonImmutable::parse('2026-05-07T10:20:00Z');

        $this->withHeader('X-Ingestion-Secret', 'test-secret')
            ->postJson('/api/ingest/telemetry', [
                'device_code' => 'device-001',
                'temperature_1' => 24.5,
                'temperature_2' => 25.1,
                'temperature_3' => 26.0,
                'temperature_4' => 24.8,
                'door_status' => true,
                'pf_status' => 0,
                'timestamp' => $recordedAt->toISOString(),
            ])
            ->assertCreated()
            ->assertJsonPath('device_id', $device->id);

        $telemetry = Telemetry::query()->firstOrFail();

        $this->assertSame($device->id, $telemetry->device_id);
        $this->assertSame(24.5, $telemetry->temperature_1);
        $this->assertSame('open', $telemetry->door_status);
        $this->assertSame('fault', $telemetry->pf_status);

        $device->refresh();

        $this->assertSame($recordedAt->toISOString(), $device->last_seen_at?->toISOString());
    }

    public function test_latest_endpoint_prefers_latest_recorded_at_over_latest_id(): void
    {
        [$customer, $user] = $this->makeCustomerUser('owned-user');

        $device = Device::query()->create([
            'customer_id' => $customer->id,
            'device_code' => 'device-001',
            'name' => 'Cold Room Controller',
        ]);

        $newerByTime = $device->telemetry()->create([
            'temperature_1' => 30.0,
            'raw_payload' => ['device_code' => 'device-001'],
            'recorded_at' => CarbonImmutable::parse('2026-05-07T11:00:00Z'),
        ]);

        $device->telemetry()->create([
            'temperature_1' => 20.0,
            'raw_payload' => ['device_code' => 'device-001'],
            'recorded_at' => CarbonImmutable::parse('2026-05-07T10:00:00Z'),
        ]);

        $this->actingAs($user)
            ->getJson("/api/devices/{$device->id}/latest")
            ->assertOk()
            ->assertJsonPath('telemetry.id', $newerByTime->id)
            ->assertJsonPath('telemetry.temperature_1', 30);
    }

    private function makeCustomerUser(string $username): array
    {
        $customer = Customer::query()->create([
            'name' => "Customer {$username}",
        ]);

        $user = User::query()->create([
            'customer_id' => $customer->id,
            'name' => "User {$username}",
            'username' => $username,
            'password' => Hash::make('password'),
        ]);

        return [$customer, $user];
    }
}

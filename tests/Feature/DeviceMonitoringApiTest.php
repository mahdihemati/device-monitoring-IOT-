<?php

namespace Tests\Feature;

use App\Models\Alarm;
use App\Models\Customer;
use App\Models\Device;
use App\Models\Telemetry;
use App\Models\User;
use App\Services\Telemetry\MqttTelemetryMessageHandler;
use App\Services\Telemetry\TelemetryPayloadParser;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
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
            'role' => User::ROLE_CLIENT,
        ]);

        $this->postJson('/api/login', [
            'username' => 'operator',
            'password' => 'secret-password',
        ])
            ->assertOk()
            ->assertJsonPath('user.username', 'operator')
            ->assertJsonPath('user.role', User::ROLE_CLIENT)
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
            'role' => User::ROLE_CLIENT,
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

    public function test_parser_accepts_primary_payload_format(): void
    {
        $data = app(TelemetryPayloadParser::class)->parse([
            'device_code' => 'device-001',
            'temperature_1' => 4.1,
            'temperature_2' => 4.2,
            'temperature_3' => 4.3,
            'temperature_4' => 4.4,
            'door_status' => 'closed',
            'pf_status' => 'normal',
            'timestamp' => '2026-05-07T10:20:00Z',
        ]);

        $this->assertSame('device-001', $data->deviceCode);
        $this->assertSame(4.1, $data->temperature1);
        $this->assertSame(4.4, $data->temperature4);
        $this->assertSame('closed', $data->doorStatus);
        $this->assertSame('normal', $data->pfStatus);
        $this->assertSame('2026-05-07T10:20:00.000000Z', $data->recordedAt?->toISOString());
    }

    public function test_parser_accepts_alternative_payload_field_names(): void
    {
        $data = app(TelemetryPayloadParser::class)->parse([
            'refrigerator_code' => 'fridge-alt',
            't1' => '3.1',
            'temp2' => 3.2,
            'sensor3' => 3.3,
            'sensor4' => 3.4,
            'door_state' => true,
            'power_failure' => true,
            'recorded_at' => '2026-05-07T11:20:00Z',
        ]);

        $this->assertSame('fridge-alt', $data->deviceCode);
        $this->assertSame(3.1, $data->temperature1);
        $this->assertSame(3.2, $data->temperature2);
        $this->assertSame(3.3, $data->temperature3);
        $this->assertSame(3.4, $data->temperature4);
        $this->assertSame('open', $data->doorStatus);
        $this->assertSame('fault', $data->pfStatus);
    }

    public function test_parser_can_use_topic_derived_device_code(): void
    {
        $data = app(TelemetryPayloadParser::class)->parse([
            't1' => 4.1,
        ], 'clients/client-a/refrigerators/topic-device/telemetry');

        $this->assertSame('topic-device', $data->deviceCode);
        $this->assertSame(4.1, $data->temperature1);
    }

    public function test_http_ingestion_accepts_topic_header_for_device_code(): void
    {
        config(['services.ingestion.secret' => 'test-secret']);

        [$customer] = $this->makeCustomerUser('topic-header-user');

        $device = Device::query()->create([
            'customer_id' => $customer->id,
            'device_code' => 'topic-header-device',
            'name' => 'Topic Header Refrigerator',
        ]);

        $this->withHeaders([
            'X-Ingestion-Secret' => 'test-secret',
            'X-MQTT-Topic' => 'devices/topic-header-device/telemetry',
        ])
            ->postJson('/api/ingest/telemetry', [
                'sensor1' => 4.5,
                'sensor2' => 4.6,
                'sensor3' => 4.7,
                'sensor4' => 4.8,
                'door' => 'closed',
                'pf' => 'normal',
                'time' => '2026-05-07T10:20:00Z',
            ])
            ->assertCreated()
            ->assertJsonPath('device_id', $device->id);

        $this->assertDatabaseHas('telemetry', [
            'device_id' => $device->id,
            'temperature_1' => 4.5,
            'door_status' => 'closed',
            'pf_status' => 'normal',
        ]);
    }

    public function test_mqtt_message_handler_ignores_invalid_json_without_crashing(): void
    {
        $result = app(MqttTelemetryMessageHandler::class)->handle('devices/device-001/telemetry', '{"device_code":');

        $this->assertSame('ignored', $result->status);
        $this->assertStringContainsString('Invalid JSON', $result->message);
    }

    public function test_mqtt_message_handler_reports_unknown_device_without_crashing(): void
    {
        $result = app(MqttTelemetryMessageHandler::class)->handle('devices/unknown-device/telemetry', json_encode([
            'temperature_1' => 4.1,
        ], JSON_THROW_ON_ERROR));

        $this->assertSame('failed', $result->status);
        $this->assertStringContainsString('No device exists', $result->message);
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

    public function test_user_can_query_own_refrigerator_history(): void
    {
        [$customer, $user] = $this->makeCustomerUser('history-user');

        $device = Device::query()->create([
            'customer_id' => $customer->id,
            'device_code' => 'history-device',
            'name' => 'History Device',
        ]);

        $telemetry = $device->telemetry()->create([
            'temperature_1' => 4.2,
            'raw_payload' => ['device_code' => 'history-device'],
            'recorded_at' => CarbonImmutable::parse('2026-05-07T10:00:00Z'),
        ]);

        $this->actingAs($user)
            ->getJson("/api/devices/{$device->id}/history")
            ->assertOk()
            ->assertJsonPath('telemetry.0.id', $telemetry->id)
            ->assertJsonPath('telemetry.0.overall_status', 'warning');
    }

    public function test_user_cannot_query_another_customers_refrigerator_history(): void
    {
        [, $user] = $this->makeCustomerUser('owned-history-user');
        [$otherCustomer] = $this->makeCustomerUser('other-history-user');

        $otherDevice = Device::query()->create([
            'customer_id' => $otherCustomer->id,
            'device_code' => 'other-history-device',
            'name' => 'Other History Device',
        ]);

        $this->actingAs($user)
            ->getJson("/api/devices/{$otherDevice->id}/history")
            ->assertNotFound();
    }

    public function test_history_date_filters_work(): void
    {
        [$customer, $user] = $this->makeCustomerUser('date-filter-user');

        $device = Device::query()->create([
            'customer_id' => $customer->id,
            'device_code' => 'filter-device',
            'name' => 'Filter Device',
        ]);

        $device->telemetry()->create([
            'temperature_1' => 4.0,
            'raw_payload' => ['device_code' => 'filter-device'],
            'recorded_at' => CarbonImmutable::parse('2026-05-06T10:00:00Z'),
        ]);

        $included = $device->telemetry()->create([
            'temperature_1' => 4.5,
            'raw_payload' => ['device_code' => 'filter-device'],
            'recorded_at' => CarbonImmutable::parse('2026-05-07T10:00:00Z'),
        ]);

        $response = $this->actingAs($user)
            ->getJson("/api/devices/{$device->id}/history?from=2026-05-07&to=2026-05-07")
            ->assertOk();

        $this->assertCount(1, $response->json('telemetry'));
        $this->assertSame($included->id, $response->json('telemetry.0.id'));
    }

    public function test_csv_export_works(): void
    {
        [$customer, $user] = $this->makeCustomerUser('csv-user');

        $device = Device::query()->create([
            'customer_id' => $customer->id,
            'device_code' => 'csv-device',
            'name' => 'CSV Device',
        ]);

        $device->telemetry()->create([
            'temperature_1' => 4.5,
            'temperature_2' => 4.6,
            'temperature_3' => 4.7,
            'temperature_4' => 4.8,
            'door_status' => 'closed',
            'pf_status' => 'normal',
            'raw_payload' => ['device_code' => 'csv-device'],
            'recorded_at' => CarbonImmutable::parse('2026-05-07T10:00:00Z'),
        ]);

        $response = $this->actingAs($user)
            ->get("/api/devices/{$device->id}/history/export?from=2026-05-07&to=2026-05-07")
            ->assertOk();

        $csv = $response->streamedContent();

        $this->assertStringContainsString('recorded_at,device_code,device_name,sensor_1,sensor_2,sensor_3,sensor_4,door_status,pf_status,overall_status', $csv);
        $this->assertStringContainsString('csv-device', $csv);
        $this->assertStringContainsString('normal', $csv);
    }

    public function test_csv_export_is_customer_scoped(): void
    {
        [, $user] = $this->makeCustomerUser('owned-csv-user');
        [$otherCustomer] = $this->makeCustomerUser('other-csv-user');

        $otherDevice = Device::query()->create([
            'customer_id' => $otherCustomer->id,
            'device_code' => 'other-csv-device',
            'name' => 'Other CSV Device',
        ]);

        $this->actingAs($user)
            ->get("/api/devices/{$otherDevice->id}/history/export")
            ->assertNotFound();
    }

    public function test_alarm_history_endpoint_is_customer_scoped_and_filterable(): void
    {
        [$customer, $user] = $this->makeCustomerUser('alarm-history-user');
        [$otherCustomer] = $this->makeCustomerUser('other-alarm-history-user');

        $device = Device::query()->create([
            'customer_id' => $customer->id,
            'device_code' => 'alarm-history-device',
            'name' => 'Alarm History Device',
            'last_seen_at' => now(),
        ]);

        $resolvedAlarm = $device->alarms()->create([
            'type' => Alarm::TYPE_DOOR_OPEN,
            'severity' => Alarm::SEVERITY_WARNING,
            'message' => 'Door is open.',
            'is_resolved' => true,
            'resolved_at' => now(),
            'triggered_at' => now()->subMinutes(5),
        ]);

        $otherDevice = Device::query()->create([
            'customer_id' => $otherCustomer->id,
            'device_code' => 'other-alarm-history-device',
            'name' => 'Other Alarm History Device',
            'last_seen_at' => now(),
        ]);

        $otherAlarm = $otherDevice->alarms()->create([
            'type' => Alarm::TYPE_PF_FAULT,
            'severity' => Alarm::SEVERITY_CRITICAL,
            'message' => 'PF status is fault.',
            'triggered_at' => now(),
        ]);

        $response = $this->actingAs($user)
            ->getJson('/api/alarms?status=resolved')
            ->assertOk()
            ->assertJsonMissing(['id' => $otherAlarm->id]);

        $this->assertCount(1, $response->json('alarms'));
        $this->assertSame($resolvedAlarm->id, $response->json('alarms.0.id'));
    }

    public function test_alarm_is_created_for_high_temperature(): void
    {
        $device = $this->makeDeviceForIngestion();

        $this->ingestTelemetry($device, [
            'temperature_1' => 7.5,
            'temperature_2' => 4.1,
            'temperature_3' => 4.2,
            'temperature_4' => 4.3,
        ]);

        $this->assertDatabaseHas('alarms', [
            'device_id' => $device->id,
            'type' => Alarm::TYPE_HIGH_TEMPERATURE,
            'severity' => Alarm::SEVERITY_CRITICAL,
            'is_resolved' => false,
        ]);
    }

    public function test_alarm_is_created_for_low_temperature(): void
    {
        $device = $this->makeDeviceForIngestion();

        $this->ingestTelemetry($device, [
            'temperature_1' => 4.0,
            'temperature_2' => 1.5,
            'temperature_3' => 4.2,
            'temperature_4' => 4.3,
        ]);

        $this->assertDatabaseHas('alarms', [
            'device_id' => $device->id,
            'type' => Alarm::TYPE_LOW_TEMPERATURE,
            'severity' => Alarm::SEVERITY_CRITICAL,
            'is_resolved' => false,
        ]);
    }

    public function test_alarm_is_created_for_door_open(): void
    {
        $device = $this->makeDeviceForIngestion();

        $this->ingestTelemetry($device, [
            'door_status' => 'open',
        ]);

        $this->assertDatabaseHas('alarms', [
            'device_id' => $device->id,
            'type' => Alarm::TYPE_DOOR_OPEN,
            'severity' => Alarm::SEVERITY_WARNING,
            'is_resolved' => false,
        ]);
    }

    public function test_alarm_is_created_for_pf_fault_or_warning(): void
    {
        $device = $this->makeDeviceForIngestion();

        $this->ingestTelemetry($device, [
            'pf_status' => 'warning',
        ]);

        $this->assertDatabaseHas('alarms', [
            'device_id' => $device->id,
            'type' => Alarm::TYPE_PF_FAULT,
            'severity' => Alarm::SEVERITY_WARNING,
            'is_resolved' => false,
        ]);
    }

    public function test_duplicate_active_alarms_are_not_created(): void
    {
        $device = $this->makeDeviceForIngestion();

        $this->ingestTelemetry($device, ['temperature_1' => 7.5]);
        $this->ingestTelemetry($device, ['temperature_1' => 8.2]);

        $this->assertSame(1, Alarm::query()
            ->where('device_id', $device->id)
            ->where('type', Alarm::TYPE_HIGH_TEMPERATURE)
            ->where('is_resolved', false)
            ->count());

        $alarm = Alarm::query()
            ->where('device_id', $device->id)
            ->where('type', Alarm::TYPE_HIGH_TEMPERATURE)
            ->where('is_resolved', false)
            ->firstOrFail();

        $this->assertSame(8.2, $alarm->value);
    }

    public function test_alarm_is_resolved_when_telemetry_returns_to_normal(): void
    {
        $device = $this->makeDeviceForIngestion();

        $this->ingestTelemetry($device, ['temperature_1' => 7.5]);
        $this->ingestTelemetry($device, ['temperature_1' => 4.5]);

        $alarm = Alarm::query()
            ->where('device_id', $device->id)
            ->where('type', Alarm::TYPE_HIGH_TEMPERATURE)
            ->firstOrFail();

        $this->assertTrue($alarm->is_resolved);
        $this->assertNotNull($alarm->resolved_at);
    }

    public function test_customer_cannot_see_or_resolve_another_customers_alarms(): void
    {
        [$customer, $user] = $this->makeCustomerUser('owned-user');
        [$otherCustomer] = $this->makeCustomerUser('other-user');

        Device::query()->create([
            'customer_id' => $customer->id,
            'device_code' => 'owned-device',
            'name' => 'Owned Device',
            'last_seen_at' => now(),
        ]);

        $otherDevice = Device::query()->create([
            'customer_id' => $otherCustomer->id,
            'device_code' => 'other-device',
            'name' => 'Other Device',
            'last_seen_at' => now(),
        ]);

        $otherAlarm = $otherDevice->alarms()->create([
            'type' => Alarm::TYPE_DOOR_OPEN,
            'severity' => Alarm::SEVERITY_WARNING,
            'message' => 'Door is open.',
            'triggered_at' => now(),
        ]);

        $this->actingAs($user)
            ->getJson('/api/alarms')
            ->assertOk()
            ->assertJsonMissing(['id' => $otherAlarm->id]);

        $this->actingAs($user)
            ->postJson("/api/alarms/{$otherAlarm->id}/resolve")
            ->assertNotFound();

        $this->assertFalse($otherAlarm->refresh()->is_resolved);
    }

    public function test_admin_can_list_create_and_update_clients(): void
    {
        $admin = $this->makeAdminUser();

        $createdResponse = $this->actingAs($admin)
            ->postJson('/api/admin/customers', [
                'name' => 'Regional Blood Center',
                'contact_name' => 'Lab Manager',
                'phone' => '+1 555 0111',
                'email' => 'lab@example.com',
                'notes' => 'Primary client account.',
            ])
            ->assertCreated()
            ->assertJsonPath('customer.name', 'Regional Blood Center')
            ->assertJsonPath('customer.contact_name', 'Lab Manager');

        $customerId = $createdResponse->json('customer.id');

        $this->actingAs($admin)
            ->putJson("/api/admin/customers/{$customerId}", [
                'name' => 'Regional Blood Center Updated',
                'contact_name' => 'Operations Lead',
                'phone' => '+1 555 0112',
                'email' => 'ops@example.com',
                'notes' => 'Updated client account.',
            ])
            ->assertOk()
            ->assertJsonPath('customer.name', 'Regional Blood Center Updated')
            ->assertJsonPath('customer.contact_name', 'Operations Lead');

        $this->actingAs($admin)
            ->getJson('/api/admin/customers')
            ->assertOk()
            ->assertJsonFragment(['name' => 'Regional Blood Center Updated']);
    }

    public function test_client_user_cannot_access_admin_apis(): void
    {
        [, $user] = $this->makeCustomerUser('client-admin-denied');

        $this->actingAs($user)
            ->getJson('/api/admin/customers')
            ->assertForbidden();
    }

    public function test_admin_can_create_client_user_and_password_is_hashed(): void
    {
        $admin = $this->makeAdminUser();
        $customer = Customer::query()->create(['name' => 'Managed Client']);

        $this->actingAs($admin)
            ->postJson('/api/admin/users', [
                'name' => 'Managed Operator',
                'username' => 'managed-operator',
                'password' => 'new-password',
                'role' => User::ROLE_CLIENT,
                'customer_id' => $customer->id,
            ])
            ->assertCreated()
            ->assertJsonPath('user.username', 'managed-operator')
            ->assertJsonPath('user.customer.name', 'Managed Client')
            ->assertJsonMissing(['password' => 'new-password']);

        $createdUser = User::query()->where('username', 'managed-operator')->firstOrFail();

        $this->assertTrue(Hash::check('new-password', $createdUser->password));
        $this->assertNotSame('new-password', $createdUser->password);
    }

    public function test_admin_can_create_refrigerator_assigned_to_client(): void
    {
        $admin = $this->makeAdminUser();
        $customer = Customer::query()->create(['name' => 'Device Client']);

        $this->actingAs($admin)
            ->postJson('/api/admin/devices', [
                'customer_id' => $customer->id,
                'name' => 'Blood Refrigerator C',
                'device_code' => 'blood-fridge-c',
                'serial_number' => 'SN-BR-C',
                'location' => 'Main lab',
                'notes' => 'New monitored refrigerator.',
            ])
            ->assertCreated()
            ->assertJsonPath('device.name', 'Blood Refrigerator C')
            ->assertJsonPath('device.customer.name', 'Device Client');

        $this->assertDatabaseHas('devices', [
            'customer_id' => $customer->id,
            'device_code' => 'blood-fridge-c',
        ]);
    }

    public function test_admin_can_inspect_recent_raw_telemetry_payloads(): void
    {
        $admin = $this->makeAdminUser();
        $customer = Customer::query()->create(['name' => 'Raw Payload Client']);

        $device = Device::query()->create([
            'customer_id' => $customer->id,
            'device_code' => 'raw-payload-device',
            'name' => 'Raw Payload Refrigerator',
        ]);

        $telemetry = $device->telemetry()->create([
            'temperature_1' => 4.5,
            'raw_payload' => [
                'device_code' => 'raw-payload-device',
                'sensor1' => 4.5,
            ],
            'recorded_at' => now(),
        ]);

        $this->actingAs($admin)
            ->getJson("/api/admin/devices/{$device->id}/raw-telemetry")
            ->assertOk()
            ->assertJsonPath('telemetry.0.id', $telemetry->id)
            ->assertJsonPath('telemetry.0.raw_payload.sensor1', 4.5);
    }

    public function test_client_user_cannot_inspect_admin_raw_telemetry_payloads(): void
    {
        [$customer, $user] = $this->makeCustomerUser('raw-denied-user');

        $device = Device::query()->create([
            'customer_id' => $customer->id,
            'device_code' => 'raw-denied-device',
            'name' => 'Raw Denied Refrigerator',
        ]);

        $this->actingAs($user)
            ->getJson("/api/admin/devices/{$device->id}/raw-telemetry")
            ->assertForbidden();
    }

    public function test_admin_device_code_uniqueness_is_enforced(): void
    {
        $admin = $this->makeAdminUser();
        $customer = Customer::query()->create(['name' => 'Unique Device Client']);

        Device::query()->create([
            'customer_id' => $customer->id,
            'device_code' => 'duplicate-code',
            'name' => 'Existing Refrigerator',
        ]);

        $this->actingAs($admin)
            ->postJson('/api/admin/devices', [
                'customer_id' => $customer->id,
                'name' => 'Duplicate Refrigerator',
                'device_code' => 'duplicate-code',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('device_code');
    }

    public function test_admin_can_reset_user_password(): void
    {
        $admin = $this->makeAdminUser();
        [, $user] = $this->makeCustomerUser('reset-user');

        $this->actingAs($admin)
            ->postJson("/api/admin/users/{$user->id}/reset-password", [
                'password' => 'reset-password',
            ])
            ->assertOk();

        $this->assertTrue(Hash::check('reset-password', $user->refresh()->password));
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
            'role' => User::ROLE_CLIENT,
        ]);

        return [$customer, $user];
    }

    private function makeAdminUser(string $username = 'admin-user'): User
    {
        return User::query()->create([
            'customer_id' => null,
            'name' => 'Admin User',
            'username' => $username.'-'.Str::random(8),
            'password' => Hash::make('password'),
            'role' => User::ROLE_ADMIN,
        ]);
    }

    private function makeDeviceForIngestion(): Device
    {
        config([
            'services.ingestion.secret' => 'test-secret',
            'alarms.temperature.min_celsius' => 2,
            'alarms.temperature.max_celsius' => 6,
            'alarms.door_open_is_alarm' => true,
            'alarms.offline_after_minutes' => 5,
        ]);

        [$customer] = $this->makeCustomerUser('alarm-user-'.Str::random(8));

        return Device::query()->create([
            'customer_id' => $customer->id,
            'device_code' => 'device-'.Str::random(8),
            'name' => 'Blood Refrigerator',
        ]);
    }

    private function ingestTelemetry(Device $device, array $overrides = []): void
    {
        $payload = [
            'device_code' => $device->device_code,
            'temperature_1' => 4.1,
            'temperature_2' => 4.2,
            'temperature_3' => 4.3,
            'temperature_4' => 4.4,
            'door_status' => 'closed',
            'pf_status' => 'normal',
            'timestamp' => now()->toISOString(),
        ];

        $this->withHeader('X-Ingestion-Secret', 'test-secret')
            ->postJson('/api/ingest/telemetry', [...$payload, ...$overrides])
            ->assertCreated();
    }
}

<?php

namespace App\Console\Commands;

use App\Services\Telemetry\MqttTelemetryMessageHandler;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use PhpMqtt\Client\ConnectionSettings;
use PhpMqtt\Client\MqttClient;
use Throwable;

class ListenForMqttTelemetry extends Command
{
    protected $signature = 'mqtt:listen {--once : Stop after the first valid MQTT message}';

    protected $description = 'Listen for MQTT telemetry messages and store them using the telemetry ingestion service.';

    public function handle(MqttTelemetryMessageHandler $messageHandler): int
    {
        if (! class_exists(MqttClient::class)) {
            $this->error('The php-mqtt/client package is not installed. Run composer install first.');

            return self::FAILURE;
        }

        $config = $this->validatedMqttConfig();

        if ($config === null) {
            return self::FAILURE;
        }

        $settings = (new ConnectionSettings)
            ->setUsername(config('mqtt.username'))
            ->setPassword(config('mqtt.password'))
            ->setKeepAliveInterval($config['keep_alive']);

        if ($config['use_tls']) {
            $settings->setUseTls(true);
        }

        $mqtt = new MqttClient($config['host'], $config['port'], $config['client_id']);

        try {
            $this->info("Connecting to MQTT {$config['host']}:{$config['port']} as {$config['client_id']}.");
            Log::info('Connecting to MQTT broker.', [
                'host' => $config['host'],
                'port' => $config['port'],
                'client_id' => $config['client_id'],
                'use_tls' => $config['use_tls'],
            ]);

            $mqtt->connect($settings, true);
            $this->info("Connected. Subscribing to {$config['topic']} with QoS {$config['qos']}.");
            Log::info('Subscribed to MQTT telemetry topic.', [
                'topic' => $config['topic'],
                'qos' => $config['qos'],
            ]);

            $mqtt->subscribe($config['topic'], function (string $topic, string $message) use ($messageHandler, $mqtt): void {
                $this->line("Received MQTT message on {$topic}.");
                $result = $messageHandler->handle($topic, $message);

                match ($result->status) {
                    'stored' => $this->info($result->message),
                    'ignored' => $this->warn($result->message),
                    default => $this->error($result->message),
                };

                Log::log($result->wasStored() ? 'info' : 'warning', 'MQTT telemetry message handled.', [
                    'topic' => $topic,
                    'status' => $result->status,
                    'message' => $result->message,
                    'telemetry_id' => $result->telemetry?->id,
                    'device_id' => $result->telemetry?->device_id,
                ]);

                if ($result->wasStored()) {
                    if ($this->option('once')) {
                        $mqtt->interrupt();
                    }
                }
            }, $config['qos']);

            $mqtt->loop(true);
            $mqtt->disconnect();
            $this->info('MQTT listener stopped.');
        } catch (Throwable $exception) {
            report($exception);
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        return self::SUCCESS;
    }

    private function validatedMqttConfig(): ?array
    {
        $config = [
            'host' => trim((string) config('mqtt.host')),
            'port' => (int) config('mqtt.port'),
            'topic' => trim((string) config('mqtt.topic')),
            'client_id' => trim((string) config('mqtt.client_id')),
            'qos' => (int) config('mqtt.qos'),
            'keep_alive' => (int) config('mqtt.keep_alive'),
            'use_tls' => (bool) config('mqtt.use_tls'),
        ];

        $errors = [];

        if ($config['host'] === '') {
            $errors[] = 'MQTT_HOST is required.';
        }

        if ($config['topic'] === '') {
            $errors[] = 'MQTT_TOPIC is required.';
        }

        if ($config['client_id'] === '') {
            $errors[] = 'MQTT_CLIENT_ID is required.';
        }

        if ($config['port'] < 1 || $config['port'] > 65535) {
            $errors[] = 'MQTT_PORT must be between 1 and 65535.';
        }

        if (! in_array($config['qos'], [0, 1, 2], true)) {
            $errors[] = 'MQTT_QOS must be 0, 1, or 2.';
        }

        if ($config['keep_alive'] < 1) {
            $errors[] = 'MQTT_KEEP_ALIVE must be at least 1.';
        }

        foreach ($errors as $error) {
            $this->error($error);
        }

        return $errors === [] ? $config : null;
    }
}

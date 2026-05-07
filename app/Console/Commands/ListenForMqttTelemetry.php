<?php

namespace App\Console\Commands;

use App\Services\Telemetry\TelemetryIngestionService;
use Illuminate\Console\Command;
use JsonException;
use PhpMqtt\Client\ConnectionSettings;
use PhpMqtt\Client\MqttClient;
use Throwable;

class ListenForMqttTelemetry extends Command
{
    protected $signature = 'mqtt:listen {--once : Stop after the first valid MQTT message}';

    protected $description = 'Listen for MQTT telemetry messages and store them using the telemetry ingestion service.';

    public function handle(TelemetryIngestionService $ingestionService): int
    {
        if (! class_exists(MqttClient::class)) {
            $this->error('The php-mqtt/client package is not installed. Run composer install first.');

            return self::FAILURE;
        }

        $host = (string) config('mqtt.host');
        $port = (int) config('mqtt.port');
        $topic = (string) config('mqtt.topic');
        $clientId = (string) config('mqtt.client_id');

        $settings = (new ConnectionSettings)
            ->setUsername(config('mqtt.username'))
            ->setPassword(config('mqtt.password'))
            ->setKeepAliveInterval((int) config('mqtt.keep_alive'));

        if ((bool) config('mqtt.use_tls')) {
            $settings->setUseTls(true);
        }

        $mqtt = new MqttClient($host, $port, $clientId);

        try {
            $this->info("Connecting to MQTT {$host}:{$port}, topic {$topic}");

            $mqtt->connect($settings, true);
            $mqtt->subscribe($topic, function (string $topic, string $message) use ($ingestionService, $mqtt): void {
                try {
                    $payload = json_decode($message, true, 512, JSON_THROW_ON_ERROR);

                    if (! is_array($payload)) {
                        $this->warn("Ignoring MQTT message on {$topic}: JSON root must be an object.");

                        return;
                    }

                    $telemetry = $ingestionService->ingest($payload);

                    $this->info("Stored telemetry #{$telemetry->id} from {$telemetry->device->device_code}.");

                    if ($this->option('once')) {
                        $mqtt->interrupt();
                    }
                } catch (JsonException $exception) {
                    $this->warn("Ignoring invalid JSON on {$topic}: {$exception->getMessage()}");
                } catch (Throwable $exception) {
                    report($exception);
                    $this->error("Failed to ingest MQTT message on {$topic}: {$exception->getMessage()}");
                }
            }, (int) config('mqtt.qos'));

            $mqtt->loop(true);
            $mqtt->disconnect();
        } catch (Throwable $exception) {
            report($exception);
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}

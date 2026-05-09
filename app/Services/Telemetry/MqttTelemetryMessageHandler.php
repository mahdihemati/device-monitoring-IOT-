<?php

namespace App\Services\Telemetry;

use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use JsonException;
use Throwable;

class MqttTelemetryMessageHandler
{
    public function __construct(
        private readonly TelemetryIngestionService $ingestionService,
    ) {
    }

    public function handle(string $topic, string $message): MqttTelemetryIngestionResult
    {
        try {
            $payload = json_decode($message, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            return MqttTelemetryIngestionResult::ignored("Invalid JSON on {$topic}: {$exception->getMessage()}");
        }

        if (! is_array($payload) || array_is_list($payload)) {
            return MqttTelemetryIngestionResult::ignored("JSON root on {$topic} must be an object.");
        }

        try {
            $telemetry = $this->ingestionService->ingest($payload, $topic);

            return MqttTelemetryIngestionResult::stored($telemetry);
        } catch (ValidationException $exception) {
            return MqttTelemetryIngestionResult::failed($this->validationMessage($topic, $exception));
        } catch (Throwable $exception) {
            report($exception);
            Log::error('Unexpected MQTT telemetry ingestion failure.', [
                'topic' => $topic,
                'exception' => $exception::class,
                'message' => $exception->getMessage(),
            ]);

            return MqttTelemetryIngestionResult::failed("Unexpected ingestion error on {$topic}: {$exception->getMessage()}");
        }
    }

    private function validationMessage(string $topic, ValidationException $exception): string
    {
        $firstMessage = collect($exception->errors())->flatten()->first();

        return "Validation failed on {$topic}: ".($firstMessage ?: $exception->getMessage());
    }
}

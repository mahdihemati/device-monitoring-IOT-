<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Telemetry\TelemetryIngestionAuthenticator;
use App\Services\Telemetry\TelemetryIngestionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TelemetryIngestController extends Controller
{
    public function __invoke(
        Request $request,
        TelemetryIngestionAuthenticator $authenticator,
        TelemetryIngestionService $ingestionService,
    ): JsonResponse
    {
        $authenticator->authorize($request);

        $telemetry = $ingestionService->ingest(
            $request->all(),
            $request->header('X-MQTT-Topic') ?: $request->input('topic'),
        );

        return response()->json([
            'message' => 'Telemetry ingested.',
            'telemetry_id' => $telemetry->id,
            'device_id' => $telemetry->device_id,
        ], 201);
    }
}

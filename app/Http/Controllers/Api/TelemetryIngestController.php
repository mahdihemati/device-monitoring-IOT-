<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Telemetry\TelemetryIngestionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TelemetryIngestController extends Controller
{
    public function __invoke(Request $request, TelemetryIngestionService $ingestionService): JsonResponse
    {
        $configuredSecret = (string) config('services.ingestion.secret');
        $providedSecret = (string) $request->header('X-Ingestion-Secret');

        abort_unless($configuredSecret !== '' && hash_equals($configuredSecret, $providedSecret), 403);

        $telemetry = $ingestionService->ingest($request->all());

        return response()->json([
            'message' => 'Telemetry ingested.',
            'telemetry_id' => $telemetry->id,
            'device_id' => $telemetry->device_id,
        ], 201);
    }
}

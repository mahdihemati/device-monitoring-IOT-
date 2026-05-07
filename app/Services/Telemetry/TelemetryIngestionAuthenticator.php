<?php

namespace App\Services\Telemetry;

use Illuminate\Http\Request;

class TelemetryIngestionAuthenticator
{
    public function authorize(Request $request): void
    {
        if ($this->hasValidSharedSecret($request)) {
            return;
        }

        if ($this->hasValidDeviceApiKey($request)) {
            return;
        }

        abort(403);
    }

    private function hasValidSharedSecret(Request $request): bool
    {
        $configuredSecret = (string) config('services.ingestion.secret');
        $providedSecret = (string) $request->header('X-Ingestion-Secret');

        return $configuredSecret !== '' && hash_equals($configuredSecret, $providedSecret);
    }

    private function hasValidDeviceApiKey(Request $request): bool
    {
        // TODO: Store a hashed per-device API key and verify X-Device-Key against device_code.
        return false;
    }
}

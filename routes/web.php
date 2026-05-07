<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DeviceController;
use App\Http\Controllers\Api\TelemetryIngestController;
use Illuminate\Support\Facades\Route;

Route::prefix('api')->group(function (): void {
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth');
    Route::get('/me', [AuthController::class, 'me'])->middleware('auth');

    Route::middleware('auth')->group(function (): void {
        Route::get('/devices', [DeviceController::class, 'index']);
        Route::get('/devices/{device}', [DeviceController::class, 'show']);
        Route::get('/devices/{device}/latest', [DeviceController::class, 'latest']);
        Route::get('/devices/{device}/history', [DeviceController::class, 'history']);
    });

    Route::post('/ingest/telemetry', TelemetryIngestController::class)->middleware('throttle:ingestion');
});

Route::view('/{path?}', 'app')->where('path', '^(?!api).*$');

<?php

use App\Http\Controllers\Api\AlarmController;
use App\Http\Controllers\Api\Admin\AdminCustomerController;
use App\Http\Controllers\Api\Admin\AdminDeviceController;
use App\Http\Controllers\Api\Admin\AdminUserController;
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
        Route::get('/devices/{device}/history/export', [DeviceController::class, 'exportHistory']);
        Route::get('/alarms', [AlarmController::class, 'index']);
        Route::get('/alarms/active', [AlarmController::class, 'active']);
        Route::post('/alarms/{alarm}/resolve', [AlarmController::class, 'resolve']);

        Route::prefix('admin')->group(function (): void {
            Route::get('/customers', [AdminCustomerController::class, 'index']);
            Route::post('/customers', [AdminCustomerController::class, 'store']);
            Route::get('/customers/{customer}', [AdminCustomerController::class, 'show']);
            Route::put('/customers/{customer}', [AdminCustomerController::class, 'update']);
            Route::delete('/customers/{customer}', [AdminCustomerController::class, 'destroy']);

            Route::get('/users', [AdminUserController::class, 'index']);
            Route::post('/users', [AdminUserController::class, 'store']);
            Route::put('/users/{user}', [AdminUserController::class, 'update']);
            Route::delete('/users/{user}', [AdminUserController::class, 'destroy']);
            Route::post('/users/{user}/reset-password', [AdminUserController::class, 'resetPassword']);

            Route::get('/devices', [AdminDeviceController::class, 'index']);
            Route::post('/devices', [AdminDeviceController::class, 'store']);
            Route::get('/devices/{device}/raw-telemetry', [AdminDeviceController::class, 'rawTelemetry']);
            Route::get('/devices/{device}', [AdminDeviceController::class, 'show']);
            Route::put('/devices/{device}', [AdminDeviceController::class, 'update']);
            Route::delete('/devices/{device}', [AdminDeviceController::class, 'destroy']);
        });
    });

    Route::post('/ingest/telemetry', TelemetryIngestController::class)->middleware('throttle:ingestion');
});

Route::view('/{path?}', 'app')->where('path', '^(?!api).*$');

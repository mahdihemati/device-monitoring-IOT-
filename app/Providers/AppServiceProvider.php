<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('login', function (Request $request): Limit {
            $username = (string) $request->input('username', 'anonymous');
            $limit = max(1, (int) config('services.rate_limits.login_per_minute', 5));

            return Limit::perMinute($limit)->by($username.'|'.$request->ip());
        });

        RateLimiter::for('ingestion', function (Request $request): Limit {
            $deviceCode = (string) $request->input('device_code', 'unknown-device');
            $limit = max(1, (int) config('services.rate_limits.ingestion_per_minute', 120));

            return Limit::perMinute($limit)->by($deviceCode.'|'.$request->ip());
        });
    }
}

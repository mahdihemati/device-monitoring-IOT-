<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Device extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_id',
        'device_code',
        'name',
        'serial_number',
        'last_seen_at',
    ];

    protected function casts(): array
    {
        return [
            'last_seen_at' => 'datetime',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function telemetry(): HasMany
    {
        return $this->hasMany(Telemetry::class);
    }

    public function alarms(): HasMany
    {
        return $this->hasMany(Alarm::class);
    }

    public function activeAlarms(): HasMany
    {
        return $this->hasMany(Alarm::class)->where('is_resolved', false);
    }

    public function latestTelemetry(): HasOne
    {
        return $this->hasOne(Telemetry::class)
            ->orderByRaw('recorded_at is null asc')
            ->latest('recorded_at')
            ->latest('id');
    }
}

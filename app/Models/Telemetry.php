<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Telemetry extends Model
{
    use HasFactory;

    protected $table = 'telemetry';

    protected $fillable = [
        'device_id',
        'temperature_1',
        'temperature_2',
        'temperature_3',
        'temperature_4',
        'door_status',
        'pf_status',
        'raw_payload',
        'recorded_at',
    ];

    protected function casts(): array
    {
        return [
            'temperature_1' => 'float',
            'temperature_2' => 'float',
            'temperature_3' => 'float',
            'temperature_4' => 'float',
            'raw_payload' => 'array',
            'recorded_at' => 'datetime',
        ];
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class);
    }
}

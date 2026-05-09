<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Alarm extends Model
{
    use HasFactory;

    public const TYPE_HIGH_TEMPERATURE = 'HIGH_TEMPERATURE';
    public const TYPE_LOW_TEMPERATURE = 'LOW_TEMPERATURE';
    public const TYPE_DOOR_OPEN = 'DOOR_OPEN';
    public const TYPE_PF_FAULT = 'PF_FAULT';
    public const TYPE_DEVICE_OFFLINE = 'DEVICE_OFFLINE';
    public const TYPE_INVALID_SENSOR_READING = 'INVALID_SENSOR_READING';

    public const SEVERITY_WARNING = 'warning';
    public const SEVERITY_CRITICAL = 'critical';

    protected $fillable = [
        'device_id',
        'type',
        'severity',
        'message',
        'value',
        'threshold',
        'is_resolved',
        'resolved_at',
        'triggered_at',
    ];

    protected function casts(): array
    {
        return [
            'value' => 'float',
            'threshold' => 'float',
            'is_resolved' => 'boolean',
            'resolved_at' => 'datetime',
            'triggered_at' => 'datetime',
        ];
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class);
    }
}

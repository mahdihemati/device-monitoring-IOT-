<?php

namespace App\Services\Telemetry;

use App\Models\Device;
use App\Models\Telemetry;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class TelemetryHistoryQueryService
{
    public function query(Device $device, Request $request): Builder
    {
        $from = $this->dateBoundary($request->string('from')->toString(), endOfDay: false);
        $to = $this->dateBoundary($request->string('to')->toString(), endOfDay: true);

        return Telemetry::query()
            ->where('device_id', $device->id)
            ->when($from, fn (Builder $query): Builder => $query->where('recorded_at', '>=', $from))
            ->when($to, fn (Builder $query): Builder => $query->where('recorded_at', '<=', $to));
    }

    /**
     * @return Collection<int, Telemetry>
     */
    public function latest(Device $device, Request $request): Collection
    {
        return $this->query($device, $request)
            ->orderByRaw('recorded_at is null asc')
            ->latest('recorded_at')
            ->latest('id')
            ->limit($this->limit($request))
            ->get();
    }

    public function exportQuery(Device $device, Request $request): Builder
    {
        return $this->query($device, $request)
            ->orderByRaw('recorded_at is null asc')
            ->oldest('recorded_at')
            ->oldest('id')
            ->limit($this->limit($request, default: 1000, max: 5000));
    }

    public function limit(Request $request, int $default = 300, int $max = 1000): int
    {
        return max(1, min((int) $request->integer('limit', $default), $max));
    }

    private function dateBoundary(string $value, bool $endOfDay): ?CarbonImmutable
    {
        $value = trim($value);

        if ($value === '') {
            return null;
        }

        $date = CarbonImmutable::parse($value);

        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) === 1) {
            return $endOfDay ? $date->endOfDay() : $date->startOfDay();
        }

        return $date;
    }
}

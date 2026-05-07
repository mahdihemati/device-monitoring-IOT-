import { ArrowRight, Cpu } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Device } from '../types';
import { formatDateTime, formatTemperature } from '../utils/format';
import { MetricTile } from './MetricTile';
import { StatusBadge } from './StatusBadge';

export function DeviceSummaryCard({ device }: { device: Device }) {
    const latest = device.latest_telemetry;

    return (
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-200 hover:shadow-md">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                        <Cpu className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                        <h2 className="truncate text-base font-semibold text-slate-950">{device.name}</h2>
                        <p className="mt-1 font-mono text-xs text-slate-500">{device.device_code}</p>
                        <p className="mt-2 text-xs text-slate-500">Last seen {formatDateTime(device.last_seen_at)}</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge value={latest?.door_status ?? null} type="door" />
                    <StatusBadge value={latest?.pf_status ?? null} type="pf" />
                    <Link
                        to={`/devices/${device.id}`}
                        className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                    >
                        Details
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <MetricTile label="Temperature 1" value={formatTemperature(latest?.temperature_1 ?? null)} />
                <MetricTile label="Temperature 2" value={formatTemperature(latest?.temperature_2 ?? null)} />
                <MetricTile label="Temperature 3" value={formatTemperature(latest?.temperature_3 ?? null)} />
                <MetricTile label="Temperature 4" value={formatTemperature(latest?.temperature_4 ?? null)} />
            </div>
        </article>
    );
}

import { ArrowRight, Clock3, Hash, Thermometer } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Device } from '../types';
import { formatDateTime, formatTemperature } from '../utils/format';
import { getRefrigeratorStatus } from '../utils/refrigeratorStatus';
import { OverallStatusBadge } from './OverallStatusBadge';
import { StatusBadge } from './StatusBadge';

const sensorLabels = ['Sensor 1', 'Sensor 2', 'Sensor 3', 'Sensor 4'] as const;

export function DeviceSummaryCard({ device }: { device: Device }) {
    const latest = device.latest_telemetry;
    const status = getRefrigeratorStatus(device);
    const sensorValues = [
        latest?.temperature_1 ?? null,
        latest?.temperature_2 ?? null,
        latest?.temperature_3 ?? null,
        latest?.temperature_4 ?? null,
    ];

    return (
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-200 hover:shadow-md">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700 ring-1 ring-sky-100">
                        <Thermometer className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <h2 className="truncate text-base font-semibold text-slate-950">{device.name}</h2>
                            <OverallStatusBadge level={status.level} label={status.label} />
                        </div>
                        <div className="mt-3 grid gap-1.5 text-xs text-slate-500 sm:grid-cols-2">
                            <span className="inline-flex min-w-0 items-center gap-1.5">
                                <Hash className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                <span className="shrink-0">Code</span>
                                <span className="truncate font-mono text-slate-700">{device.device_code}</span>
                            </span>
                            <span className="inline-flex min-w-0 items-center gap-1.5">
                                <Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                <span className="shrink-0">Last seen</span>
                                <span className="truncate text-slate-700">{formatDateTime(device.last_seen_at)}</span>
                            </span>
                        </div>
                        <p className="mt-2 text-xs font-medium text-slate-500">{status.detail}</p>
                    </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center xl:justify-end">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold uppercase text-slate-500">Door</span>
                        <StatusBadge value={latest?.door_status ?? null} type="door" />
                        <span className="text-xs font-semibold uppercase text-slate-500">PF</span>
                        <StatusBadge value={latest?.pf_status ?? null} type="pf" />
                    </div>
                    <Link
                        to={`/devices/${device.id}`}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700"
                    >
                        View Detail
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {sensorValues.map((value, index) => (
                    <div key={sensorLabels[index]} className="rounded-md bg-slate-50 px-3 py-3 ring-1 ring-slate-200">
                        <p className="text-xs font-semibold uppercase text-slate-500">{sensorLabels[index]}</p>
                        <p className="mt-1 text-lg font-semibold text-slate-950">{formatTemperature(value)}</p>
                    </div>
                ))}
            </div>
        </article>
    );
}

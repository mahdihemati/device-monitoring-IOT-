import { ArrowRight, Clock3, Hash, ShieldCheck, Thermometer } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Device } from '../types';
import { formatDateTime, formatTemperature } from '../utils/format';
import type { RefrigeratorStatusLevel } from '../utils/refrigeratorStatus';
import { getRefrigeratorStatus } from '../utils/refrigeratorStatus';
import { OverallStatusBadge } from './OverallStatusBadge';
import { StatusBadge } from './StatusBadge';

const sensorLabels = ['Sensor 1', 'Sensor 2', 'Sensor 3', 'Sensor 4'] as const;

const statusAccentStyles: Record<RefrigeratorStatusLevel, string> = {
    normal: 'border-l-emerald-400',
    warning: 'border-l-amber-400',
    critical: 'border-l-rose-500',
    offline: 'border-l-slate-400',
};

export function DeviceSummaryCard({ device }: { device: Device }) {
    const latest = device.latest_telemetry;
    const status = getRefrigeratorStatus(device);
    const activeAlarmCount = device.active_alarm_count ?? 0;
    const sensorValues = [
        latest?.temperature_1 ?? null,
        latest?.temperature_2 ?? null,
        latest?.temperature_3 ?? null,
        latest?.temperature_4 ?? null,
    ];

    return (
        <article className={`flex h-full flex-col rounded-lg border border-l-4 border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md ${statusAccentStyles[status.level]}`}>
            <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700 ring-1 ring-sky-100">
                    <Thermometer className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                    <div className="flex flex-col gap-2">
                        <h2 className="truncate text-base font-semibold text-slate-950" title={device.name}>{device.name}</h2>
                        <div className="flex flex-wrap items-center gap-2">
                            <OverallStatusBadge level={status.level} label={status.label} />
                            <span className="inline-flex min-h-8 items-center rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600">
                                {activeAlarmCount} active alarm{activeAlarmCount === 1 ? '' : 's'}
                            </span>
                        </div>
                    </div>
                    <div className="mt-3 grid gap-1.5 text-xs text-slate-500">
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

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {sensorValues.map((value, index) => (
                    <div key={sensorLabels[index]} className="rounded-md bg-slate-50 px-3 py-3 ring-1 ring-slate-200">
                        <p className="text-xs font-semibold uppercase text-slate-500">{sensorLabels[index]}</p>
                        <p className="mt-1 text-xl font-semibold leading-none text-slate-950">{formatTemperature(value)}</p>
                    </div>
                ))}
            </div>

            <div className="mt-auto space-y-3 pt-4">
                <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                        <p className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-500">
                            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                            Door
                        </p>
                        <StatusBadge value={latest?.door_status ?? null} type="door" />
                    </div>
                    <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                        <p className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-500">
                            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                            PF
                        </p>
                        <StatusBadge value={latest?.pf_status ?? null} type="pf" />
                    </div>
                </div>
                <Link
                    to={`/devices/${device.id}`}
                    aria-label={`View detail for ${device.name}`}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-4 focus:ring-slate-200"
                >
                    View Detail
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
            </div>
        </article>
    );
}

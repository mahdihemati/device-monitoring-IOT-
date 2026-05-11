import { Activity, ArrowLeft, BellRing, Clock3, Download, Hash, ShieldCheck, Thermometer } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Alarm, Device } from '../types';
import { formatDateTime, formatLongDateTime, formatTemperature, formatTemperatureDelta, formatTime } from '../utils/format';
import { alarmCodeLabel, alarmCountText, severityLabels } from '../utils/localization';
import type { RefrigeratorStatusLevel } from '../utils/refrigeratorStatus';
import { getRefrigeratorStatus } from '../utils/refrigeratorStatus';
import { OverallStatusBadge } from './OverallStatusBadge';
import { StatusBadge } from './StatusBadge';

const sensorLabels = ['سنسور ۱', 'سنسور ۲', 'سنسور ۳', 'سنسور ۴'] as const;
const sensorKeys = ['temperature_1', 'temperature_2', 'temperature_3', 'temperature_4'] as const;

const statusAccentStyles: Record<RefrigeratorStatusLevel, string> = {
    normal: 'border-r-emerald-400',
    warning: 'border-r-amber-400',
    critical: 'border-r-rose-500',
    offline: 'border-r-slate-400',
};

export function DeviceSummaryCard({ device, activeAlarms = [] }: { device: Device; activeAlarms?: Alarm[] }) {
    const latest = device.latest_telemetry;
    const status = getRefrigeratorStatus(device);
    const activeAlarmCount = device.active_alarm_count ?? 0;
    const sensorValues = [
        latest?.temperature_1 ?? null,
        latest?.temperature_2 ?? null,
        latest?.temperature_3 ?? null,
        latest?.temperature_4 ?? null,
    ];
    const previous = device.previous_telemetry ?? null;
    const visibleAlarm = activeAlarms[0] ?? null;
    const visibleAlarmTitle = visibleAlarm ? alarmCodeLabel(visibleAlarm.code) ?? visibleAlarm.message : null;

    return (
        <article className={`flex h-full flex-col overflow-hidden rounded-lg border border-r-4 border-slate-200 bg-white shadow-sm shadow-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-md ${statusAccentStyles[status.level]}`}>
            <div className="p-4">
                <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700 ring-1 ring-sky-100">
                            <Thermometer className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                            <h2 className="truncate text-base font-bold text-slate-950" title={device.name}>{device.name}</h2>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                <OverallStatusBadge level={status.level} label={status.label} />
                                <span className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600">
                                    <BellRing className="h-3.5 w-3.5" aria-hidden="true" />
                                    {alarmCountText(activeAlarmCount)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-4 grid gap-2 text-xs text-slate-500">
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                        <Hash className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span className="shrink-0">کد دستگاه</span>
                        <span className="truncate font-mono text-slate-700" dir="ltr">{device.device_code}</span>
                    </span>
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                        <Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span className="shrink-0">آخرین دریافت داده</span>
                        <span className="truncate text-slate-700">{formatDateTime(device.last_seen_at)}</span>
                    </span>
                </div>
                <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium leading-5 text-slate-600 ring-1 ring-slate-100">{status.detail}</p>
                {visibleAlarm ? (
                    <div className="mt-3 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-900">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold">{visibleAlarmTitle}</span>
                            {visibleAlarm.code ? (
                                <span className="rounded-md bg-white px-2 py-0.5 font-mono font-bold text-rose-700 ring-1 ring-rose-100" dir="ltr">
                                    {visibleAlarm.code}
                                </span>
                            ) : null}
                            <span className="font-semibold">{severityLabels[visibleAlarm.severity]}</span>
                        </div>
                        <p className="mt-1 leading-5">شروع هشدار: {formatLongDateTime(visibleAlarm.triggered_at)}</p>
                    </div>
                ) : null}
            </div>

            <div className="border-y border-slate-100 bg-slate-50/80 p-4">
                <div className="grid grid-cols-2 gap-2">
                    {sensorValues.map((value, index) => {
                        const previousValue = previous?.[sensorKeys[index]] ?? null;
                        const delta = value !== null && previousValue !== null ? value - previousValue : null;

                        return (
                        <div key={sensorLabels[index]} className="rounded-md border border-slate-200 bg-white px-3 py-3">
                            <p className="text-xs font-semibold text-slate-500">{sensorLabels[index]}</p>
                            <p className="mt-1 text-xl font-bold leading-none text-slate-950" dir="ltr">{formatTemperature(value)}</p>
                            <p className="mt-2 text-[11px] font-medium leading-5 text-slate-500">
                                تغییر: <span dir="ltr">{formatTemperatureDelta(delta)}</span>
                            </p>
                            <p className="text-[11px] font-medium leading-5 text-slate-500">آخرین دریافت: {formatTime(latest?.recorded_at ?? device.last_seen_at)}</p>
                        </div>
                        );
                    })}
                </div>
            </div>

            <div className="mt-auto space-y-3 p-4">
                <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                        <p className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                            وضعیت درب
                        </p>
                        <StatusBadge value={latest?.door_status ?? null} type="door" />
                    </div>
                    <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                        <p className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                            وضعیت PF
                        </p>
                        <StatusBadge value={latest?.pf_status ?? null} type="pf" />
                    </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                    <Link
                        to={`/devices/${device.id}`}
                        aria-label={`مشاهده نمودار و جزئیات ${device.name}`}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 text-sm font-semibold text-sky-700 transition hover:bg-sky-100 focus:outline-none focus:ring-4 focus:ring-sky-100"
                    >
                        <Activity className="h-4 w-4" aria-hidden="true" />
                        نمودار
                    </Link>
                    <a
                        href={`/api/devices/${device.id}/history/export?limit=1000`}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-sky-200 hover:text-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-100"
                    >
                        <Download className="h-4 w-4" aria-hidden="true" />
                        خروجی
                    </a>
                    <Link
                        to={`/devices/${device.id}`}
                        aria-label={`مشاهده جزئیات ${device.name}`}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-sky-200 hover:text-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-100"
                    >
                        جزئیات
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    </Link>
                </div>
            </div>
        </article>
    );
}

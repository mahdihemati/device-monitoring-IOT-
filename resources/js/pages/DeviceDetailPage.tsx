import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Clock3, Download, Hash, RefreshCw } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { api, getErrorMessage } from '../api/client';
import { AlarmList } from '../components/AlarmList';
import { MetricTile } from '../components/MetricTile';
import { OverallStatusBadge } from '../components/OverallStatusBadge';
import { useOnlineStatus } from '../components/PwaStatus';
import { EmptyState, ErrorBanner, LoadingState } from '../components/StateBlocks';
import { StatusBadge } from '../components/StatusBadge';
import type { Alarm, Device, Telemetry } from '../types';
import { chartTime, formatLongDateTime, formatTemperature } from '../utils/format';
import { formatCount, statusLabels } from '../utils/localization';
import { getRefrigeratorStatus } from '../utils/refrigeratorStatus';

type HistoryPreset = '1h' | '24h' | '7d' | 'custom';

interface HistoryParams {
    limit: number;
    from?: string;
    to?: string;
}

const historyPresetOptions: Array<{ value: HistoryPreset; label: string }> = [
    { value: '1h', label: '۱ ساعت اخیر' },
    { value: '24h', label: '۲۴ ساعت اخیر' },
    { value: '7d', label: '۷ روز اخیر' },
    { value: 'custom', label: 'بازه دلخواه' },
];

function toDateTimeLocalInput(date: Date): string {
    const offsetDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60_000));

    return offsetDate.toISOString().slice(0, 16);
}

function dateTimeInputToIso(value: string): string | undefined {
    return value ? new Date(value).toISOString() : undefined;
}

function buildHistoryParams(preset: HistoryPreset, customFrom: string, customTo: string, limit = 300): HistoryParams {
    const params: HistoryParams = { limit };

    if (preset === '1h') {
        params.from = new Date(Date.now() - (60 * 60 * 1000)).toISOString();
    }

    if (preset === '24h') {
        params.from = new Date(Date.now() - (24 * 60 * 60 * 1000)).toISOString();
    }

    if (preset === '7d') {
        params.from = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)).toISOString();
    }

    if (preset === 'custom') {
        params.from = dateTimeInputToIso(customFrom);
        params.to = dateTimeInputToIso(customTo);
    }

    return params;
}

function buildExportHref(deviceId: string, params: HistoryParams): string {
    const searchParams = new URLSearchParams();

    if (params.from) {
        searchParams.set('from', params.from);
    }

    if (params.to) {
        searchParams.set('to', params.to);
    }

    searchParams.set('limit', String(params.limit));

    return `/api/devices/${deviceId}/history/export?${searchParams.toString()}`;
}

export function DeviceDetailPage() {
    const { deviceId } = useParams<{ deviceId: string }>();
    const [device, setDevice] = useState<Device | null>(null);
    const [latest, setLatest] = useState<Telemetry | null>(null);
    const [history, setHistory] = useState<Telemetry[]>([]);
    const [alarms, setAlarms] = useState<Alarm[]>([]);
    const [resolvingAlarmIds, setResolvingAlarmIds] = useState<Set<number>>(() => new Set());
    const [historyPreset, setHistoryPreset] = useState<HistoryPreset>('24h');
    const [customFrom, setCustomFrom] = useState(() => toDateTimeLocalInput(new Date(Date.now() - (24 * 60 * 60 * 1000))));
    const [customTo, setCustomTo] = useState(() => toDateTimeLocalInput(new Date()));
    const [loading, setLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
    const online = useOnlineStatus();

    const fetchDeviceData = useCallback(async (showRefresh = false, showHistoryLoading = false) => {
        if (! deviceId) {
            return;
        }

        if (! navigator.onLine) {
            setLoading(false);
            setHistoryLoading(false);
            setRefreshing(false);

            return;
        }

        if (showRefresh) {
            setRefreshing(true);
        }

        if (showHistoryLoading) {
            setHistoryLoading(true);
        }

        try {
            const historyParams = buildHistoryParams(historyPreset, customFrom, customTo);
            const [deviceResponse, latestResponse, historyResponse, alarmsResponse] = await Promise.all([
                api.get<{ device: Device }>(`/devices/${deviceId}`),
                api.get<{ telemetry: Telemetry | null }>(`/devices/${deviceId}/latest`),
                api.get<{ telemetry: Telemetry[] }>(`/devices/${deviceId}/history`, { params: historyParams }),
                api.get<{ alarms: Alarm[] }>('/alarms', { params: { device_id: deviceId, limit: 30 } }),
            ]);

            setDevice(deviceResponse.data.device);
            setLatest(latestResponse.data.telemetry);
            setHistory(historyResponse.data.telemetry);
            setAlarms(alarmsResponse.data.alarms);
            setLastUpdatedAt(new Date().toISOString());
            setError(null);
        } catch (caughtError) {
            setError(getErrorMessage(caughtError));
        } finally {
            setLoading(false);
            setHistoryLoading(false);
            setRefreshing(false);
        }
    }, [customFrom, customTo, deviceId, historyPreset]);

    const resolveAlarm = useCallback(async (alarmId: number) => {
        setResolvingAlarmIds((current) => new Set(current).add(alarmId));

        try {
            await api.post(`/alarms/${alarmId}/resolve`);
            await fetchDeviceData(true);
        } catch (caughtError) {
            setError(getErrorMessage(caughtError));
        } finally {
            setResolvingAlarmIds((current) => {
                const next = new Set(current);
                next.delete(alarmId);

                return next;
            });
        }
    }, [fetchDeviceData]);

    useEffect(() => {
        if (! online) {
            setLoading(false);
            setHistoryLoading(false);

            return undefined;
        }

        void fetchDeviceData(false, true);
        const intervalId = window.setInterval(() => {
            void fetchDeviceData(true);
        }, 5000);

        return () => window.clearInterval(intervalId);
    }, [fetchDeviceData, online]);

    const chartData = useMemo(() => [...history].reverse().map((item) => ({
        time: chartTime(item.recorded_at),
        temperature_1: item.temperature_1,
        temperature_2: item.temperature_2,
        temperature_3: item.temperature_3,
        temperature_4: item.temperature_4,
        recorded_at: item.recorded_at,
    })), [history]);

    const activeAlarms = useMemo(() => alarms.filter((alarm) => ! alarm.is_resolved), [alarms]);
    const resolvedAlarms = useMemo(() => alarms.filter((alarm) => alarm.is_resolved), [alarms]);
    const temperatureStats = useMemo(() => {
        const values = history.flatMap((item) => [
            item.temperature_1,
            item.temperature_2,
            item.temperature_3,
            item.temperature_4,
        ]).filter((value): value is number => value !== null);

        if (values.length === 0) {
            return {
                min: null,
                max: null,
                average: null,
                readings: history.length,
            };
        }

        return {
            min: Math.min(...values),
            max: Math.max(...values),
            average: values.reduce((sum, value) => sum + value, 0) / values.length,
            readings: history.length,
        };
    }, [history]);
    const exportHref = deviceId ? buildExportHref(deviceId, buildHistoryParams(historyPreset, customFrom, customTo, 1000)) : '#';

    if (loading) {
        return <LoadingState label="در حال بارگذاری یخچال" />;
    }

    if (! device) {
        return (
            <div className="space-y-4">
                <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-950">
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    یخچال‌ها
                </Link>
                <EmptyState title="یخچال پیدا نشد" message="این یخچال برای سازمان فعلی در دسترس نیست." />
            </div>
        );
    }

    const status = getRefrigeratorStatus(device);
    const latestRecordedAt = latest?.recorded_at ?? device.last_seen_at;

    return (
        <div className="space-y-6">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-950">
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                            یخچال‌ها
                        </Link>
                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-sky-700">جزئیات یخچال</p>
                                <h1 className="mt-1 truncate text-2xl font-bold text-slate-950 sm:text-3xl" title={device.name}>{device.name}</h1>
                            </div>
                            <OverallStatusBadge level={status.level} label={status.label} />
                        </div>
                        <div className="mt-3 flex flex-col gap-2 text-sm text-slate-500 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                            <span className="inline-flex min-w-0 items-center gap-2">
                                <Hash className="h-4 w-4 shrink-0" aria-hidden="true" />
                                <span>کد دستگاه</span>
                                <span className="truncate font-mono text-slate-700" dir="ltr">{device.device_code}</span>
                            </span>
                            <span className="inline-flex min-w-0 items-center gap-2">
                                <Clock3 className="h-4 w-4 shrink-0" aria-hidden="true" />
                                <span>آخرین دریافت داده</span>
                                <span className="truncate font-medium text-slate-700">{formatLongDateTime(device.last_seen_at)}</span>
                            </span>
                        </div>
                        <p className={`mt-3 max-w-3xl rounded-lg px-3 py-2 text-sm font-medium leading-6 ring-1 ${online ? 'bg-slate-50 text-slate-600 ring-slate-100' : 'bg-amber-50 text-amber-900 ring-amber-200'}`}>
                            {online ? status.detail : 'آفلاین هستید؛ داده‌های نمایش‌داده‌شده ممکن است آخرین وضعیت زنده نباشند.'}
                        </p>
                        <p className="mt-2 text-xs font-bold text-slate-500">آخرین به‌روزرسانی: {formatLongDateTime(lastUpdatedAt)}</p>
                    </div>
                    <button
                        type="button"
                        aria-label="به‌روزرسانی جزئیات یخچال"
                        onClick={() => void fetchDeviceData(true)}
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-sky-200 hover:text-sky-700 sm:w-auto"
                    >
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
                        به‌روزرسانی
                    </button>
                </div>
            </div>

            {error ? <ErrorBanner message={error} /> : null}

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70 sm:p-5" aria-labelledby="latest-readings-heading">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h2 id="latest-readings-heading" className="text-lg font-bold text-slate-950">آخرین مقادیر سنسورها</h2>
                        <p className="mt-1 text-sm text-slate-500">آخرین داده دریافت‌شده: {formatLongDateTime(latestRecordedAt)}</p>
                    </div>
                    <OverallStatusBadge level={status.level} label={status.label} />
                </div>

                {! latest ? (
                    <div className="mt-4">
                        <EmptyState title="داده جدیدی وجود ندارد" message="پس از ارسال داده توسط یخچال، مقادیر سنسورها در اینجا نمایش داده می‌شود." />
                    </div>
                ) : null}

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                    <MetricTile label="سنسور ۱" value={formatTemperature(latest?.temperature_1 ?? null)} helper="مقدار فعلی" emphasis />
                    <MetricTile label="سنسور ۲" value={formatTemperature(latest?.temperature_2 ?? null)} helper="مقدار فعلی" emphasis />
                    <MetricTile label="سنسور ۳" value={formatTemperature(latest?.temperature_3 ?? null)} helper="مقدار فعلی" emphasis />
                    <MetricTile label="سنسور ۴" value={formatTemperature(latest?.temperature_4 ?? null)} helper="مقدار فعلی" emphasis />
                    <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 shadow-sm ring-1 ring-white">
                        <p className="text-xs font-semibold text-slate-500">وضعیت درب</p>
                        <div className="mt-3">
                            <StatusBadge value={latest?.door_status ?? null} type="door" />
                        </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 shadow-sm ring-1 ring-white">
                        <p className="text-xs font-semibold text-slate-500">وضعیت PF</p>
                        <div className="mt-3">
                            <StatusBadge value={latest?.pf_status ?? null} type="pf" />
                        </div>
                    </div>
                </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70" aria-labelledby="history-filter-heading">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <h2 id="history-filter-heading" className="text-base font-bold text-slate-950">فیلتر تاریخچه</h2>
                        <p className="mt-1 text-sm text-slate-500">نمودار، جدول و خروجی CSV را بر اساس بازه زمانی اخیر یا دلخواه فیلتر کنید.</p>
                    </div>
                    <a
                        href={exportHref}
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 text-sm font-bold text-white shadow-sm shadow-sky-200 transition hover:bg-sky-700 sm:w-auto"
                    >
                        <Download className="h-4 w-4" aria-hidden="true" />
                        خروجی CSV
                    </a>
                </div>

                <div className="mt-4 flex flex-col gap-3">
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        {historyPresetOptions.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setHistoryPreset(option.value)}
                                className={`h-11 rounded-lg border px-3 text-sm font-bold transition ${
                                    historyPreset === option.value
                                        ? 'border-sky-200 bg-sky-50 text-sky-700 shadow-sm'
                                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>

                    {historyPreset === 'custom' ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="block">
                                <span className="text-xs font-bold text-slate-500">از</span>
                                <input
                                    type="datetime-local"
                                    value={customFrom}
                                    onChange={(event) => setCustomFrom(event.target.value)}
                                    className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                                />
                            </label>
                            <label className="block">
                                <span className="text-xs font-bold text-slate-500">تا</span>
                                <input
                                    type="datetime-local"
                                    value={customTo}
                                    onChange={(event) => setCustomTo(event.target.value)}
                                    className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                                />
                            </label>
                        </div>
                    ) : null}
                </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70">
                    <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-slate-950">تاریخچه دمای سنسورها</h2>
                            <p className="text-sm text-slate-500">آخرین {formatCount(chartData.length)} رکورد</p>
                        </div>
                    </div>

                    {historyLoading ? (
                        <LoadingState label="در حال بارگذاری تاریخچه فیلترشده" />
                    ) : chartData.length === 0 ? (
                        <EmptyState title="داده‌ای برای نمودار وجود ندارد" message="پس از دریافت داده، مقادیر سنسورها روی نمودار نمایش داده می‌شوند." />
                    ) : (
                        <div className="h-72 w-full overflow-hidden sm:h-80" aria-label="نمودار دمای سنسورها" dir="ltr">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
                                    <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 11 }} tickMargin={10} minTickGap={20} />
                                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickMargin={8} width={42} />
                                    <Tooltip
                                        labelFormatter={(_label, payload) => {
                                            const row = payload?.[0]?.payload as { recorded_at?: string | null } | undefined;

                                            return formatLongDateTime(row?.recorded_at ?? null);
                                        }}
                                        contentStyle={{
                                            borderRadius: 8,
                                            borderColor: '#cbd5e1',
                                            boxShadow: '0 12px 24px rgba(15, 23, 42, 0.12)',
                                            direction: 'rtl',
                                            textAlign: 'right',
                                        }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                                    <Line type="monotone" dataKey="temperature_1" name="سنسور ۱" stroke="#2563eb" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                                    <Line type="monotone" dataKey="temperature_2" name="سنسور ۲" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                                    <Line type="monotone" dataKey="temperature_3" name="سنسور ۳" stroke="#f59e0b" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                                    <Line type="monotone" dataKey="temperature_4" name="سنسور ۴" stroke="#be123c" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70" aria-labelledby="history-summary-heading">
                    <h2 id="history-summary-heading" className="text-base font-bold text-slate-950">خلاصه تاریخچه</h2>
                    <p className="mt-1 text-sm text-slate-500">آمار سنسورهای فیلترشده.</p>
                    <div className="mt-4 grid gap-3">
                        <MetricTile label="کمینه" value={formatTemperature(temperatureStats.min)} helper="سنسورهای فیلترشده" />
                        <MetricTile label="بیشینه" value={formatTemperature(temperatureStats.max)} helper="سنسورهای فیلترشده" />
                        <MetricTile label="میانگین" value={formatTemperature(temperatureStats.average)} helper="سنسورهای فیلترشده" />
                        <MetricTile label="تعداد رکورد" value={formatCount(temperatureStats.readings)} helper="رکوردهای بازگشتی" />
                    </div>
                </aside>
            </section>

            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-200/70" aria-labelledby="refrigerator-alarms-heading">
                <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h2 id="refrigerator-alarms-heading" className="text-lg font-bold text-slate-950">هشدارها</h2>
                            <p className="text-sm text-slate-500">هشدارهای فعال و وضعیت‌های رفع‌شده اخیر برای این یخچال.</p>
                        </div>
                        <span className="text-xs font-bold text-slate-500">{formatCount(activeAlarms.length)} فعال</span>
                    </div>
                </div>

                <div className="grid gap-0 lg:grid-cols-2 lg:divide-x-reverse lg:divide-x lg:divide-slate-100">
                    <div>
                        <div className="border-b border-slate-100 px-4 py-3">
                            <h3 className="text-sm font-bold text-slate-950">فعال</h3>
                        </div>
                        <AlarmList
                            alarms={activeAlarms}
                            emptyTitle="هشدار فعالی وجود ندارد"
                            emptyMessage="این یخچال هیچ وضعیت هشدار فعال ندارد."
                            onResolve={(alarmId) => void resolveAlarm(alarmId)}
                            resolvingIds={resolvingAlarmIds}
                            showDevice={false}
                        />
                    </div>
                    <div>
                        <div className="border-b border-slate-100 px-4 py-3">
                            <h3 className="text-sm font-bold text-slate-950">رفع‌شده‌های اخیر</h3>
                        </div>
                        <AlarmList
                            alarms={resolvedAlarms}
                            emptyTitle="هشدار رفع‌شده‌ای وجود ندارد"
                            emptyMessage="پس از عادی شدن شرایط یا ثبت رسیدگی، هشدارهای رفع‌شده در اینجا نمایش داده می‌شوند."
                            showDevice={false}
                        />
                    </div>
                </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-200/70" aria-labelledby="recent-history-heading">
                <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h2 id="recent-history-heading" className="text-base font-bold text-slate-950">تاریخچه اخیر</h2>
                            <p className="text-sm text-slate-500">آخرین {formatCount(history.length)} رکورد داده.</p>
                        </div>
                        <span className="text-xs font-bold text-slate-500">رکوردهای داده</span>
                    </div>
                </div>

                {historyLoading ? (
                    <div className="p-4">
                        <LoadingState label="در حال بارگذاری تاریخچه فیلترشده" />
                    </div>
                ) : history.length === 0 ? (
                    <div className="p-4">
                        <EmptyState title="داده‌ای وجود ندارد" message="رکوردهای اخیر پس از دریافت داده در اینجا نمایش داده می‌شوند." />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-[980px] divide-y divide-slate-200 text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-right font-bold text-slate-600">زمان ثبت</th>
                                    <th className="px-4 py-3 text-right font-bold text-slate-600">سنسور ۱</th>
                                    <th className="px-4 py-3 text-right font-bold text-slate-600">سنسور ۲</th>
                                    <th className="px-4 py-3 text-right font-bold text-slate-600">سنسور ۳</th>
                                    <th className="px-4 py-3 text-right font-bold text-slate-600">سنسور ۴</th>
                                    <th className="px-4 py-3 text-right font-bold text-slate-600">وضعیت درب</th>
                                    <th className="px-4 py-3 text-right font-bold text-slate-600">وضعیت PF</th>
                                    <th className="px-4 py-3 text-right font-bold text-slate-600">وضعیت</th>
                                    <th className="px-4 py-3 text-right font-bold text-slate-600">هشدار</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {history.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50">
                                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatLongDateTime(item.recorded_at)}</td>
                                        <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-900" dir="ltr">{formatTemperature(item.temperature_1)}</td>
                                        <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-900" dir="ltr">{formatTemperature(item.temperature_2)}</td>
                                        <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-900" dir="ltr">{formatTemperature(item.temperature_3)}</td>
                                        <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-900" dir="ltr">{formatTemperature(item.temperature_4)}</td>
                                        <td className="whitespace-nowrap px-4 py-3"><StatusBadge value={item.door_status} type="door" /></td>
                                        <td className="whitespace-nowrap px-4 py-3"><StatusBadge value={item.pf_status} type="pf" /></td>
                                        <td className="whitespace-nowrap px-4 py-3">
                                            <OverallStatusBadge level={item.overall_status ?? 'normal'} label={statusLabels[item.overall_status ?? 'normal']} />
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm font-bold text-slate-700">
                                            {item.alarm_indicator ? 'بله' : 'خیر'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}

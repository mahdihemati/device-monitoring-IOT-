import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Clock3, Download, Hash, RefreshCw } from 'lucide-react';
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
import { EmptyState, ErrorBanner, LoadingState } from '../components/StateBlocks';
import { StatusBadge } from '../components/StatusBadge';
import type { Alarm, Device, Telemetry } from '../types';
import { chartTime, formatLongDateTime, formatTemperature } from '../utils/format';
import { getRefrigeratorStatus } from '../utils/refrigeratorStatus';

type HistoryPreset = '1h' | '24h' | '7d' | 'custom';

interface HistoryParams {
    limit: number;
    from?: string;
    to?: string;
}

const historyPresetOptions: Array<{ value: HistoryPreset; label: string }> = [
    { value: '1h', label: 'Last 1 hour' },
    { value: '24h', label: 'Last 24 hours' },
    { value: '7d', label: 'Last 7 days' },
    { value: 'custom', label: 'Custom range' },
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

    const fetchDeviceData = useCallback(async (showRefresh = false, showHistoryLoading = false) => {
        if (! deviceId) {
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
        void fetchDeviceData(false, true);

        const intervalId = window.setInterval(() => {
            void fetchDeviceData(true);
        }, 5000);

        return () => window.clearInterval(intervalId);
    }, [fetchDeviceData]);

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
        return <LoadingState label="Loading refrigerator" />;
    }

    if (! device) {
        return (
            <div className="space-y-4">
                <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950">
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Refrigerators
                </Link>
                <EmptyState title="Refrigerator not found" message="This refrigerator is not available for the current organization." />
            </div>
        );
    }

    const status = getRefrigeratorStatus(device);
    const latestRecordedAt = latest?.recorded_at ?? device.last_seen_at;

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950">
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                        Refrigerators
                    </Link>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div>
                            <p className="text-sm font-semibold text-sky-700">Refrigerator Detail</p>
                            <h1 className="mt-1 text-2xl font-semibold text-slate-950 sm:text-3xl">{device.name}</h1>
                        </div>
                        <OverallStatusBadge level={status.level} label={status.label} />
                    </div>
                    <div className="mt-3 flex flex-col gap-2 text-sm text-slate-500 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                        <span className="inline-flex min-w-0 items-center gap-2">
                            <Hash className="h-4 w-4 shrink-0" aria-hidden="true" />
                            <span>Code</span>
                            <span className="truncate font-mono text-slate-700">{device.device_code}</span>
                        </span>
                        <span className="inline-flex min-w-0 items-center gap-2">
                            <Clock3 className="h-4 w-4 shrink-0" aria-hidden="true" />
                            <span>Last seen</span>
                            <span className="truncate font-medium text-slate-700">{formatLongDateTime(device.last_seen_at)}</span>
                        </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-600">{status.detail}</p>
                </div>
                <button
                    type="button"
                    aria-label="Refresh refrigerator detail"
                    onClick={() => void fetchDeviceData(true)}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-200 hover:text-sky-700 sm:w-auto"
                >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
                    Refresh
                </button>
            </div>

            {error ? <ErrorBanner message={error} /> : null}

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" aria-labelledby="history-filter-heading">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <h2 id="history-filter-heading" className="text-base font-semibold text-slate-950">History Filter</h2>
                        <p className="mt-1 text-sm text-slate-500">Filter the chart, table, and CSV export by recent or custom time range.</p>
                    </div>
                    <a
                        href={exportHref}
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 sm:w-auto"
                    >
                        <Download className="h-4 w-4" aria-hidden="true" />
                        Export CSV
                    </a>
                </div>

                <div className="mt-4 flex flex-col gap-3">
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        {historyPresetOptions.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setHistoryPreset(option.value)}
                                className={`h-11 rounded-lg border px-3 text-sm font-semibold transition ${
                                    historyPreset === option.value
                                        ? 'border-sky-200 bg-sky-50 text-sky-700'
                                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>

                    {historyPreset === 'custom' ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="block">
                                <span className="text-xs font-semibold uppercase text-slate-500">From</span>
                                <input
                                    type="datetime-local"
                                    value={customFrom}
                                    onChange={(event) => setCustomFrom(event.target.value)}
                                    className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                                />
                            </label>
                            <label className="block">
                                <span className="text-xs font-semibold uppercase text-slate-500">To</span>
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

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="latest-readings-heading">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h2 id="latest-readings-heading" className="text-lg font-semibold text-slate-950">Latest Sensor Readings</h2>
                        <p className="mt-1 text-sm text-slate-500">Most recent telemetry received {formatLongDateTime(latestRecordedAt)}.</p>
                    </div>
                    <OverallStatusBadge level={status.level} label={status.label} />
                </div>

                {! latest ? (
                    <div className="mt-4">
                        <EmptyState title="No latest telemetry" message="Sensor readings will appear here after the refrigerator sends telemetry." />
                    </div>
                ) : null}

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricTile label="Sensor 1" value={formatTemperature(latest?.temperature_1 ?? null)} helper="Current reading" emphasis />
                    <MetricTile label="Sensor 2" value={formatTemperature(latest?.temperature_2 ?? null)} helper="Current reading" emphasis />
                    <MetricTile label="Sensor 3" value={formatTemperature(latest?.temperature_3 ?? null)} helper="Current reading" emphasis />
                    <MetricTile label="Sensor 4" value={formatTemperature(latest?.temperature_4 ?? null)} helper="Current reading" emphasis />
                </div>
            </section>

            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" aria-labelledby="refrigerator-alarms-heading">
                <div className="border-b border-slate-200 px-4 py-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h2 id="refrigerator-alarms-heading" className="text-lg font-semibold text-slate-950">Alarms</h2>
                            <p className="text-sm text-slate-500">Active alarms and recently resolved conditions for this refrigerator.</p>
                        </div>
                        <span className="text-xs font-semibold uppercase text-slate-500">{activeAlarms.length} active</span>
                    </div>
                </div>

                <div className="grid gap-0 lg:grid-cols-2 lg:divide-x lg:divide-slate-100">
                    <div>
                        <div className="border-b border-slate-100 px-4 py-3">
                            <h3 className="text-sm font-semibold text-slate-950">Active</h3>
                        </div>
                        <AlarmList
                            alarms={activeAlarms}
                            emptyTitle="No active alarms"
                            emptyMessage="This refrigerator has no active alarm conditions."
                            onResolve={(alarmId) => void resolveAlarm(alarmId)}
                            resolvingIds={resolvingAlarmIds}
                            showDevice={false}
                        />
                    </div>
                    <div>
                        <div className="border-b border-slate-100 px-4 py-3">
                            <h3 className="text-sm font-semibold text-slate-950">Recently Resolved</h3>
                        </div>
                        <AlarmList
                            alarms={resolvedAlarms}
                            emptyTitle="No resolved alarms"
                            emptyMessage="Resolved alarms will appear here after conditions return to normal or are acknowledged."
                            showDevice={false}
                        />
                    </div>
                </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h2 className="text-base font-semibold text-slate-950">Sensor Temperature History</h2>
                            <p className="text-sm text-slate-500">Last {chartData.length} readings</p>
                        </div>
                    </div>

                    <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <MetricTile label="Min" value={formatTemperature(temperatureStats.min)} helper="Filtered sensors" />
                        <MetricTile label="Max" value={formatTemperature(temperatureStats.max)} helper="Filtered sensors" />
                        <MetricTile label="Average" value={formatTemperature(temperatureStats.average)} helper="Filtered sensors" />
                        <MetricTile label="Readings" value={String(temperatureStats.readings)} helper="Records returned" />
                    </div>

                    {historyLoading ? (
                        <LoadingState label="Loading filtered history" />
                    ) : chartData.length === 0 ? (
                        <EmptyState title="No chart data" message="Telemetry readings will be plotted after ingestion." />
                    ) : (
                        <div className="h-72 w-full overflow-hidden sm:h-80" aria-label="Sensor temperature chart">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 8 }}>
                                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" />
                                    <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 11 }} tickMargin={10} minTickGap={20} />
                                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickMargin={8} width={38} />
                                    <Tooltip
                                        labelFormatter={(_label, payload) => {
                                            const row = payload?.[0]?.payload as { recorded_at?: string | null } | undefined;

                                            return formatLongDateTime(row?.recorded_at ?? null);
                                        }}
                                        contentStyle={{
                                            borderRadius: 8,
                                            borderColor: '#cbd5e1',
                                            boxShadow: '0 12px 24px rgba(15, 23, 42, 0.12)',
                                        }}
                                    />
                                    <Legend />
                                    <Line type="monotone" dataKey="temperature_1" name="Sensor 1" stroke="#0f766e" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="temperature_2" name="Sensor 2" stroke="#2563eb" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="temperature_3" name="Sensor 3" stroke="#d97706" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="temperature_4" name="Sensor 4" stroke="#be123c" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" aria-labelledby="latest-status-heading">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h2 id="latest-status-heading" className="text-base font-semibold text-slate-950">Door and PF Status</h2>
                            <p className="mt-1 text-sm text-slate-500">Door, PF, and reporting state.</p>
                        </div>
                        <OverallStatusBadge level={status.level} label={status.label} />
                    </div>
                    <dl className="mt-5 space-y-4">
                        <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
                            <dt className="text-xs font-semibold uppercase text-slate-500">Door Status</dt>
                            <dd className="mt-2">
                                <StatusBadge value={latest?.door_status ?? null} type="door" />
                            </dd>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
                            <dt className="text-xs font-semibold uppercase text-slate-500">PF Status</dt>
                            <dd className="mt-2">
                                <StatusBadge value={latest?.pf_status ?? null} type="pf" />
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs font-semibold uppercase text-slate-500">Last Seen</dt>
                            <dd className="mt-1 text-sm font-semibold text-slate-900">{formatLongDateTime(device.last_seen_at)}</dd>
                        </div>
                        <div>
                            <dt className="text-xs font-semibold uppercase text-slate-500">Serial Number</dt>
                            <dd className="mt-1 font-mono text-sm text-slate-900">{device.serial_number ?? '--'}</dd>
                        </div>
                    </dl>
                </aside>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white shadow-sm" aria-labelledby="recent-history-heading">
                <div className="border-b border-slate-200 px-4 py-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h2 id="recent-history-heading" className="text-base font-semibold text-slate-950">Recent History</h2>
                            <p className="text-sm text-slate-500">Latest {history.length} telemetry records.</p>
                        </div>
                        <span className="text-xs font-semibold uppercase text-slate-500">Telemetry Records</span>
                    </div>
                </div>

                {historyLoading ? (
                    <div className="p-4">
                        <LoadingState label="Loading filtered history" />
                    </div>
                ) : history.length === 0 ? (
                    <div className="p-4">
                        <EmptyState title="No telemetry" message="Recent telemetry records will appear here." />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-[980px] divide-y divide-slate-200 text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Recorded</th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Sensor 1</th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Sensor 2</th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Sensor 3</th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Sensor 4</th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Door</th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">PF</th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Alarm</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {history.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50">
                                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatLongDateTime(item.recorded_at)}</td>
                                        <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{formatTemperature(item.temperature_1)}</td>
                                        <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{formatTemperature(item.temperature_2)}</td>
                                        <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{formatTemperature(item.temperature_3)}</td>
                                        <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{formatTemperature(item.temperature_4)}</td>
                                        <td className="whitespace-nowrap px-4 py-3"><StatusBadge value={item.door_status} type="door" /></td>
                                        <td className="whitespace-nowrap px-4 py-3"><StatusBadge value={item.pf_status} type="pf" /></td>
                                        <td className="whitespace-nowrap px-4 py-3">
                                            <OverallStatusBadge level={item.overall_status ?? 'normal'} label={(item.overall_status ?? 'normal').replace(/^./, (char) => char.toUpperCase())} />
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-700">
                                            {item.alarm_indicator ? 'Yes' : 'No'}
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

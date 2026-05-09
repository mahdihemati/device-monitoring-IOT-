import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Clock3, Hash, RefreshCw } from 'lucide-react';
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
import { MetricTile } from '../components/MetricTile';
import { OverallStatusBadge } from '../components/OverallStatusBadge';
import { EmptyState, ErrorBanner, LoadingState } from '../components/StateBlocks';
import { StatusBadge } from '../components/StatusBadge';
import type { Device, Telemetry } from '../types';
import { chartTime, formatLongDateTime, formatTemperature } from '../utils/format';
import { getRefrigeratorStatus } from '../utils/refrigeratorStatus';

export function DeviceDetailPage() {
    const { deviceId } = useParams<{ deviceId: string }>();
    const [device, setDevice] = useState<Device | null>(null);
    const [latest, setLatest] = useState<Telemetry | null>(null);
    const [history, setHistory] = useState<Telemetry[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchDeviceData = useCallback(async (showRefresh = false) => {
        if (! deviceId) {
            return;
        }

        if (showRefresh) {
            setRefreshing(true);
        }

        try {
            const [deviceResponse, latestResponse, historyResponse] = await Promise.all([
                api.get<{ device: Device }>(`/devices/${deviceId}`),
                api.get<{ telemetry: Telemetry | null }>(`/devices/${deviceId}/latest`),
                api.get<{ telemetry: Telemetry[] }>(`/devices/${deviceId}/history`, { params: { limit: 120 } }),
            ]);

            setDevice(deviceResponse.data.device);
            setLatest(latestResponse.data.telemetry);
            setHistory(historyResponse.data.telemetry);
            setError(null);
        } catch (caughtError) {
            setError(getErrorMessage(caughtError));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [deviceId]);

    useEffect(() => {
        void fetchDeviceData();

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
    })), [history]);

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

    return (
        <div className="space-y-6">
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
                    onClick={() => void fetchDeviceData(true)}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-200 hover:text-sky-700 sm:w-auto"
                >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
                    Refresh
                </button>
            </div>

            {error ? <ErrorBanner message={error} /> : null}

            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <MetricTile label="Sensor 1" value={formatTemperature(latest?.temperature_1 ?? null)} emphasis />
                <MetricTile label="Sensor 2" value={formatTemperature(latest?.temperature_2 ?? null)} emphasis />
                <MetricTile label="Sensor 3" value={formatTemperature(latest?.temperature_3 ?? null)} emphasis />
                <MetricTile label="Sensor 4" value={formatTemperature(latest?.temperature_4 ?? null)} emphasis />
            </section>

            <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base font-semibold text-slate-950">Sensor Temperature History</h2>
                            <p className="text-sm text-slate-500">Last {chartData.length} readings</p>
                        </div>
                    </div>

                    {chartData.length === 0 ? (
                        <EmptyState title="No chart data" message="Telemetry readings will be plotted after ingestion." />
                    ) : (
                        <div className="h-72 w-full sm:h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 8, right: 16, left: -12, bottom: 8 }}>
                                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" />
                                    <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 12 }} tickMargin={10} />
                                    <YAxis tick={{ fill: '#64748b', fontSize: 12 }} tickMargin={10} width={38} />
                                    <Tooltip
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

                <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h2 className="text-base font-semibold text-slate-950">Latest Status</h2>
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

            <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-4 py-3">
                    <h2 className="text-base font-semibold text-slate-950">Recent history</h2>
                </div>

                {history.length === 0 ? (
                    <div className="p-4">
                        <EmptyState title="No telemetry" message="Recent telemetry records will appear here." />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-[760px] divide-y divide-slate-200 text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Recorded</th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Sensor 1</th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Sensor 2</th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Sensor 3</th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Sensor 4</th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Door</th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">PF</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {history.map((item) => (
                                    <tr key={item.id}>
                                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatLongDateTime(item.recorded_at)}</td>
                                        <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{formatTemperature(item.temperature_1)}</td>
                                        <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{formatTemperature(item.temperature_2)}</td>
                                        <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{formatTemperature(item.temperature_3)}</td>
                                        <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{formatTemperature(item.temperature_4)}</td>
                                        <td className="whitespace-nowrap px-4 py-3"><StatusBadge value={item.door_status} type="door" /></td>
                                        <td className="whitespace-nowrap px-4 py-3"><StatusBadge value={item.pf_status} type="pf" /></td>
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

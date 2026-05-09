import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, CircleAlert, CircleSlash2, RefreshCw } from 'lucide-react';
import { api, getErrorMessage } from '../api/client';
import { DeviceSummaryCard } from '../components/DeviceSummaryCard';
import { EmptyState, ErrorBanner, LoadingState } from '../components/StateBlocks';
import { SummaryStatCard } from '../components/SummaryStatCard';
import type { Device } from '../types';
import { countRefrigeratorStatuses } from '../utils/refrigeratorStatus';

export function DashboardPage() {
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchDevices = useCallback(async (showRefresh = false) => {
        if (showRefresh) {
            setRefreshing(true);
        }

        try {
            const response = await api.get<{ devices: Device[] }>('/devices');
            setDevices(response.data.devices);
            setError(null);
        } catch (caughtError) {
            setError(getErrorMessage(caughtError));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void fetchDevices();

        const intervalId = window.setInterval(() => {
            void fetchDevices(true);
        }, 5000);

        return () => window.clearInterval(intervalId);
    }, [fetchDevices]);

    const statusCounts = useMemo(() => countRefrigeratorStatuses(devices), [devices]);

    if (loading) {
        return <LoadingState label="Loading refrigerators" />;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="max-w-3xl">
                    <h1 className="text-2xl font-semibold text-slate-950 sm:text-3xl">Blood Refrigerator Monitoring</h1>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                        Monitor refrigerator telemetry, sensor readings, door state, PF status, and last-seen activity for your organization.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => void fetchDevices(true)}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-200 hover:text-sky-700 sm:w-auto"
                >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
                    Refresh
                </button>
            </div>

            {error ? <ErrorBanner message={error} /> : null}

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <SummaryStatCard
                    label="Total Refrigerators"
                    value={devices.length}
                    tone="neutral"
                    icon={<Activity className="h-5 w-5" aria-hidden="true" />}
                />
                <SummaryStatCard
                    label="Normal"
                    value={statusCounts.normal}
                    tone="normal"
                    icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
                />
                <SummaryStatCard
                    label="Warning"
                    value={statusCounts.warning}
                    tone="warning"
                    icon={<CircleAlert className="h-5 w-5" aria-hidden="true" />}
                />
                <SummaryStatCard
                    label="Critical"
                    value={statusCounts.critical}
                    tone="critical"
                    icon={<AlertTriangle className="h-5 w-5" aria-hidden="true" />}
                />
                <SummaryStatCard
                    label="Offline"
                    value={statusCounts.offline}
                    tone="offline"
                    icon={<CircleSlash2 className="h-5 w-5" aria-hidden="true" />}
                />
            </section>

            {devices.length === 0 ? (
                <EmptyState title="No refrigerators" message="Refrigerators assigned to this organization will appear here." />
            ) : (
                <section className="grid gap-4" aria-label="Refrigerators">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-950">Refrigerators</h2>
                        <p className="mt-1 text-sm text-slate-500">Latest readings refresh automatically every 5 seconds.</p>
                    </div>
                    {devices.map((device) => (
                        <DeviceSummaryCard key={device.id} device={device} />
                    ))}
                </section>
            )}
        </div>
    );
}

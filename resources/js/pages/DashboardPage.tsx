import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { api, getErrorMessage } from '../api/client';
import { DeviceSummaryCard } from '../components/DeviceSummaryCard';
import { EmptyState, ErrorBanner, LoadingState } from '../components/StateBlocks';
import type { Device } from '../types';

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

    if (loading) {
        return <LoadingState label="Loading devices" />;
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-950">Dashboard</h1>
                    <p className="mt-1 text-sm text-slate-500">Devices refresh every 5 seconds.</p>
                </div>
                <button
                    type="button"
                    onClick={() => void fetchDevices(true)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-200 hover:text-sky-700"
                >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
                    Refresh
                </button>
            </div>

            {error ? <ErrorBanner message={error} /> : null}

            {devices.length === 0 ? (
                <EmptyState title="No devices" message="Devices assigned to this customer will appear here." />
            ) : (
                <section className="grid gap-4">
                    {devices.map((device) => (
                        <DeviceSummaryCard key={device.id} device={device} />
                    ))}
                </section>
            )}
        </div>
    );
}

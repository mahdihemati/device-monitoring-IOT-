import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, BellRing, CheckCircle2, CircleAlert, CircleSlash2, RefreshCw } from 'lucide-react';
import { api, getErrorMessage } from '../api/client';
import { AlarmList } from '../components/AlarmList';
import { DeviceSummaryCard } from '../components/DeviceSummaryCard';
import { OverallStatusBadge } from '../components/OverallStatusBadge';
import { EmptyState, ErrorBanner, LoadingState } from '../components/StateBlocks';
import { SummaryStatCard } from '../components/SummaryStatCard';
import type { Alarm, Device } from '../types';
import type { RefrigeratorStatusLevel } from '../utils/refrigeratorStatus';
import { countRefrigeratorStatuses } from '../utils/refrigeratorStatus';

interface OverviewState {
    level: RefrigeratorStatusLevel;
    label: string;
    title: string;
    detail: string;
}

function getOverviewState(total: number, counts: Record<RefrigeratorStatusLevel, number>): OverviewState {
    if (total === 0) {
        return {
            level: 'offline',
            label: 'No Refrigerators',
            title: 'No refrigerators are assigned yet',
            detail: 'Assigned refrigerators will appear here after setup.',
        };
    }

    if (counts.critical > 0) {
        return {
            level: 'critical',
            label: 'Critical',
            title: `${counts.critical} refrigerator${counts.critical === 1 ? '' : 's'} need critical attention`,
            detail: 'PF status or fault conditions are visible in the refrigerator cards below.',
        };
    }

    if (counts.offline > 0) {
        return {
            level: 'offline',
            label: 'Offline',
            title: `${counts.offline} refrigerator${counts.offline === 1 ? '' : 's'} are offline`,
            detail: 'Review last-seen times and confirm connectivity for offline units.',
        };
    }

    if (counts.warning > 0) {
        return {
            level: 'warning',
            label: 'Warning',
            title: `${counts.warning} refrigerator${counts.warning === 1 ? ' has' : 's have'} warning status`,
            detail: 'Door status or missing telemetry needs review, but no critical fault is shown.',
        };
    }

    return {
        level: 'normal',
        label: 'Normal',
        title: 'All refrigerators are reporting normally',
        detail: 'Latest telemetry, door status, and PF status are within the current display expectations.',
    };
}

export function DashboardPage() {
    const [devices, setDevices] = useState<Device[]>([]);
    const [activeAlarms, setActiveAlarms] = useState<Alarm[]>([]);
    const [recentAlarms, setRecentAlarms] = useState<Alarm[]>([]);
    const [resolvingAlarmIds, setResolvingAlarmIds] = useState<Set<number>>(() => new Set());
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchDashboardData = useCallback(async (showRefresh = false) => {
        if (showRefresh) {
            setRefreshing(true);
        }

        try {
            const [devicesResponse, alarmsResponse, recentAlarmsResponse] = await Promise.all([
                api.get<{ devices: Device[] }>('/devices'),
                api.get<{ alarms: Alarm[] }>('/alarms/active'),
                api.get<{ alarms: Alarm[] }>('/alarms', { params: { status: 'all', limit: 8 } }),
            ]);

            setDevices(devicesResponse.data.devices);
            setActiveAlarms(alarmsResponse.data.alarms);
            setRecentAlarms(recentAlarmsResponse.data.alarms);
            setError(null);
        } catch (caughtError) {
            setError(getErrorMessage(caughtError));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const resolveAlarm = useCallback(async (alarmId: number) => {
        setResolvingAlarmIds((current) => new Set(current).add(alarmId));

        try {
            await api.post(`/alarms/${alarmId}/resolve`);
            await fetchDashboardData(true);
        } catch (caughtError) {
            setError(getErrorMessage(caughtError));
        } finally {
            setResolvingAlarmIds((current) => {
                const next = new Set(current);
                next.delete(alarmId);

                return next;
            });
        }
    }, [fetchDashboardData]);

    useEffect(() => {
        void fetchDashboardData();

        const intervalId = window.setInterval(() => {
            void fetchDashboardData(true);
        }, 5000);

        return () => window.clearInterval(intervalId);
    }, [fetchDashboardData]);

    const statusCounts = useMemo(() => countRefrigeratorStatuses(devices), [devices]);
    const overviewState = useMemo(() => getOverviewState(devices.length, statusCounts), [devices.length, statusCounts]);

    if (loading) {
        return <LoadingState label="Loading refrigerators" />;
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="max-w-3xl">
                    <h1 className="text-2xl font-semibold text-slate-950 sm:text-3xl">Blood Refrigerator Monitoring</h1>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                        Monitor refrigerator telemetry, sensor readings, door state, PF status, and last-seen activity for your organization.
                    </p>
                </div>
                <button
                    type="button"
                    aria-label="Refresh refrigerator telemetry"
                    onClick={() => void fetchDashboardData(true)}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-200 hover:text-sky-700 sm:w-auto"
                >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
                    Refresh
                </button>
            </div>

            {error ? <ErrorBanner message={error} /> : null}

            <section className="space-y-4" aria-labelledby="system-overview-heading">
                <div>
                    <h2 id="system-overview-heading" className="text-lg font-semibold text-slate-950">System Overview</h2>
                    <p className="mt-1 text-sm text-slate-500">Operational status across all refrigerators in this organization.</p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <OverallStatusBadge level={overviewState.level} label={overviewState.label} />
                            <p className="mt-3 text-xl font-semibold text-slate-950">{overviewState.title}</p>
                            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{overviewState.detail}</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600 ring-1 ring-slate-200">
                            Auto-refresh: 5 seconds
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                    <SummaryStatCard
                        label="Total Refrigerators"
                        value={devices.length}
                        tone="neutral"
                        description="Assigned units"
                        icon={<Activity className="h-5 w-5" aria-hidden="true" />}
                    />
                    <SummaryStatCard
                        label="Normal"
                        value={statusCounts.normal}
                        tone="normal"
                        description="Reporting safely"
                        icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
                    />
                    <SummaryStatCard
                        label="Warning"
                        value={statusCounts.warning}
                        tone="warning"
                        description="Needs review"
                        icon={<CircleAlert className="h-5 w-5" aria-hidden="true" />}
                    />
                    <SummaryStatCard
                        label="Critical"
                        value={statusCounts.critical}
                        tone="critical"
                        description="Fault visible"
                        icon={<AlertTriangle className="h-5 w-5" aria-hidden="true" />}
                    />
                    <SummaryStatCard
                        label="Offline"
                        value={statusCounts.offline}
                        tone="offline"
                        description="No recent data"
                        icon={<CircleSlash2 className="h-5 w-5" aria-hidden="true" />}
                    />
                    <SummaryStatCard
                        label="Active Alarms"
                        value={activeAlarms.length}
                        tone={activeAlarms.some((alarm) => alarm.severity === 'critical') ? 'critical' : activeAlarms.length > 0 ? 'warning' : 'normal'}
                        description="Open issues"
                        icon={<BellRing className="h-5 w-5" aria-hidden="true" />}
                    />
                </div>
            </section>

            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" aria-labelledby="active-alarms-heading">
                <div className="border-b border-slate-200 px-4 py-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h2 id="active-alarms-heading" className="text-lg font-semibold text-slate-950">Active Alarms</h2>
                            <p className="text-sm text-slate-500">Current warning and critical conditions across monitored refrigerators.</p>
                        </div>
                        <span className="text-xs font-semibold uppercase text-slate-500">{activeAlarms.length} active</span>
                    </div>
                </div>
                <AlarmList
                    alarms={activeAlarms}
                    emptyTitle="No active alarms"
                    emptyMessage="All monitored refrigerators are clear of active alarms."
                    onResolve={(alarmId) => void resolveAlarm(alarmId)}
                    resolvingIds={resolvingAlarmIds}
                />
            </section>

            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" aria-labelledby="recent-alarm-events-heading">
                <div className="border-b border-slate-200 px-4 py-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h2 id="recent-alarm-events-heading" className="text-lg font-semibold text-slate-950">Recent Alarm Events</h2>
                            <p className="text-sm text-slate-500">Latest active and resolved alarm events for this organization.</p>
                        </div>
                        <span className="text-xs font-semibold uppercase text-slate-500">Latest {recentAlarms.length}</span>
                    </div>
                </div>
                <AlarmList
                    alarms={recentAlarms}
                    emptyTitle="No alarm events"
                    emptyMessage="Alarm events will appear here after warning or critical conditions are detected."
                />
            </section>

            {devices.length === 0 ? (
                <EmptyState title="No refrigerators" message="Refrigerators assigned to this organization will appear here." />
            ) : (
                <section className="space-y-4" aria-labelledby="refrigerators-heading">
                    <div>
                        <h2 id="refrigerators-heading" className="text-lg font-semibold text-slate-950">Refrigerators</h2>
                        <p className="mt-1 text-sm text-slate-500">Scan current sensor readings, door status, PF status, and last-seen time.</p>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                        {devices.map((device) => (
                            <DeviceSummaryCard key={device.id} device={device} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

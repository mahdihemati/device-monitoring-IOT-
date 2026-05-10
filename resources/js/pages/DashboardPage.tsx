import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, BellRing, CheckCircle2, CircleAlert, CircleSlash2, RefreshCw } from 'lucide-react';
import { api, getErrorMessage } from '../api/client';
import { AlarmList } from '../components/AlarmList';
import { DeviceSummaryCard } from '../components/DeviceSummaryCard';
import { OverallStatusBadge } from '../components/OverallStatusBadge';
import { EmptyState, ErrorBanner, LoadingState } from '../components/StateBlocks';
import { SummaryStatCard } from '../components/SummaryStatCard';
import type { Alarm, Device } from '../types';
import { formatLongDateTime } from '../utils/format';
import { formatCount, statusLabels, toPersianNumber } from '../utils/localization';
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
            label: 'بدون یخچال',
            title: 'هنوز یخچالی تخصیص داده نشده است',
            detail: 'پس از راه‌اندازی، یخچال‌های تخصیص‌یافته در این بخش نمایش داده می‌شوند.',
        };
    }

    if (counts.critical > 0) {
        return {
            level: 'critical',
            label: statusLabels.critical,
            title: `${formatCount(counts.critical)} یخچال نیاز به رسیدگی بحرانی دارد`,
            detail: 'وضعیت PF یا شرایط خطا در کارت‌های یخچال‌ها مشخص است.',
        };
    }

    if (counts.offline > 0) {
        return {
            level: 'offline',
            label: statusLabels.offline,
            title: `${formatCount(counts.offline)} یخچال آفلاین است`,
            detail: 'زمان آخرین دریافت داده را بررسی کنید و اتصال یخچال‌های آفلاین را تأیید کنید.',
        };
    }

    if (counts.warning > 0) {
        return {
            level: 'warning',
            label: statusLabels.warning,
            title: `${formatCount(counts.warning)} یخچال در وضعیت هشدار است`,
            detail: 'وضعیت درب یا داده‌های ناقص نیاز به بررسی دارد، اما خطای بحرانی نمایش داده نشده است.',
        };
    }

    return {
        level: 'normal',
        label: statusLabels.normal,
        title: 'همه یخچال‌ها به‌صورت عادی گزارش می‌دهند',
        detail: 'آخرین داده‌ها، وضعیت درب و وضعیت PF در محدوده مورد انتظار هستند.',
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
    const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

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
            setLastUpdatedAt(new Date().toISOString());
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
        return <LoadingState label="در حال بارگذاری یخچال‌ها" />;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                    <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">داشبورد پایش یخچال‌های خون</h1>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                        داده‌های یخچال، مقادیر سنسورها، وضعیت درب، وضعیت PF و آخرین دریافت داده را برای سازمان خود پایش کنید.
                    </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="inline-flex h-11 items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        </span>
                        <span>به‌روزرسانی خودکار هر {toPersianNumber(5)} ثانیه</span>
                    </div>
                    <button
                        type="button"
                        aria-label="به‌روزرسانی داده‌های یخچال‌ها"
                        onClick={() => void fetchDashboardData(true)}
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-sky-200 hover:text-sky-700 sm:w-auto"
                    >
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
                        به‌روزرسانی
                    </button>
                </div>
            </div>

            {error ? <ErrorBanner message={error} /> : null}

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70 sm:p-5" aria-labelledby="system-overview-heading">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 id="system-overview-heading" className="text-lg font-bold text-slate-950">نمای کلی سامانه</h2>
                            <OverallStatusBadge level={overviewState.level} label={overviewState.label} />
                        </div>
                        <p className="mt-3 text-xl font-bold text-slate-950">{overviewState.title}</p>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{overviewState.detail}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600 ring-1 ring-slate-200">
                        <span className="block">آخرین به‌روزرسانی: {formatLongDateTime(lastUpdatedAt)}</span>
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6" aria-label="خلاصه وضعیت یخچال‌ها">
                <SummaryStatCard
                    label="کل یخچال‌ها"
                    value={devices.length}
                    tone="neutral"
                    description="واحدهای تخصیص‌یافته"
                    icon={<Activity className="h-5 w-5" aria-hidden="true" />}
                />
                <SummaryStatCard
                    label="عادی"
                    value={statusCounts.normal}
                    tone="normal"
                    description="گزارش‌دهی سالم"
                    icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
                />
                <SummaryStatCard
                    label="هشدار"
                    value={statusCounts.warning}
                    tone="warning"
                    description="نیازمند بررسی"
                    icon={<CircleAlert className="h-5 w-5" aria-hidden="true" />}
                />
                <SummaryStatCard
                    label="بحرانی"
                    value={statusCounts.critical}
                    tone="critical"
                    description="خطا قابل مشاهده است"
                    icon={<AlertTriangle className="h-5 w-5" aria-hidden="true" />}
                />
                <SummaryStatCard
                    label="آفلاین"
                    value={statusCounts.offline}
                    tone="offline"
                    description="بدون داده اخیر"
                    icon={<CircleSlash2 className="h-5 w-5" aria-hidden="true" />}
                />
                <SummaryStatCard
                    label="هشدارهای فعال"
                    value={activeAlarms.length}
                    tone={activeAlarms.some((alarm) => alarm.severity === 'critical') ? 'critical' : activeAlarms.length > 0 ? 'warning' : 'normal'}
                    description="موارد باز"
                    icon={<BellRing className="h-5 w-5" aria-hidden="true" />}
                />
            </section>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
                <section className="space-y-4" aria-labelledby="refrigerators-heading">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h2 id="refrigerators-heading" className="text-lg font-bold text-slate-950">یخچال‌ها</h2>
                            <p className="mt-1 text-sm text-slate-500">مقادیر سنسورها، وضعیت درب، وضعیت PF و آخرین دریافت داده را مرور کنید.</p>
                        </div>
                        <span className="text-xs font-bold text-slate-500">{formatCount(devices.length)} یخچال</span>
                    </div>

                    {devices.length === 0 ? (
                        <EmptyState title="یخچالی وجود ندارد" message="یخچال‌های تخصیص‌یافته به این سازمان در اینجا نمایش داده می‌شوند." />
                    ) : (
                        <div className="grid gap-4 lg:grid-cols-2">
                            {devices.map((device) => (
                                <DeviceSummaryCard key={device.id} device={device} />
                            ))}
                        </div>
                    )}
                </section>

                <aside className="space-y-5">
                    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-200/70" aria-labelledby="active-alarms-heading">
                        <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h2 id="active-alarms-heading" className="text-base font-bold text-slate-950">هشدارهای فعال</h2>
                                    <p className="mt-1 text-sm text-slate-500">شرایط هشدار و بحرانی فعلی.</p>
                                </div>
                                <span className="rounded-md bg-white px-2 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">{formatCount(activeAlarms.length)} فعال</span>
                            </div>
                        </div>
                        <div className="max-h-[620px] overflow-y-auto">
                            <AlarmList
                                alarms={activeAlarms}
                                emptyTitle="هشدار فعالی وجود ندارد"
                                emptyMessage="همه یخچال‌های پایش‌شده بدون هشدار فعال هستند."
                                onResolve={(alarmId) => void resolveAlarm(alarmId)}
                                resolvingIds={resolvingAlarmIds}
                            />
                        </div>
                    </section>

                    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-200/70" aria-labelledby="recent-alarm-events-heading">
                        <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h2 id="recent-alarm-events-heading" className="text-base font-bold text-slate-950">رویدادهای اخیر هشدار</h2>
                                    <p className="mt-1 text-sm text-slate-500">آخرین هشدارهای فعال و رفع‌شده.</p>
                                </div>
                                <span className="rounded-md bg-white px-2 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">آخرین {formatCount(recentAlarms.length)}</span>
                            </div>
                        </div>
                        <div className="max-h-[480px] overflow-y-auto">
                            <AlarmList
                                alarms={recentAlarms}
                                emptyTitle="رویداد هشداری وجود ندارد"
                                emptyMessage="پس از شناسایی وضعیت هشدار یا بحرانی، رویدادها در اینجا نمایش داده می‌شوند."
                            />
                        </div>
                    </section>
                </aside>
            </div>
        </div>
    );
}

import { AlertTriangle, CheckCircle2, CircleAlert } from 'lucide-react';
import type { Alarm, AlarmSeverity } from '../types';
import { formatAlarmType, formatDateTime } from '../utils/format';
import { alarmCodeLabel, severityLabels } from '../utils/localization';
import { EmptyState } from './StateBlocks';

interface AlarmListProps {
    alarms: Alarm[];
    emptyTitle: string;
    emptyMessage: string;
    onResolve?: (alarmId: number) => void;
    resolvingIds?: Set<number>;
    showDevice?: boolean;
}

const severityStyles: Record<AlarmSeverity, string> = {
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
    critical: 'border-rose-200 bg-rose-50 text-rose-700',
};

const severityIcons = {
    warning: CircleAlert,
    critical: AlertTriangle,
};

const emptyResolvingIds = new Set<number>();

export function AlarmList({
    alarms,
    emptyTitle,
    emptyMessage,
    onResolve,
    resolvingIds = emptyResolvingIds,
    showDevice = true,
}: AlarmListProps) {
    if (alarms.length === 0) {
        return <EmptyState title={emptyTitle} message={emptyMessage} />;
    }

    return (
        <div className="divide-y divide-slate-100">
            {alarms.map((alarm) => (
                <AlarmRow
                    key={alarm.id}
                    alarm={alarm}
                    onResolve={onResolve}
                    resolving={resolvingIds.has(alarm.id)}
                    showDevice={showDevice}
                />
            ))}
        </div>
    );
}

function AlarmRow({
    alarm,
    onResolve,
    resolving,
    showDevice,
}: {
    alarm: Alarm;
    onResolve?: (alarmId: number) => void;
    resolving: boolean;
    showDevice: boolean;
}) {
    const SeverityIcon = severityIcons[alarm.severity];
    const severityLabel = severityLabels[alarm.severity];
    const title = alarmCodeLabel(alarm.code) ?? formatAlarmType(alarm.type);

    return (
        <article className="grid gap-3 px-4 py-4 transition hover:bg-slate-50/80 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex min-h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold ${severityStyles[alarm.severity]}`}>
                        <SeverityIcon className="h-3.5 w-3.5" aria-hidden="true" />
                        {severityLabel}
                    </span>
                    {alarm.code ? (
                        <span className="inline-flex min-h-8 items-center rounded-md border border-slate-200 bg-white px-2.5 font-mono text-xs font-bold text-slate-700" dir="ltr">
                            {alarm.code}
                        </span>
                    ) : null}
                    <span className="text-sm font-semibold text-slate-950">{title}</span>
                    {alarm.is_resolved ? (
                        <span className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                            رفع‌شده
                        </span>
                    ) : null}
                </div>

                {showDevice ? (
                    <p className="mt-2 truncate text-sm font-medium text-slate-700">
                        {alarm.device.name}
                        <span className="me-2 font-mono text-xs text-slate-500" dir="ltr">{alarm.device.device_code}</span>
                    </p>
                ) : null}

                <p className="mt-2 text-sm leading-6 text-slate-600">{alarm.message}</p>
                <p className="mt-1 text-xs font-medium text-slate-500">
                    شروع: {formatDateTime(alarm.triggered_at)}
                    {alarm.is_resolved ? ` | رفع‌شده: ${formatDateTime(alarm.resolved_at)}` : ''}
                </p>
            </div>

            {! alarm.is_resolved && onResolve ? (
                <button
                    type="button"
                    onClick={() => onResolve(alarm.id)}
                    disabled={resolving}
                    className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-emerald-200 bg-white px-3 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
                >
                    {resolving ? 'در حال ثبت' : 'رفع هشدار'}
                </button>
            ) : null}
        </article>
    );
}

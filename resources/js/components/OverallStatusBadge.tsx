import { AlertTriangle, CheckCircle2, CircleAlert, CircleSlash2 } from 'lucide-react';
import type { RefrigeratorStatusLevel } from '../utils/refrigeratorStatus';

interface OverallStatusBadgeProps {
    level: RefrigeratorStatusLevel;
    label: string;
}

const statusStyles: Record<RefrigeratorStatusLevel, string> = {
    normal: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
    critical: 'border-rose-200 bg-rose-50 text-rose-700',
    offline: 'border-slate-300 bg-slate-100 text-slate-600',
};

const statusIcons = {
    normal: CheckCircle2,
    warning: CircleAlert,
    critical: AlertTriangle,
    offline: CircleSlash2,
};

export function OverallStatusBadge({ level, label }: OverallStatusBadgeProps) {
    const Icon = statusIcons[level];

    return (
        <span
            aria-label={`Overall status: ${label}`}
            className={`inline-flex min-h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold ${statusStyles[level]}`}
        >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {label}
        </span>
    );
}

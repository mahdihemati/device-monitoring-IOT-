import { CheckCircle2, CircleAlert, CircleSlash2 } from 'lucide-react';
import { statusValueLabel } from '../utils/localization';

interface StatusBadgeProps {
    value: string | null;
    type: 'door' | 'pf';
}

export function StatusBadge({ value, type }: StatusBadgeProps) {
    const normalized = value?.trim().toLowerCase() ?? '';
    const isNormal = type === 'door' ? normalized === 'closed' : normalized === 'normal';
    const isUnknown = normalized === 'unknown' || normalized === '';
    const displayValue = statusValueLabel(value, type);
    const Icon = isUnknown ? CircleSlash2 : isNormal ? CheckCircle2 : CircleAlert;

    const classes = isUnknown
        ? 'border-slate-200 bg-slate-100 text-slate-500'
        : isNormal
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : type === 'pf'
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-amber-200 bg-amber-50 text-amber-700';

    return (
        <span
            aria-label={`${type === 'door' ? 'وضعیت درب' : 'وضعیت PF'}: ${displayValue}`}
            className={`inline-flex min-h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold ${classes}`}
        >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {displayValue}
        </span>
    );
}

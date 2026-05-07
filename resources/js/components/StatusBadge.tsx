import { CheckCircle2, CircleAlert, CircleSlash2 } from 'lucide-react';

interface StatusBadgeProps {
    value: string | null;
    type: 'door' | 'pf';
}

export function StatusBadge({ value, type }: StatusBadgeProps) {
    const normalized = value?.toLowerCase() ?? 'unknown';
    const isNormal = type === 'door' ? normalized === 'closed' : normalized === 'normal';
    const isUnknown = normalized === 'unknown' || normalized === '';
    const Icon = isUnknown ? CircleSlash2 : isNormal ? CheckCircle2 : CircleAlert;

    const classes = isUnknown
        ? 'border-slate-200 bg-slate-100 text-slate-500'
        : isNormal
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-amber-200 bg-amber-50 text-amber-700';

    return (
        <span className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold capitalize ${classes}`}>
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {normalized}
        </span>
    );
}

import type { ReactNode } from 'react';
import { formatCount } from '../utils/localization';

type SummaryTone = 'neutral' | 'normal' | 'warning' | 'critical' | 'offline';

interface SummaryStatCardProps {
    label: string;
    value: number;
    tone: SummaryTone;
    icon: ReactNode;
    description?: string;
}

const toneStyles: Record<SummaryTone, string> = {
    neutral: 'border-slate-200 bg-slate-50 text-slate-600',
    normal: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
    critical: 'border-rose-200 bg-rose-50 text-rose-700',
    offline: 'border-slate-300 bg-slate-100 text-slate-600',
};

const valueStyles: Record<SummaryTone, string> = {
    neutral: 'text-slate-950',
    normal: 'text-emerald-700',
    warning: 'text-amber-700',
    critical: 'text-rose-700',
    offline: 'text-slate-700',
};

export function SummaryStatCard({ label, value, tone, icon, description }: SummaryStatCardProps) {
    return (
        <article className="min-h-32 rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60 transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex h-full flex-col items-center justify-center text-center">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border ${toneStyles[tone]}`}>
                    {icon}
                </span>
                <p className={`mt-3 text-3xl font-bold leading-none ${valueStyles[tone]}`}>{formatCount(value)}</p>
                <p className="mt-2 text-sm font-semibold text-slate-700">{label}</p>
                {description ? <p className="mt-1 text-xs font-medium leading-5 text-slate-500">{description}</p> : null}
            </div>
        </article>
    );
}

import type { ReactNode } from 'react';

type SummaryTone = 'neutral' | 'normal' | 'warning' | 'critical' | 'offline';

interface SummaryStatCardProps {
    label: string;
    value: number;
    tone: SummaryTone;
    icon: ReactNode;
}

const toneStyles: Record<SummaryTone, string> = {
    neutral: 'border-slate-200 bg-white text-slate-700',
    normal: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
    critical: 'border-rose-200 bg-rose-50 text-rose-700',
    offline: 'border-slate-300 bg-slate-100 text-slate-600',
};

export function SummaryStatCard({ label, value, tone, icon }: SummaryStatCardProps) {
    return (
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-medium text-slate-500">{label}</p>
                    <p className="mt-2 text-3xl font-semibold leading-none text-slate-950">{value}</p>
                </div>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${toneStyles[tone]}`}>
                    {icon}
                </span>
            </div>
        </article>
    );
}

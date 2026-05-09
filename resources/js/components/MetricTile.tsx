interface MetricTileProps {
    label: string;
    value: string;
    emphasis?: boolean;
    helper?: string;
}

export function MetricTile({ label, value, emphasis = false, helper }: MetricTileProps) {
    return (
        <div className={`${emphasis ? 'min-h-28 px-4 py-4' : 'min-h-20 px-3 py-3'} rounded-lg border border-slate-200 bg-white shadow-sm`}>
            <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
            <p className={`${emphasis ? 'mt-2 text-3xl' : 'mt-1 text-xl'} font-semibold leading-none text-slate-900`}>
                {value}
            </p>
            {helper ? <p className="mt-2 text-xs font-medium text-slate-500">{helper}</p> : null}
        </div>
    );
}

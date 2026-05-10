interface MetricTileProps {
    label: string;
    value: string;
    emphasis?: boolean;
    helper?: string;
}

export function MetricTile({ label, value, emphasis = false, helper }: MetricTileProps) {
    return (
        <div className={`${emphasis ? 'min-h-28 px-4 py-4' : 'min-h-20 px-3 py-3'} rounded-lg border border-slate-200 bg-slate-50/80 shadow-sm ring-1 ring-white`}>
            <p className="text-xs font-semibold text-slate-500">{label}</p>
            <p className={`${emphasis ? 'mt-2 text-3xl' : 'mt-1 text-xl'} font-bold leading-none text-slate-950`} dir="ltr">
                {value}
            </p>
            {helper ? <p className="mt-2 text-xs font-medium text-slate-500">{helper}</p> : null}
        </div>
    );
}

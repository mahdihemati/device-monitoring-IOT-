interface MetricTileProps {
    label: string;
    value: string;
}

export function MetricTile({ label, value }: MetricTileProps) {
    return (
        <div className="min-h-20 rounded-lg border border-slate-200 bg-white px-3 py-3 shadow-sm">
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
        </div>
    );
}

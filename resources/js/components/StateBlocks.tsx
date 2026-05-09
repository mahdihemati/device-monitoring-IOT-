import { AlertTriangle, Loader2 } from 'lucide-react';

export function LoadingState({ label = 'Loading' }: { label?: string }) {
    return (
        <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white/80 px-5 py-8">
            <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                <Loader2 className="h-5 w-5 animate-spin text-sky-600" aria-hidden="true" />
                {label}
            </div>
        </div>
    );
}

export function EmptyState({ title, message }: { title: string; message: string }) {
    return (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
            <p className="text-base font-semibold text-slate-900">{title}</p>
            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">{message}</p>
        </div>
    );
}

export function ErrorBanner({ message }: { message: string }) {
    return (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{message}</span>
        </div>
    );
}

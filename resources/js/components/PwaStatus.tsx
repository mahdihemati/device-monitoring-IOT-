import { Download, WifiOff, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function useOnlineStatus() {
    const [online, setOnline] = useState(() => navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setOnline(true);
        const handleOffline = () => setOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return online;
}

export function OfflineBanner() {
    const online = useOnlineStatus();

    if (online) {
        return null;
    }

    return (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900">
            <div className="mx-auto flex max-w-7xl items-start gap-2 sm:px-2">
                <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>شما آفلاین هستید. پایش زنده یخچال‌ها، هشدارها، تاریخچه و داده‌های مدیریتی به اتصال اینترنت نیاز دارد.</span>
            </div>
        </div>
    );
}

export function InstallPrompt() {
    const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        const handleBeforeInstallPrompt = (event: Event) => {
            event.preventDefault();
            setPromptEvent(event as BeforeInstallPromptEvent);
            setDismissed(false);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    if (! promptEvent || dismissed) {
        return null;
    }

    async function install() {
        if (! promptEvent) {
            return;
        }

        await promptEvent.prompt();
        await promptEvent.userChoice;
        setPromptEvent(null);
    }

    return (
        <div className="mx-auto max-w-7xl px-4 pb-3 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-3 rounded-lg border border-sky-100 bg-sky-50 px-3 py-3 text-sm text-sky-950 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2">
                    <Download className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" aria-hidden="true" />
                    <p className="leading-6">برای دسترسی سریع‌تر در موبایل و دسکتاپ، داشبورد پایش یخچال‌های خون را نصب کنید.</p>
                </div>
                <div className="flex shrink-0 gap-2">
                    <button
                        type="button"
                        onClick={() => void install()}
                        className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                    >
                        نصب برنامه
                    </button>
                    <button
                        type="button"
                        aria-label="بستن پیشنهاد نصب"
                        onClick={() => setDismissed(true)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-sky-200 bg-white text-sky-800 transition hover:border-sky-300"
                    >
                        <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                </div>
            </div>
        </div>
    );
}

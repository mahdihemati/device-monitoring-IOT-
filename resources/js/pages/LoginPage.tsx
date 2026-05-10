import { FormEvent, useState } from 'react';
import { Activity, LockKeyhole, UserRound } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { getErrorMessage } from '../api/client';
import { ErrorBanner } from '../components/StateBlocks';
import { useAuth } from '../contexts/AuthContext';
import { productNameFa } from '../utils/localization';

export function LoginPage() {
    const { user, login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (user) {
        return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            await login(username, password);
        } catch (caughtError) {
            setError(getErrorMessage(caughtError));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
            <div className="w-full max-w-md">
                <div className="mb-8 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-sky-100 text-sky-700 ring-1 ring-sky-200">
                        <Activity className="h-9 w-9" aria-hidden="true" />
                    </div>
                    <h1 className="mt-5 text-2xl font-bold text-slate-950">{productNameFa}</h1>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                        ورود سازمانی برای پایش دما، وضعیت درب، وضعیت PF و هشدارهای یخچال‌های خون
                    </p>
                </div>

                <form onSubmit={(event) => void handleSubmit(event)} className="rounded-lg border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70 sm:p-6">
                    <div className="mb-5">
                        <h2 className="text-base font-bold text-slate-950">ورود به سامانه</h2>
                        <p className="mt-1 text-sm text-slate-500">نام کاربری و رمز عبور اختصاصی خود را وارد کنید.</p>
                    </div>

                    <div className="space-y-4">
                        {error ? <ErrorBanner message={error} /> : null}

                        <label className="block">
                            <span className="text-sm font-semibold text-slate-700">نام کاربری</span>
                            <span className="relative mt-1 block">
                                <UserRound className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                                <input
                                    value={username}
                                    onChange={(event) => setUsername(event.target.value)}
                                    autoComplete="username"
                                    required
                                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 pe-10 text-left text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                                    dir="ltr"
                                />
                            </span>
                        </label>

                        <label className="block">
                            <span className="text-sm font-semibold text-slate-700">رمز عبور</span>
                            <span className="relative mt-1 block">
                                <LockKeyhole className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    autoComplete="current-password"
                                    required
                                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 pe-10 text-left text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                                    dir="ltr"
                                />
                            </span>
                        </label>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 text-sm font-bold text-white shadow-sm shadow-sky-200 transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                        >
                            <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                            {submitting ? 'در حال ورود' : 'ورود'}
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
}

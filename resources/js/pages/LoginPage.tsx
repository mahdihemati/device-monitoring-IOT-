import { FormEvent, useState } from 'react';
import { LockKeyhole, MonitorDot } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { getErrorMessage } from '../api/client';
import { ErrorBanner } from '../components/StateBlocks';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
    const { user, login } = useAuth();
    const [username, setUsername] = useState('demo');
    const [password, setPassword] = useState('password');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (user) {
        return <Navigate to="/dashboard" replace />;
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
        <div className="flex min-h-screen items-center justify-center px-4 py-10">
            <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/80">
                <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-900 text-white">
                        <MonitorDot className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                        <h1 className="text-xl font-semibold text-slate-950">Device Monitor</h1>
                        <p className="text-sm text-slate-500">Login</p>
                    </div>
                </div>

                <form onSubmit={(event) => void handleSubmit(event)} className="mt-6 space-y-4">
                    {error ? <ErrorBanner message={error} /> : null}

                    <label className="block">
                        <span className="text-sm font-medium text-slate-700">Username</span>
                        <input
                            value={username}
                            onChange={(event) => setUsername(event.target.value)}
                            autoComplete="username"
                            className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                        />
                    </label>

                    <label className="block">
                        <span className="text-sm font-medium text-slate-700">Password</span>
                        <input
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            autoComplete="current-password"
                            className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                        />
                    </label>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                        <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                        {submitting ? 'Signing in' : 'Sign in'}
                    </button>
                </form>
            </div>
        </div>
    );
}

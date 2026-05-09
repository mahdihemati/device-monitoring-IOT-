import { LogOut, Thermometer } from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function AppShell() {
    const { user, logout } = useAuth();

    return (
        <div className="min-h-screen">
            <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:flex-nowrap sm:px-6 lg:px-8">
                    <Link to="/dashboard" className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
                            <Thermometer className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-slate-950 sm:text-base">Blood Refrigerator Monitor</span>
                            <span className="block truncate text-xs text-slate-500">Organization: {user?.customer.name}</span>
                        </span>
                    </Link>

                    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                        <nav className="hidden items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 sm:flex">
                            <NavLink
                                to="/dashboard"
                                className={({ isActive }) => `rounded-md px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-950'}`}
                            >
                                Dashboard
                            </NavLink>
                        </nav>
                        <button
                            type="button"
                            onClick={() => void logout()}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950"
                        >
                            <LogOut className="h-4 w-4" aria-hidden="true" />
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                <Outlet />
            </main>
        </div>
    );
}

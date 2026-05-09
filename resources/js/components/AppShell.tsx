import { LogOut, Thermometer } from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function AppShell() {
    const { user, logout } = useAuth();

    return (
        <div className="min-h-screen">
            <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
                <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
                    <Link to="/dashboard" className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
                            <Thermometer className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-slate-950 sm:text-base">Blood Refrigerator Monitor</span>
                            <span className="block truncate text-xs text-slate-500">Organization: {user?.customer.name}</span>
                        </span>
                    </Link>

                    <div className="flex min-w-0 shrink-0 items-center justify-end gap-2 sm:gap-3">
                        <nav className="hidden items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 md:flex" aria-label="Primary navigation">
                            <NavLink
                                to="/dashboard"
                                className={({ isActive }) => `rounded-md px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-950'}`}
                            >
                                Dashboard
                            </NavLink>
                        </nav>
                        <button
                            type="button"
                            aria-label="Log out"
                            onClick={() => void logout()}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950 focus:outline-none focus:ring-4 focus:ring-slate-200"
                        >
                            <LogOut className="h-4 w-4" aria-hidden="true" />
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
                <Outlet />
            </main>
        </div>
    );
}

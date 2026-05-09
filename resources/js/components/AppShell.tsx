import { LogOut, ShieldCheck, Thermometer } from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function AppShell() {
    const { user, logout } = useAuth();
    const isAdmin = user?.role === 'admin';
    const navItems = [
        { to: '/dashboard', label: 'Dashboard' },
        ...(isAdmin ? [
            { to: '/admin', label: 'Admin' },
            { to: '/admin/customers', label: 'Clients' },
            { to: '/admin/users', label: 'Users' },
            { to: '/admin/devices', label: 'Refrigerators' },
        ] : []),
    ];

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
                            <span className="block truncate text-xs text-slate-500">
                                {isAdmin ? 'Company administration' : `Organization: ${user?.customer?.name ?? 'Unassigned'}`}
                            </span>
                        </span>
                    </Link>

                    <div className="flex min-w-0 shrink-0 items-center justify-end gap-2 sm:gap-3">
                        {isAdmin ? (
                            <span className="hidden items-center gap-1 rounded-md border border-sky-100 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 sm:inline-flex">
                                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                                Admin
                            </span>
                        ) : null}
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
                <nav className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 pb-3 sm:px-6 lg:px-8" aria-label="Primary navigation">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === '/admin' || item.to === '/dashboard'}
                            className={({ isActive }) => `inline-flex h-10 shrink-0 items-center rounded-lg border px-3 text-sm font-semibold transition ${
                                isActive
                                    ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950'
                            }`}
                        >
                            {item.label}
                        </NavLink>
                    ))}
                </nav>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
                <Outlet />
            </main>
        </div>
    );
}

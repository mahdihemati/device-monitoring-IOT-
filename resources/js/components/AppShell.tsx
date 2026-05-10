import { Building2, LayoutDashboard, LogOut, Menu, ShieldCheck, Thermometer, Users, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { productNameFa } from '../utils/localization';
import { InstallPrompt, OfflineBanner } from './PwaStatus';

export function AppShell() {
    const { user, logout } = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const isAdmin = user?.role === 'admin';
    const navItems = [
        { to: '/dashboard', label: 'داشبورد', icon: LayoutDashboard },
        ...(isAdmin ? [
            { to: '/admin', label: 'مدیریت', icon: ShieldCheck },
            { to: '/admin/customers', label: 'مشتریان', icon: Building2 },
            { to: '/admin/users', label: 'کاربران', icon: Users },
            { to: '/admin/devices', label: 'یخچال‌ها', icon: Thermometer },
        ] : []),
    ];

    return (
        <div className="min-h-screen bg-slate-50 text-slate-950">
            <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 shadow-sm shadow-slate-200/60 backdrop-blur">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
                    <div className="flex min-w-0 items-center gap-2">
                        <button
                            type="button"
                            aria-label={mobileMenuOpen ? 'بستن منو' : 'باز کردن منو'}
                            onClick={() => setMobileMenuOpen((open) => ! open)}
                            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-sky-200 hover:text-sky-700 md:hidden"
                        >
                            {mobileMenuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
                        </button>

                        <Link to="/dashboard" className="flex min-w-0 items-center gap-3" onClick={() => setMobileMenuOpen(false)}>
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-sky-600 text-white shadow-sm shadow-sky-200">
                                <Thermometer className="h-5 w-5" aria-hidden="true" />
                            </span>
                            <span className="min-w-0">
                                <span className="block truncate text-sm font-bold text-slate-950 sm:text-base">{productNameFa}</span>
                                <span className="block truncate text-xs font-medium text-slate-500">
                                    {isAdmin ? 'مدیریت سامانه' : `مشتری: ${user?.customer?.name ?? 'تخصیص داده نشده'}`}
                                </span>
                            </span>
                        </Link>
                    </div>

                    <nav className="hidden min-w-0 flex-1 justify-center gap-1 px-4 md:flex" aria-label="ناوبری اصلی">
                        {navItems.map((item) => {
                            const Icon = item.icon;

                            return (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    end={item.to === '/admin' || item.to === '/dashboard'}
                                    className={({ isActive }) => `inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition ${
                                        isActive
                                            ? 'border-sky-200 bg-sky-50 text-sky-700 shadow-sm'
                                            : 'border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                                    }`}
                                >
                                    <Icon className="h-4 w-4" aria-hidden="true" />
                                    {item.label}
                                </NavLink>
                            );
                        })}
                    </nav>

                    <div className="flex min-w-0 shrink-0 items-center justify-end gap-2 sm:gap-3">
                        {isAdmin ? (
                            <span className="hidden items-center gap-1 rounded-md border border-sky-100 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 sm:inline-flex">
                                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                                مدیر
                            </span>
                        ) : null}
                        <button
                            type="button"
                            aria-label="خروج از حساب"
                            onClick={() => void logout()}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus:ring-4 focus:ring-slate-200"
                        >
                            <LogOut className="h-4 w-4" aria-hidden="true" />
                            <span className="hidden sm:inline">خروج</span>
                        </button>
                    </div>
                </div>

                {mobileMenuOpen ? (
                    <nav className="border-t border-slate-100 bg-white px-4 py-2 md:hidden" aria-label="ناوبری موبایل">
                        <div className="mx-auto grid max-w-7xl gap-1">
                            {navItems.map((item) => {
                                const Icon = item.icon;

                                return (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        end={item.to === '/admin' || item.to === '/dashboard'}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-lg border px-3 text-sm font-semibold transition ${
                                            isActive
                                                ? 'border-sky-200 bg-sky-50 text-sky-700'
                                                : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                                        }`}
                                    >
                                        <Icon className="h-4 w-4" aria-hidden="true" />
                                        {item.label}
                                    </NavLink>
                                );
                            })}
                        </div>
                    </nav>
                ) : null}

                <InstallPrompt />
                <OfflineBanner />
            </header>

            <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
                <Outlet />
            </main>
        </div>
    );
}

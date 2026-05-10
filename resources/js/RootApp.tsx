import type { ReactElement } from 'react';
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { LoadingState } from './components/StateBlocks';
import { useAuth } from './contexts/AuthContext';

const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const DeviceDetailPage = lazy(() => import('./pages/DeviceDetailPage').then((module) => ({ default: module.DeviceDetailPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then((module) => ({ default: module.AdminPage })));

function RequireAuth({ children }: { children: ReactElement }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="p-6">
                <LoadingState label="در حال بررسی نشست کاربر" />
            </div>
        );
    }

    if (! user) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

function RequireAdmin({ children }: { children: ReactElement }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="p-6">
                <LoadingState label="در حال بررسی دسترسی مدیریت" />
            </div>
        );
    }

    if (! user) {
        return <Navigate to="/login" replace />;
    }

    if (user.role !== 'admin') {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}

export function App() {
    return (
        <Suspense fallback={<div className="p-6"><LoadingState /></div>}>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route
                    element={(
                        <RequireAuth>
                            <AppShell />
                        </RequireAuth>
                    )}
                >
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/devices/:deviceId" element={<DeviceDetailPage />} />
                    <Route
                        path="/admin"
                        element={(
                            <RequireAdmin>
                                <AdminPage section="dashboard" />
                            </RequireAdmin>
                        )}
                    />
                    <Route
                        path="/admin/customers"
                        element={(
                            <RequireAdmin>
                                <AdminPage section="customers" />
                            </RequireAdmin>
                        )}
                    />
                    <Route
                        path="/admin/users"
                        element={(
                            <RequireAdmin>
                                <AdminPage section="users" />
                            </RequireAdmin>
                        )}
                    />
                    <Route
                        path="/admin/devices"
                        element={(
                            <RequireAdmin>
                                <AdminPage section="devices" />
                            </RequireAdmin>
                        )}
                    />
                </Route>
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </Suspense>
    );
}

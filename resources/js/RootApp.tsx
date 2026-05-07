import type { ReactElement } from 'react';
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { LoadingState } from './components/StateBlocks';
import { useAuth } from './contexts/AuthContext';

const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const DeviceDetailPage = lazy(() => import('./pages/DeviceDetailPage').then((module) => ({ default: module.DeviceDetailPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })));

function RequireAuth({ children }: { children: ReactElement }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="p-6">
                <LoadingState label="Checking session" />
            </div>
        );
    }

    if (! user) {
        return <Navigate to="/login" replace />;
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
                </Route>
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </Suspense>
    );
}

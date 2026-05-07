import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '../api/client';
import type { User } from '../types';

interface AuthContextValue {
    user: User | null;
    loading: boolean;
    login: (username: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshUser = useCallback(async () => {
        try {
            const response = await api.get<{ user: User }>('/me');
            setUser(response.data.user);
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void refreshUser();
    }, [refreshUser]);

    const login = useCallback(async (username: string, password: string) => {
        const response = await api.post<{ user: User }>('/login', { username, password });
        setUser(response.data.user);
    }, []);

    const logout = useCallback(async () => {
        await api.post('/logout');
        setUser(null);
    }, []);

    const value = useMemo<AuthContextValue>(() => ({
        user,
        loading,
        login,
        logout,
        refreshUser,
    }), [loading, login, logout, refreshUser, user]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);

    if (! context) {
        throw new Error('useAuth must be used inside AuthProvider.');
    }

    return context;
}

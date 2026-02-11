import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
    _id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    status: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (token: string, user: User) => void;
    logout: () => void;
    refreshUser: () => Promise<void>;
    loading: boolean;
}

import { adminApi } from '../api/client';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedToken = localStorage.getItem('authToken');
        const storedUser = localStorage.getItem('authUser');

        if (storedToken && storedUser && storedUser !== 'undefined') {
            try {
                setToken(storedToken);
                setUser(JSON.parse(storedUser));
            } catch (error) {
                console.error('Failed to parse stored user:', error);
                localStorage.removeItem('authToken');
                localStorage.removeItem('authUser');
            }
        } else {
            // Clean up if data is invalid or incomplete
            localStorage.removeItem('authToken');
            localStorage.removeItem('authUser');
        }
        setLoading(false);
    }, []);

    const refreshUser = async () => {
        try {
            const response = await adminApi.getAdminProfile();
            if (response.data.success) {
                const newUser = response.data.data;
                setUser(newUser);
                localStorage.setItem('authUser', JSON.stringify(newUser));
            }
        } catch (error) {
            console.error('Failed to refresh user:', error);
        }
    };

    const login = (newToken: string, newUser: User) => {
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('authToken', newToken);
        localStorage.setItem('authUser', JSON.stringify(newUser));
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
    };

    return (
        <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, login, logout, refreshUser, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

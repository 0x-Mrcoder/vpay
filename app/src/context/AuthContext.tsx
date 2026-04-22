import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    kycLevel: number;
    kyc_status: 'pending' | 'verified' | 'rejected';
    kyc_tier: 't1' | 't2' | 't3' | 'none';
    status: string;
    role: 'user' | 'admin';
    fullName?: string;
    webhookActive?: boolean;
    profilePicture?: string;

    // KYC Fields
    state?: string;
    lga?: string;
    address?: string;
    identityType?: string;
    nin?: string;
    bvn?: string;
    idCardPath?: string;
    selfiePath?: string;
    utilityBillPath?: string;

    // Business Fields
    businessName?: string;
    businessAddress?: string;
    businessPhone?: string;
    rcNumber?: string;
    cacDocumentPath?: string;
    isPayoutEnabled?: boolean;
    payoutRequestStatus?: 'none' | 'pending' | 'approved' | 'rejected';
    payoutRequestReason?: string;
    payoutIpWhitelist?: string[];
    webhookUrl?: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (token: string, user: User) => void;
    logout: () => void;
    updateUser: (user: User) => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check for stored token and user on mount
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
        }
        setIsLoading(false);
    }, []);

    const login = (newToken: string, newUser: User) => {
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));
        setToken(newToken);
        setUser(newUser);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
    };

    const updateUser = (updatedUser: User) => {
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
    };

    const refreshUser = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const apiUrl = (window as any)._env_?.REACT_APP_API_URL || 'http://localhost:5000';
            const response = await fetch(`${apiUrl}/api/auth/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            if (data.success) {
                updateUser(data.data);
            }
        } catch (error) {
            console.error('Failed to refresh user profile:', error);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isAuthenticated: !!token,
                isLoading,
                login,
                logout,
                updateUser,
                refreshUser,
            }}
        >
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

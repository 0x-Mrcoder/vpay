import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// API response type
export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
}

// User/Tenant types
export interface Tenant {
    _id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    businessName?: string;
    nin?: string;
    bvn?: string;
    idCardPath?: string;
    kycLevel: number;
    kyc_status: 'pending' | 'verified' | 'rejected';
    status: 'active' | 'inactive' | 'suspended';
    webhookUrl?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Admin {
    _id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    status: 'active' | 'inactive' | 'suspended';
    role: string;
    createdAt: string;
    updatedAt: string;
}



// Admin APIs
export const adminApi = {
    getAllTenants: async (): Promise<Tenant[]> => {
        const response = await api.get<ApiResponse<Tenant[]>>('/admin/tenants');
        return response.data.data || [];
    },
    getAllAdmins: async (): Promise<Admin[]> => {
        const response = await api.get<ApiResponse<Admin[]>>('/admin/admins');
        return response.data.data || [];
    },
    createAdmin: async (data: any): Promise<Admin> => {
        const response = await api.post<ApiResponse<Admin>>('/admin/admins', data);
        return response.data.data!;
    },

    getTenantById: async (id: string): Promise<Tenant> => {
        const response = await api.get<ApiResponse<Tenant>>(`/admin/tenants/${id}`);
        return response.data.data!;
    },

    updateTenantStatus: async (id: string, status: string): Promise<void> => {
        await api.patch(`/admin/tenants/${id}/status`, { status });
    },

    deleteTenant: async (id: string): Promise<void> => {
        await api.delete(`/admin/tenants/${id}`);
    },

    updateTenantKycStatus: async (id: string, status: 'pending' | 'verified' | 'rejected'): Promise<void> => {
        await api.patch(`/admin/tenants/${id}/kyc`, { status });
    },

    getStats: async (): Promise<any> => {
        const response = await api.get<ApiResponse<any>>('/admin/stats');
        return response.data.data;
    },



    getTransactions: async (params?: any): Promise<any> => {
        const response = await api.get<ApiResponse<any>>('/admin/transactions', { params });
        return response.data.data;
    },

    flagTransaction: async (id: string, flagged: boolean): Promise<any> => {
        const response = await api.patch<ApiResponse<any>>(`/admin/transactions/${id}/flag`, { flagged });
        return response.data.data;
    },

    verifyTransaction: async (id: string): Promise<any> => {
        const response = await api.post<ApiResponse<any>>(`/admin/transactions/${id}/verify`);
        return response.data;
    },

    getSettlements: async (params?: any): Promise<any> => {
        const response = await api.get<ApiResponse<any>>('/admin/settlements', { params });
        return response.data.data || [];
    },
    processSettlement: async (id: string): Promise<any> => {
        const response = await api.post<ApiResponse<any>>(`/admin/settlements/${id}/process`);
        return response.data;
    },
    retrySettlement: async (id: string): Promise<any> => {
        const response = await api.post<ApiResponse<any>>(`/admin/settlements/${id}/retry`);
        return response.data;
    },
    // Disputes
    getDisputes: async (): Promise<any[]> => {
        const response = await api.get<ApiResponse<any[]>>('/admin/disputes');
        return response.data.data || [];
    },

    createDispute: async (data: any): Promise<any> => {
        const response = await api.post<ApiResponse<any>>('/admin/dispute', data);
        return response.data.data;
    },

    updateDispute: async (id: string, data: any): Promise<any> => {
        const response = await api.patch<ApiResponse<any>>(`/admin/dispute/${id}`, data);
        return response.data;
    },


    manualTriggerSettlement: async (data: any): Promise<any> => {
        const response = await api.post<ApiResponse<any>>('/admin/settlements/manual-trigger', data);
        return response.data;
    },

    // Settlement Schedule Management


    // Global settlement configuration
    getGlobalSettlementConfig: async (): Promise<any> => {
        const response = await api.get<ApiResponse<any>>('/admin/settlements/global-config');
        return response.data.data;
    },

    updateGlobalSettlementConfig: async (data: any): Promise<any> => {
        const response = await api.put<ApiResponse<any>>('/admin/settlements/global-config', data);
        return response.data;
    },

    bulkConfigureSettlements: async (force: boolean = false): Promise<any> => {
        const response = await api.post<ApiResponse<any>>('/admin/settlements/bulk-configure', { force });
        return response.data;
    },

    getWebhooks: async (params?: any): Promise<any> => {
        const response = await api.get<ApiResponse<any>>('/admin/webhooks', { params });
        return response.data.data;
    },

    retryWebhook: async (id: string): Promise<any> => {
        const response = await api.post<ApiResponse<any>>(`/admin/webhooks/${id}/retry`);
        return response.data;
    },

    getApiKeys: async (): Promise<any[]> => {
        const response = await api.get<ApiResponse<any[]>>('/admin/api-keys');
        return response.data.data || [];
    },

    generateApiKey: async (data: any): Promise<any> => {
        const response = await api.post<ApiResponse<any>>('/admin/api-keys', data);
        return response.data.data;
    },

    revokeApiKey: async (id: string): Promise<any> => {
        const response = await api.delete<ApiResponse<any>>(`/admin/api-keys/${id}`);
        return response.data;
    },



    // Fee Management
    getFees: async (): Promise<any[]> => {
        const response = await api.get<ApiResponse<any[]>>('/admin/fees');
        return response.data.data || [];
    },
    createFee: async (data: any): Promise<any> => {
        const response = await api.post<ApiResponse<any>>('/admin/fees', data);
        return response.data.data;
    },
    updateFee: async (id: string, data: any): Promise<any> => {
        const response = await api.patch<ApiResponse<any>>(`/admin/fees/${id}`, data);
        return response.data.data;
    },
    deleteFee: async (id: string): Promise<any> => {
        const response = await api.delete<ApiResponse<any>>(`/admin/fees/${id}`);
        return response.data;
    },

    // Risk Management
    getRiskRules: async (): Promise<any[]> => {
        const response = await api.get<ApiResponse<any[]>>('/admin/risk');
        return response.data.data || [];
    },
    createRiskRule: async (data: any): Promise<any> => {
        const response = await api.post<ApiResponse<any>>('/admin/risk', data);
        return response.data.data;
    },
    updateRiskRule: async (id: string, data: any): Promise<any> => {
        const response = await api.patch<ApiResponse<any>>(`/admin/risk/${id}`, data);
        return response.data.data;
    },
    deleteRiskRule: async (id: string): Promise<any> => {
        const response = await api.delete<ApiResponse<any>>(`/admin/risk/${id}`);
        return response.data;
    },

    // Communications
    sendBulkEmail: async (data: any): Promise<any> => {
        const response = await api.post<ApiResponse<any>>('/admin/communications/send', data);
        return response.data;
    },

    sendSingleEmail: async (data: { userId: string; subject: string; message: string }): Promise<any> => {
        const response = await api.post<ApiResponse<any>>('/admin/communications/send-single', data);
        return response.data;
    },

    getRecentCommunications: async (): Promise<any[]> => {
        const response = await api.get<ApiResponse<any[]>>('/admin/communications/recent');
        return response.data.data || [];
    },

    // System Settings
    getSystemSettings: async (): Promise<any> => {
        const response = await api.get<ApiResponse<any>>('/admin/settings');
        return response.data.data;
    },
    updateSystemSettings: async (data: any): Promise<any> => {
        const response = await api.patch<ApiResponse<any>>('/admin/settings', data);
        return response.data.data;
    },
    getSystemStatus: async (): Promise<any> => {
        const response = await api.get<ApiResponse<any>>('/admin/system/cron-status');
        return response.data.data;
    },

    // Admin Profile
    updateAdminProfile: (data: any) => api.put('/admin/profile', data),
    changeAdminPassword: (data: any) => api.put('/admin/profile/password', data),
    getAdminProfile: () => api.get('/admin/profile'),

    // Help Messages
    getHelpMessages: async (): Promise<any[]> => {
        const response = await api.get<ApiResponse<any[]>>('/help/admin/messages');
        return response.data.data || [];
    },

    updateHelpMessageStatus: async (id: string, status: string): Promise<any> => {
        const response = await api.patch<ApiResponse<any>>(`/help/admin/messages/${id}/status`, { status });
        return response.data.data;
    },
    // Bank APIs
    getBanks: async (): Promise<any[]> => {
        const response = await api.get<ApiResponse<any[]>>('/banks');
        return response.data.data || [];
    },
    verifyAccount: async (bankCode: string, accountNumber: string): Promise<any> => {
        const response = await api.get<ApiResponse<any>>('/banks/verify', {
            params: { bankCode, accountNumber }
        });
        return response.data.data;
    },
    // Audit Logs
    getAuditLogs: async (params?: any): Promise<{ logs: any[]; pagination: any }> => {
        const response = await api.get<ApiResponse<any>>('/admin/audit-logs', { params });
        return response.data.data;
    },
};

// Auth APIs
export const authApi = {
    login: async (credentials: any): Promise<any> => {
        const response = await api.post<ApiResponse<any>>('/admin/login', credentials);
        return response.data.data;
    },
};

export default api;

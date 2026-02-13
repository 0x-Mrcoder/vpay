import axios from 'axios';

// Create axios instance
const api = axios.create({
    // baseURL: import.meta.env.VITE_API_URL || 'https://vtpayapi.vtfree.com.ng/api',
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',

    // VITE_API_URL=
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to add the auth token to headers
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle 401 errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            // Clear token and redirect to login if unauthorized or forbidden (suspended)
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;

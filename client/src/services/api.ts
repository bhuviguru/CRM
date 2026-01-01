import axios, { AxiosError, AxiosRequestConfig } from 'axios';

// Get API URL from environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000, // 30 seconds
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor to add auth token
axiosInstance.interceptors.request.use(
    (config) => {
        // Get token from localStorage
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('auth_token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        if (error.response) {
            // Server responded with error status
            const status = error.response.status;

            if (status === 401) {
                // Unauthorized - clear token and redirect to login
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('auth_token');
                    window.location.href = '/login';
                }
            } else if (status === 403) {
                // Forbidden - show error
                console.error('Access denied:', error.response.data);
            } else if (status === 429) {
                // Rate limit exceeded
                // console.error('Rate limit exceeded:', error.response.data);
            } else if (status >= 500) {
                // Server error
                console.error('Server error:', error.response.data);
            }
        } else if (error.request) {
            // Request made but no response
            console.error('No response from server:', error.message);
        } else {
            // Error in request setup
            console.error('Request error:', error.message);
        }

        return Promise.reject(error);
    }
);

// Types
interface Customer {
    id: string;
    account_name: string;
    industry: string;
    tier: string;
    mrr: number;
    arr?: number;
    status: string;
    health_score: number;
    email?: string;
    phone?: string;
    primary_contact?: {
        name?: string;
        email?: string;
        phone?: string;
    };
    renewal_date?: string;
    created_at: string;
    updated_at: string;
}

interface Task {
    id: string;
    customer_id?: string;
    title: string;
    description?: string;
    status: 'open' | 'in_progress' | 'completed' | 'cancelled';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    assigned_to?: string;
    due_date?: string;
    created_at: string;
    updated_at: string;
}

interface ApiError {
    success: false;
    error: {
        code: string;
        message: string;
        details?: string;
    };
}

interface ApiResponse<T> {
    success: true;
    data: T;
}

/**
 * Handle API errors consistently
 * @throws {Error} Always throws an error with user-friendly message
 */
const handleError = (error: unknown): never => {
    if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<any>;

        const data = axiosError.response?.data;

        // Handle various error formats
        if (data) {
            // Format 1: { error: "Something went wrong" }
            if (typeof data.error === 'string') {
                throw new Error(data.error);
            }

            // Format 2: { error: { message: "Something went wrong" } }
            if (data.error?.message) {
                throw new Error(data.error.message);
            }

            // Format 3: { message: "Something went wrong" }
            if (data.message) {
                throw new Error(data.message);
            }
        }

        if (axiosError.message === 'Network Error') {
            throw new Error('Unable to connect to server. Please check your connection.');
        }

        if (axiosError.code === 'ECONNABORTED') {
            throw new Error('Request timeout. Please try again.');
        }

        throw new Error(axiosError.message || 'An error occurred');
    }

    throw error instanceof Error ? error : new Error('An unknown error occurred');
};

// Customer API
export const customerApi = {
    /**
     * Get all customers with optional filtering
     */
    getAll: async (params?: {
        page?: number;
        limit?: number;
        status?: string;
        tier?: string;
        minHealth?: number;
        maxHealth?: number;
    }): Promise<{ data: Customer[]; pagination: any }> => {
        try {
            const response = await axiosInstance.get('/customers', { params });
            return response.data;
        } catch (error) {
            return handleError(error);
        }
    },

    /**
     * Create a new customer
     */
    create: async (customer: Partial<Customer>): Promise<Customer> => {
        try {
            const response = await axiosInstance.post('/customers', customer);
            return response.data;
        } catch (error) {
            return handleError(error);
        }
    },

    /**
     * Update a customer
     */
    update: async (id: string, updates: Partial<Customer>): Promise<Customer> => {
        try {
            const response = await axiosInstance.put(`/customers/${id}`, updates);
            return response.data;
        } catch (error) {
            return handleError(error);
        }
    },

    /**
     * Delete a customer (soft delete)
     */
    delete: async (id: string): Promise<void> => {
        try {
            await axiosInstance.delete(`/customers/${id}`);
        } catch (error) {
            return handleError(error);
        }
    },

    /**
     * Get customer activity
     */
    getActivity: async (id: string): Promise<any[]> => {
        try {
            const response = await axiosInstance.get(`/customers/${id}/activity`);
            return response.data;
        } catch (error) {
            return handleError(error);
        }
    },

    /**
     * Trigger AI analysis for all customers
     */
    analyzeAll: async (): Promise<{ analyzed: number; failed: number }> => {
        try {
            const response = await axiosInstance.post('/customers/analyze-all');
            return response.data;
        } catch (error) {
            return handleError(error);
        }
    }
};

// Task API
export const taskApi = {
    /**
     * Get all tasks
     */
    getAll: async (): Promise<Task[]> => {
        try {
            const response = await axiosInstance.get('/tasks');
            return response.data;
        } catch (error) {
            return handleError(error);
        }
    },

    /**
     * Create a new task
     */
    create: async (task: Partial<Task>): Promise<Task> => {
        try {
            const response = await axiosInstance.post('/tasks', task);
            return response.data;
        } catch (error) {
            return handleError(error);
        }
    },

    /**
     * Update a task
     */
    update: async (id: string, updates: Partial<Task>): Promise<Task> => {
        try {
            const response = await axiosInstance.put(`/tasks/${id}`, updates);
            return response.data;
        } catch (error) {
            return handleError(error);
        }
    },

    /**
     * Delete a task
     */
    delete: async (id: string): Promise<void> => {
        try {
            await axiosInstance.delete(`/tasks/${id}`);
        } catch (error) {
            return handleError(error);
        }
    }
};

// AI API
export const aiApi = {
    /**
     * Get churn prediction for a customer
     */
    predictChurn: async (usageData: {
        support_tickets: number;
        email_response_time: number;
        usage_frequency: number;
        contract_value: number;
    }): Promise<{
        churn_probability: number;
        risk_level: string;
        reasoning: string;
        recommendations: string[];
    }> => {
        try {
            const response = await axiosInstance.post('/predict/churn', usageData);
            return response.data;
        } catch (error) {
            return handleError(error);
        }
    }
};

// Dashboard API
export const dashboardApi = {
    /**
     * Get dashboard statistics
     */
    getStats: async (): Promise<{
        totalCustomers: number;
        activeCustomers: number;
        churnRisk: number;
        avgHealthScore: number;
        revenueAtRisk: number;
    }> => {
        try {
            const response = await axiosInstance.get('/dashboard/stats');
            return response.data;
        } catch (error) {
            return handleError(error);
        }
    },

    /**
     * Get churn risk data
     */
    getChurnRisk: async (): Promise<{ name: string; churn: number }[]> => {
        try {
            const response = await axiosInstance.get('/dashboard/churn-risk');
            return response.data;
        } catch (error) {
            return handleError(error);
        }
    },

    /**
     * Get recent activity
     */
    getRecentActivity: async (): Promise<{ name: string; desc: string; badge: string; badgeColor: string }[]> => {
        try {
            const response = await axiosInstance.get('/dashboard/recent-activity');
            return response.data;
        } catch (error) {
            return handleError(error);
        }
    }
};

// Email API
export const emailApi = {
    /**
     * Send an email
     */
    send: async (emailData: {
        to: string;
        subject: string;
        body: string;
        template?: string;
    }): Promise<void> => {
        try {
            await axiosInstance.post('/email/send', emailData);
        } catch (error) {
            return handleError(error);
        }
    }
};

// Auth API
export const authApi = {
    /**
     * Login
     */
    login: async (email: string, password: string): Promise<{ token: string; user: any }> => {
        try {
            const response = await axiosInstance.post('/auth/login', { email, password });

            // Store token
            if (typeof window !== 'undefined' && response.data.data?.token) {
                localStorage.setItem('auth_token', response.data.data.token);
            }

            return response.data.data;
        } catch (error) {
            return handleError(error);
        }
    },

    /**
     * Logout
     */
    logout: async (): Promise<void> => {
        try {
            await axiosInstance.post('/auth/logout');
        } finally {
            // Always clear token
            if (typeof window !== 'undefined') {
                localStorage.removeItem('auth_token');
            }
        }
    },

    /**
     * Get current user
     */
    getCurrentUser: async (): Promise<any> => {
        try {
            const response = await axiosInstance.get('/auth/me');
            return response.data;
        } catch (error) {
            return handleError(error);
        }
    }
};

// Export all APIs as default
const api = {
    customer: customerApi,
    task: taskApi,
    ai: aiApi,
    dashboard: dashboardApi,
    email: emailApi,
    auth: authApi
};

export default api;

// Also export as named export for convenience
export { api };

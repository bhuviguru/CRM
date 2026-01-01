"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

interface User {
    id: string
    email: string
    name: string
    role: string
}

interface AuthContextType {
    user: User | null
    token: string | null
    login: (email: string, password: string) => Promise<void>
    logout: () => void
    isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [token, setToken] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        // Check for stored token on mount
        const storedToken = localStorage.getItem('token')
        const storedUser = localStorage.getItem('user')

        if (storedToken && storedUser && storedUser !== 'undefined') {
            try {
                const parsedUser = JSON.parse(storedUser);
                setToken(storedToken);
                setUser(parsedUser);
                // CRITICAL: Restore header on refresh
                axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
            } catch (error) {
                // Clear invalid data
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                delete axios.defaults.headers.common['Authorization'];
            }
        }
        setIsLoading(false)
    }, [])

    const login = async (email: string, password: string) => {
        try {
            const response = await axios.post(`${API_URL}/auth/login`, {
                email,
                password
            })

            const { data } = response;

            // STRICT VALIDATION
            if (!data.success) {
                throw new Error(data.message || 'Login failed');
            }

            const authToken = data.token;
            const userData = data.user;

            if (!authToken || !userData) {
                throw new Error('Invalid response from server: Missing token or user');
            }

            setUser(userData)
            setToken(authToken)

            // Store in localStorage
            localStorage.setItem('token', authToken)
            localStorage.setItem('user', JSON.stringify(userData))

            // Set default header for future requests
            axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`

            // Redirect to dashboard
            router.push('/')
        } catch (error: any) {
            // console.error('Login failed:', error)
            // If axios error, extract message, otherwise use error object
            const msg = error.response?.data?.message || error.message || 'Login failed';
            throw new Error(msg);
        }
    }

    const logout = () => {
        setUser(null)
        setToken(null)
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        router.push('/login')
    }

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

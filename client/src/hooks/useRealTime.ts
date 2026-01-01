"use client"

import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import toast from 'react-hot-toast'

// Types
interface Customer {
    id: string;
    account_name?: string;
    health_score?: number;
    status?: string;
    [key: string]: any;
}

interface Activity {
    type: string;
    title: string;
    timestamp: string;
    [key: string]: any;
}

let socket: Socket | null = null

/**
 * Hook for real-time customer updates
 * @param initialCustomers - Initial customer list
 * @returns Object with customers array, online users, and socket instance
 */
export const useRealTimeCustomers = (initialCustomers: Customer[]) => {
    const [customers, setCustomers] = useState<Customer[]>(initialCustomers)
    const [onlineUsers, setOnlineUsers] = useState<string[]>([])

    useEffect(() => {
        // Initialize WebSocket
        if (!socket) {
            const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5000'
            socket = io(wsUrl)

            socket.on('connect', () => {
                console.log('✅ Connected to real-time server')
                socket?.emit('join', 'current-user')
            })

            // Listen for customer updates
            socket.on('customer:updated', (data: {
                customerId: string;
                changes: Partial<Customer>;
                updatedBy: string;
            }) => {
                console.log('📡 Customer updated:', data)

                setCustomers(prev =>
                    prev.map(c =>
                        c.id === data.customerId
                            ? { ...c, ...data.changes }
                            : c
                    )
                )

                // Show toast notification
                const customerName = data.changes.account_name || 'a customer'
                toast.success(`${data.updatedBy} updated ${customerName}`, {
                    duration: 3000
                })
            })

            // Listen for new customers
            socket.on('customer:created', (data: { customer: Customer }) => {
                setCustomers(prev => [data.customer, ...prev])
                toast.success(`New customer added: ${data.customer.account_name}`)
            })

            // User presence
            socket.on('user:online', (data: { userId: string }) => {
                setOnlineUsers(prev => [...prev, data.userId])
            })

            socket.on('user:offline', (data: { userId: string }) => {
                setOnlineUsers(prev => prev.filter(id => id !== data.userId))
            })
        }

        return () => {
            socket?.off('customer:updated')
            socket?.off('customer:created')
            socket?.off('user:online')
            socket?.off('user:offline')
        }
    }, [])

    return { customers, onlineUsers, socket }
}

/**
 * Hook for tracking who's viewing a customer
 * @param customerId - Customer ID to track
 * @returns Array of viewer user IDs
 */
export const useCustomerViewing = (customerId: string) => {
    const [viewers, setViewers] = useState<string[]>([])

    useEffect(() => {
        if (!socket || !customerId) return

        // Join customer room
        socket.emit('view:customer', customerId)

        // Listen for viewers
        socket.on('viewer:joined', (data: { customerId: string; userId: string }) => {
            if (data.customerId === customerId) {
                setViewers(prev => [...prev, data.userId])
            }
        })

        socket.on('viewer:left', (data: { customerId: string; userId: string }) => {
            if (data.customerId === customerId) {
                setViewers(prev => prev.filter(id => id !== data.userId))
            }
        })

        return () => {
            socket?.emit('leave:customer', customerId)
            socket?.off('viewer:joined')
            socket?.off('viewer:left')
        }
    }, [customerId])

    return viewers
}

/**
 * Hook for real-time activity stream
 * @param customerId - Customer ID to track activities for
 * @returns Array of activities
 */
export const useActivityStream = (customerId: string) => {
    const [activities, setActivities] = useState<Activity[]>([])

    useEffect(() => {
        if (!socket || !customerId) return

        socket.on('activity:new', (data: Activity) => {
            setActivities(prev => [data, ...prev])

            // Show toast for important activities
            if (data.type === 'churn_alert') {
                toast.error(`Churn Alert: ${data.title}`, { duration: 10000 })
            }
        })

        return () => {
            socket?.off('activity:new')
        }
    }, [customerId])

    return activities
}

"use client"

import { useState, useEffect } from "react"
import { Bell, X, CheckCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { initializeWebSocket, requestNotificationPermission } from "@/services/websocket"

interface Notification {
    id: string
    type: string
    title: string
    message: string
    link?: string
    read: boolean
    created_at: string
    severity?: string
}

export function NotificationCenter() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        // Initialize WebSocket
        const socket = initializeWebSocket('current-user')

        // Request browser notification permission
        requestNotificationPermission()

        // Listen for new notifications
        socket?.on('notification', (notification: any) => {
            setNotifications(prev => [
                {
                    id: Date.now().toString(),
                    ...notification,
                    read: false,
                    created_at: new Date().toISOString()
                },
                ...prev
            ])
            setUnreadCount(prev => prev + 1)
        })

        return () => {
            socket?.off('notification')
        }
    }, [])

    const markAsRead = (id: string) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
    }

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        setUnreadCount(0)
    }

    const getSeverityColor = (severity?: string) => {
        switch (severity) {
            case 'Critical': return 'destructive'
            case 'High': return 'destructive'
            case 'Medium': return 'default'
            default: return 'secondary'
        }
    }

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                        >
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-0" align="end">
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="font-semibold">Notifications</h3>
                    {unreadCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                            <CheckCheck className="h-4 w-4 mr-2" />
                            Mark all read
                        </Button>
                    )}
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            <Bell className="h-12 w-12 mx-auto mb-2 opacity-20" />
                            <p>No notifications yet</p>
                        </div>
                    ) : (
                        notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`p-4 border-b hover:bg-accent cursor-pointer transition-colors ${!notification.read ? 'bg-accent/50' : ''
                                    }`}
                                onClick={() => {
                                    markAsRead(notification.id)
                                    if (notification.link) {
                                        window.location.href = notification.link
                                    }
                                }}
                            >
                                <div className="flex items-start justify-between mb-1">
                                    <h4 className="font-medium text-sm">{notification.title}</h4>
                                    {notification.severity && (
                                        <Badge variant={getSeverityColor(notification.severity)} className="text-xs">
                                            {notification.severity}
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                                <p className="text-xs text-muted-foreground">
                                    {new Date(notification.created_at).toLocaleString()}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}

import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';

// Types
interface Notification {
    type: string;
    title: string;
    message: string;
    link?: string;
    severity?: 'Low' | 'Medium' | 'High' | 'Critical';
}

let socket: Socket | null = null;

/**
 * Initialize WebSocket connection
 * @param userId - User ID to join user-specific room
 * @returns Socket instance
 */
export const initializeWebSocket = (userId: string): Socket => {
    if (socket) return socket;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5000';

    socket = io(wsUrl, {
        transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
        console.log('✅ WebSocket connected');
        socket?.emit('join', userId);
    });

    socket.on('notification', (notification: Notification) => {
        console.log('📬 Notification received:', notification);

        // Show toast notification
        const message = `${notification.title}\n${notification.message}`;

        if (notification.severity === 'Critical' || notification.severity === 'High') {
            toast.error(message, {
                duration: 10000,
                style: { maxWidth: '500px' }
            });
        } else {
            toast.success(message, {
                duration: 5000,
                style: { maxWidth: '500px' }
            });
        }

        // Trigger browser notification if permitted
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(notification.title, {
                body: notification.message,
                icon: '/logo.png',
                tag: notification.type
            });
        }
    });

    socket.on('disconnect', () => {
        console.log('❌ WebSocket disconnected');
    });

    socket.on('error', (error: Error) => {
        console.error('WebSocket error:', error);
    });

    return socket;
};

/**
 * Request browser notification permission
 * @returns Promise<boolean> - True if permission granted
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
        console.warn('Browser does not support notifications');
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    return false;
};

/**
 * Disconnect WebSocket
 */
export const disconnectWebSocket = (): void => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

/**
 * Get current socket instance
 * @returns Socket instance or null
 */
export const getSocket = (): Socket | null => socket;

/**
 * Join a customer room for live collaboration
 * @param customerId - Customer ID
 */
export const joinCustomerRoom = (customerId: string): void => {
    socket?.emit('view:customer', customerId);
};

/**
 * Leave a customer room
 * @param customerId - Customer ID
 */
export const leaveCustomerRoom = (customerId: string): void => {
    socket?.emit('leave:customer', customerId);
};

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode, useMemo, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth } from './AuthContext';
import { Config } from '../constants/Config';
import { logger } from '../utils/logger';
import { eventManager } from '@/utils/EventManager';

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
    lastError: string | null;
    reconnect: () => void;
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
    lastError: null,
    reconnect: () => { },
});

interface SocketProviderProps {
    children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
    const { token, user } = useAuth();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [lastError, setLastError] = useState<string | null>(null);

    // Use refs for stable instances and timeouts
    const socketRef = useRef<Socket | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Heartbeat mechanism
    const stopHeartbeat = useCallback(() => {
        if (pingTimeoutRef.current) {
            clearInterval(pingTimeoutRef.current);
            pingTimeoutRef.current = null;
        }
    }, []);

    const startHeartbeat = useCallback((socket: Socket) => {
        stopHeartbeat();
        // Ping every 25 seconds
        pingTimeoutRef.current = setInterval(() => {
            if (socket.connected) {
                socket.emit('ping');
            }
        }, 25000);
    }, [stopHeartbeat]);

    const connect = useCallback(() => {
        // Only connect if authenticated
        if (!token || !user?.id) {
            logger.socket('No token or user, skipping connection');
            return null;
        }

        // Don't reconnect if socket is already connected with same auth
        if (socketRef.current?.connected) {
             return socketRef.current;
        }

        // Parse base URL - remove trailing slash and /api if present
        let baseUrl = Config.API_URL;
        if (baseUrl.endsWith('/')) {
            baseUrl = baseUrl.slice(0, -1);
        }

        logger.socket('Connecting to:', baseUrl);

        const socketInstance = io(baseUrl, {
            path: '/api/socket',
            auth: {
                userId: user.id,
                userRole: user.role || 'USER',
            },
            // Reconnection settings - Improved based on audit
            reconnection: true,
            reconnectionAttempts: Infinity, // Keep trying
            reconnectionDelay: 1000,
            reconnectionDelayMax: 30000, // Max 30 seconds
            randomizationFactor: 0.5, // Add randomness
            // Timeout settings
            timeout: 30000,
            // Transport settings - websocket first, then polling
            transports: ['websocket', 'polling'],
            autoConnect: true,
            // Extra headers for auth
            extraHeaders: {
                Authorization: `Bearer ${token}`,
            },
        });

        socketInstance.on('connect', () => {
            logger.socket('Connected:', socketInstance.id);
            setIsConnected(true);
            setLastError(null);

            // Join user's personal room for notifications
            socketInstance.emit('join:room', { room: `user:${user.id}` });

            // Start heartbeat check
            startHeartbeat(socketInstance);
        });

        socketInstance.on('disconnect', (reason) => {
            logger.socket('Disconnected:', reason);
            setIsConnected(false);
            stopHeartbeat();
        });

        socketInstance.on('connect_error', (error) => {
            logger.error('[WS] Connection error:', error.message);
            setLastError(error.message);
            setIsConnected(false);
        });

        socketInstance.on('reconnect', (attemptNumber) => {
            logger.socket('Reconnected after', attemptNumber, 'attempts');
            setIsConnected(true);
            setLastError(null);

            // Re-join rooms after reconnect
            socketInstance.emit('join:room', { room: `user:${user.id}` });
            startHeartbeat(socketInstance);
        });

        socketInstance.on('reconnect_error', (error) => {
            logger.warn('[WS] Reconnection error:', error.message);
        });

        socketInstance.on('reconnect_failed', () => {
            logger.error('[WS] Reconnection failed after all attempts');
            setLastError('Koneksi terputus');
        });

        // Custom ping/pong for application level health check
        socketInstance.on('pong', () => {
            // Heartbeat received, connection is alive
        });

        return socketInstance;
    }, [token, user, startHeartbeat, stopHeartbeat]);

    // Heartbeat mechanism functions moved up to be used in connect

    // Initialize socket connection with cleanup
    useEffect(() => {
        // Clear any pending reconnect
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        // Delay connection to avoid rapid changes
        reconnectTimeoutRef.current = setTimeout(() => {
            // Cleanup existing socket if any
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current.removeAllListeners();
            }

            const socketInstance = connect();
            if (socketInstance) {
                socketRef.current = socketInstance;
                setSocket(socketInstance);
            }
        }, 500);

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (socketRef.current) {
                logger.socket('Cleaning up socket connection');
                socketRef.current.disconnect();
                socketRef.current.removeAllListeners();
                socketRef.current = null;
            }
            stopHeartbeat();
        };
    }, [connect, stopHeartbeat]);

    // Reconnect function
    const reconnect = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current.removeAllListeners();
        }
        const newSocket = connect();
        if (newSocket) {
            socketRef.current = newSocket;
            setSocket(newSocket);
        }
    }, [connect]);

    // Handle app state changes (reconnect when app becomes active)
    useEffect(() => {
        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active' && socketRef.current && !socketRef.current.connected) {
                logger.socket('App active, attempting reconnect...');
                socketRef.current.connect();
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);

        // Register with EventManager for centralized cleanup tracking
        eventManager.addListener('socket', handleAppStateChange, () => subscription.remove());

        return () => {
            eventManager.removeListener('socket', handleAppStateChange);
        };
    }, []);

    const value = useMemo(() => ({
        socket,
        isConnected,
        lastError,
        reconnect
    }), [socket, isConnected, lastError, reconnect]);

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
}

/**
 * Hook to access socket context
 */
export function useSocket() {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
}

/**
 * Hook to subscribe to a socket event
 */
export function useSocketEvent<T>(event: string, handler: (data: T) => void) {
    const { socket, isConnected } = useSocket();
    const handlerRef = useRef(handler);

    // Update ref when handler changes
    useEffect(() => {
        handlerRef.current = handler;
    }, [handler]);

    useEffect(() => {
        if (!socket || !isConnected) return;

        const wrappedHandler = (data: T) => {
            handlerRef.current(data);
        };

        socket.on(event, wrappedHandler);

        return () => {
            socket.off(event, wrappedHandler);
        };
    }, [socket, isConnected, event]);
}

/**
 * Hook to join a room
 */
export function useSocketRoom(room: string) {
    const { socket, isConnected } = useSocket();

    useEffect(() => {
        if (!socket || !isConnected || !room) return;

        logger.socket(`Joining room: ${room}`);
        socket.emit('join:room', { room });

        return () => {
            logger.socket(`Leaving room: ${room}`);
            socket.emit('leave:room', { room });
        };
    }, [socket, isConnected, room]);
}

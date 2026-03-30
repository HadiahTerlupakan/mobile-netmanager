import type { User } from './AuthContext';

export const SOCKET_TRANSPORTS = ['websocket', 'polling'] as const;

interface SocketConnectionStateOptions {
    token: string | null;
    tenantUrl: string | null;
    user: Pick<User, 'id' | 'role'> | null | undefined;
}

export interface SocketConnectionState {
    baseUrl: string | null;
    canConnect: boolean;
    userId: string | null;
    userRole: string;
}

export function normalizeSocketBaseUrl(tenantUrl: string): string {
    return tenantUrl.endsWith('/') ? tenantUrl.slice(0, -1) : tenantUrl;
}

export function getSocketConnectionState({ token, tenantUrl, user }: SocketConnectionStateOptions): SocketConnectionState {
    const userId = user?.id ?? null;
    const userRole = user?.role || 'USER';
    const baseUrl = tenantUrl ? normalizeSocketBaseUrl(tenantUrl) : null;

    return {
        baseUrl,
        canConnect: Boolean(token && baseUrl && userId),
        userId,
        userRole,
    };
}

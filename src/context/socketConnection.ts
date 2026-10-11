import { isAkunInvestor } from '@/utils/investor';
import { isAkunPelanggan } from '@/utils/pelanggan';
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
        // Investor dan pelanggan tidak memakai realtime (chat/presence/work
        // order); endpoint token Firebase menolak tokennya dan 401-nya akan
        // menutup sesi. Pelanggan sempat tertinggal dari penjaga ini: ia
        // berhasil masuk lalu tertendang kembali ke login beberapa detik
        // kemudian, sehingga portalnya tidak bisa dipakai sama sekali.
        canConnect:
            Boolean(token && baseUrl && userId) &&
            !isAkunInvestor(user) &&
            !isAkunPelanggan(user),
        userId,
        userRole,
    };
}

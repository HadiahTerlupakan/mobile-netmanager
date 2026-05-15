import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { logger } from '@/utils/logger';

class NetworkStateServiceImpl {
  private isConnected: boolean = true;
  private unsubscribe: (() => void) | null = null;

  initialize(): void {
    if (this.unsubscribe) return;

    this.unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      this.isConnected = state.isConnected ?? true;
      logger.info(`[NetworkState] Connected: ${this.isConnected}`);
    });
  }

  getIsConnected(): boolean {
    return this.isConnected;
  }

  dispose(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }
}

export const networkStateService = new NetworkStateServiceImpl();

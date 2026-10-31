import NetInfo from '@react-native-community/netinfo';
import { AppState, type AppStateStatus } from 'react-native';

import { queryClient, queryKeys } from '@/lib/queryClient';
import { errorReportingService } from '@/services/ErrorReportingService';
import {
  presentForegroundNotification,
  type ForegroundNotificationPayload,
} from '@/services/ForegroundNotificationService';
import { JEDA_RINGKAS_MS, PenjagaBurstNotifikasi, susunToastRingkasan } from '@/utils/burstNotifikasi';
import { presentInfoMessage } from '@/utils/errorPresenter';
import { logger } from '@/utils/logger';
import { isStatusOnline } from '@/utils/statusJaringan';

/** Segarkan daftar dan lencana yang bisa berubah karena push. */
function segarkanDataSetelahPush(): void {
  queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list() });
  queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unread() });
  // Push investor (modal/bagi hasil/uang dikirim) → segarkan angka di layar.
  queryClient.invalidateQueries({ queryKey: queryKeys.investor.all });
  // Push surat pengesahan (ditugaskan / sah / dibatalkan) → segarkan menu & daftar.
  queryClient.invalidateQueries({ queryKey: queryKeys.pengesahan.all });
}

function laporkanGagalTampil(error: unknown): void {
  logger.error('Failed to render foreground notification:', error);
  errorReportingService.captureException(
    error instanceof Error ? error : new Error('Failed to render foreground notification'),
    { source: 'root.foregroundNotification' },
  );
}

/** Panggil `mulai` setiap aplikasi kembali ke depan atau kembali online; mengembalikan pelepas. */
function pasangPemicuMasaTenang(mulai: () => void): () => void {
  let keadaanSebelumnya: AppStateStatus = AppState.currentState;
  const langgananAppState = AppState.addEventListener('change', (keadaan) => {
    if (keadaan === 'active' && keadaanSebelumnya !== 'active') mulai();
    keadaanSebelumnya = keadaan;
  });

  let isOnlineSebelumnya: boolean | null = null;
  const berhentiDengarJaringan = NetInfo.addEventListener((status) => {
    const isOnline = isStatusOnline(status);
    if (isOnline && isOnlineSebelumnya === false) mulai();
    isOnlineSebelumnya = isOnline;
  });

  return () => {
    langgananAppState.remove();
    berhentiDengarJaringan();
  };
}

/**
 * Penerima push FCM selama aplikasi terbuka. Push ditampilkan dengan bunyi
 * paling banyak sekali per burst; begitu push berhenti datang, data disegarkan
 * sekali dan satu toast mewakili seluruh burst.
 */
export class PenerimaPushForeground {
  private readonly penjaga = new PenjagaBurstNotifikasi();

  /** Push burst berjalan yang boleh tampil di toast; toast menyebut jumlah berjalannya. */
  private pushBurstIni: ForegroundNotificationPayload[] = [];

  /** Ada push untuk toast sejak toast terakhir; push data saja hanya menyegarkan. */
  private isToastTertunda = false;

  private timerRingkasan: ReturnType<typeof setTimeout> | null = null;

  private readonly lepasPemicu: () => void;

  constructor() {
    // Dibuat saat aplikasi mulai: pembukaan aplikasi adalah masa tenang pertama.
    this.mulaiMasaTenang();
    this.lepasPemicu = pasangPemicuMasaTenang(() => this.mulaiMasaTenang());
  }

  /** Tangani satu push yang tiba saat aplikasi terbuka. */
  terima = async (push: ForegroundNotificationPayload): Promise<void> => {
    logger.info('Foreground notification:', push.title);
    this.jadwalkanRingkasan();
    if (!push.title && !push.body) return;

    const { isBersuara, isBolehToast, isAwalBurst } = this.penjaga.putuskan(Date.now());
    if (isAwalBurst) this.pushBurstIni = [];
    if (isBolehToast) {
      this.pushBurstIni.push(push);
      this.isToastTertunda = true;
    }
    try {
      await presentForegroundNotification(push, { isSenyap: !isBersuara });
    } catch (error) {
      laporkanGagalTampil(error);
    }
  };

  /** Lepas pendengar dan batalkan toast yang masih tertunda. */
  hentikan(): void {
    this.lepasPemicu();
    if (this.timerRingkasan) clearTimeout(this.timerRingkasan);
    this.timerRingkasan = null;
    this.pushBurstIni = [];
    this.isToastTertunda = false;
  }

  private mulaiMasaTenang(): void {
    this.penjaga.mulaiMasaTenang(Date.now());
  }

  private jadwalkanRingkasan(): void {
    if (this.timerRingkasan) clearTimeout(this.timerRingkasan);
    this.timerRingkasan = setTimeout(() => this.tampilkanRingkasan(), JEDA_RINGKAS_MS);
  }

  private tampilkanRingkasan(): void {
    this.timerRingkasan = null;
    segarkanDataSetelahPush();
    const isAdaToast = this.isToastTertunda;
    this.isToastTertunda = false;
    // Toast yang tertunda saat aplikasi ditinggal lalu dibuka lagi ikut diredam.
    if (!isAdaToast || this.penjaga.isMasaTenang(Date.now())) return;
    const { judul, pesan } = susunToastRingkasan(this.pushBurstIni);
    presentInfoMessage(pesan, judul);
  }
}

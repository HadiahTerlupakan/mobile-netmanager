import Toast from 'react-native-toast-message';
import {
  presentAppError,
  presentErrorMessage,
  presentSuccessMessage,
  registerErrorReporter,
  showToast,
} from '@/utils/errorPresenter';

const mockCaptureException = jest.fn();

describe('errorPresenter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    registerErrorReporter({
      captureException: mockCaptureException,
    });
  });

  it('presents reportable errors and captures exception context', async () => {
    const error = new Error('Database connection failed');
    presentAppError(error, { 
      source: 'Fetching inventory', 
      report: true 
    });

    expect(Toast.show).toHaveBeenCalledWith(expect.objectContaining({
      type: 'error',
    }));
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        source: 'Fetching inventory',
      })
    );
  });

  it('can skip reporting for user-facing handled errors', async () => {
    const error = new Error('Invalid input');
    presentAppError(error, { 
      report: false 
    });

    expect(Toast.show).toHaveBeenCalled();
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it('presents success messages consistently', () => {
    presentSuccessMessage('Password berhasil diubah');

    expect(Toast.show).toHaveBeenCalledWith(expect.objectContaining({
      type: 'success',
      text2: 'Password berhasil diubah',
    }));
  });

  describe('toast kembar', () => {
    // Saat aplikasi dibuka offline atau server mati, setiap permintaan yang
    // gagal memunculkan toast yang sama persis.
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('toast dengan isi sama dalam 4 detik hanya tampil sekali', () => {
      showToast('error', 'Masalah Server', 'Terjadi gangguan pada server.');
      jest.advanceTimersByTime(3999);
      showToast('error', 'Masalah Server', 'Terjadi gangguan pada server.');

      expect(Toast.show).toHaveBeenCalledTimes(1);
    });

    it('setelah 4 detik toast yang sama boleh tampil lagi', () => {
      showToast('error', 'Masalah Server', 'Terjadi gangguan pada server.');
      jest.advanceTimersByTime(4000);
      showToast('error', 'Masalah Server', 'Terjadi gangguan pada server.');

      expect(Toast.show).toHaveBeenCalledTimes(2);
    });

    it('toast yang berbeda tetap tampil semua', () => {
      showToast('error', 'Gagal Memuat Data', 'Network Error');
      showToast('error', 'Masalah Koneksi', 'Mohon periksa koneksi internet Anda.');
      presentErrorMessage('Data dibatalkan: Stok tidak cukup', 'Gagal Sync Barang Keluar');

      expect(Toast.show).toHaveBeenCalledTimes(3);
    });
  });
});

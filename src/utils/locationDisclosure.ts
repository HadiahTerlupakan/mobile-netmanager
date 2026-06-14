/**
 * Gerbang terpusat untuk Prominent Disclosure lokasi (Google Play User Data policy).
 *
 * Aturan Google: setiap permintaan izin lokasi runtime WAJIB "immediately
 * preceded by" disclosure in-app. Artinya: SETIAP KALI izin OS akan diminta,
 * disclosure harus tampil tepat sebelumnya — bukan sekali seumur install.
 *
 * Maka gating dilakukan berdasar STATUS IZIN OS AKTUAL, bukan flag storage:
 * - Jika izin sudah granted  -> tidak ada request OS, lanjut tanpa modal.
 * - Jika belum granted        -> tampilkan disclosure dulu, baru request OS.
 *
 * Semua call site izin lokasi HARUS lewat `requestForegroundLocationWithDisclosure()`
 * — jangan panggil `Location.requestForegroundPermissionsAsync()` langsung.
 */

import * as Location from 'expo-location';
import { logger } from '@/utils/logger';

type DisclosurePresenter = () => Promise<boolean>;

let presenter: DisclosurePresenter | null = null;
let inFlightDisclosure: Promise<boolean> | null = null;

/**
 * Didaftarkan oleh LocationDisclosureProvider saat mount.
 * Presenter menampilkan modal disclosure dan resolve true/false sesuai respon user.
 */
export function setDisclosurePresenter(next: DisclosurePresenter | null) {
  presenter = next;
}

/**
 * Tampilkan disclosure dan tunggu respon user.
 * Permintaan paralel digabung agar modal tidak dobel.
 */
async function presentDisclosure(): Promise<boolean> {
  if (!presenter) {
    logger.warn('[LocationDisclosure] Presenter belum terdaftar');
    return false;
  }
  if (!inFlightDisclosure) {
    inFlightDisclosure = presenter().finally(() => {
      inFlightDisclosure = null;
    });
  }
  return inFlightDisclosure;
}

/**
 * Drop-in pengganti `Location.requestForegroundPermissionsAsync()`.
 *
 * Menjamin disclosure tampil tepat sebelum izin OS diminta. Jika izin sudah
 * granted, tidak ada dialog OS sehingga disclosure tidak perlu ditampilkan.
 * Jika user menolak disclosure, izin OS TIDAK diminta -> status 'denied'.
 */
export async function requestForegroundLocationWithDisclosure(): Promise<{
  status: Location.PermissionStatus;
}> {
  // Sudah granted -> tidak ada request OS, langsung lanjut.
  const current = await Location.getForegroundPermissionsAsync();
  if (current.status === Location.PermissionStatus.GRANTED) {
    return { status: current.status };
  }

  // Belum granted & tidak bisa diminta lagi (user pilih "Jangan tampilkan lagi").
  // Tidak ada dialog OS yang akan muncul, jadi tidak butuh disclosure.
  if (!current.canAskAgain) {
    return { status: current.status };
  }

  // Akan ada dialog OS -> WAJIB disclosure dulu (Google Play policy).
  const accepted = await presentDisclosure();
  if (!accepted) {
    return { status: Location.PermissionStatus.DENIED };
  }

  const { status } = await Location.requestForegroundPermissionsAsync();
  return { status };
}

/**
 * Versi background: pastikan disclosure tampil sebelum izin background diminta.
 * Dipakai LocationTrackingService. Mengembalikan true bila boleh lanjut request.
 */
export async function ensureDisclosureBeforeBackground(): Promise<boolean> {
  const accepted = await presentDisclosure();
  if (!accepted) {
    logger.warn('[LocationDisclosure] User menolak disclosure (background)');
  }
  return accepted;
}

/**
 * Reset state internal — HANYA untuk keperluan test agar tidak bocor antar test.
 */
export function __resetDisclosureStateForTest() {
  presenter = null;
  inFlightDisclosure = null;
}

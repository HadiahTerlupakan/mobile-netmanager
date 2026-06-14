/**
 * Gerbang terpusat untuk Prominent Disclosure lokasi (Google Play User Data policy).
 *
 * Aturan Google: setiap permintaan izin lokasi runtime WAJIB didahului
 * disclosure in-app. Modul ini memastikan disclosure tampil SEBELUM
 * `Location.requestForegroundPermissionsAsync()` / background dipanggil,
 * di mana pun di aplikasi.
 *
 * Semua call site izin lokasi HARUS lewat `requestForegroundLocationWithDisclosure()`
 * — jangan panggil `Location.requestForegroundPermissionsAsync()` langsung.
 */

import * as Location from 'expo-location';
import { Storage } from '@/utils/storage';
import { logger } from '@/utils/logger';

const STORAGE_KEY_DISCLOSURE = '@location_disclosure_accepted_v1';

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
 * Pastikan user sudah menerima prominent disclosure.
 * Mengembalikan true jika sudah/baru menerima, false jika menolak.
 * Consent dipersist agar modal hanya muncul sekali per install.
 */
export async function ensureLocationDisclosure(): Promise<boolean> {
  try {
    const accepted = await Storage.getItem(STORAGE_KEY_DISCLOSURE);
    if (accepted === 'true') return true;

    if (!presenter) {
      logger.warn('[LocationDisclosure] Presenter belum terdaftar');
      return false;
    }

    // Gabungkan permintaan paralel agar modal tidak dobel
    if (!inFlightDisclosure) {
      inFlightDisclosure = presenter().finally(() => {
        inFlightDisclosure = null;
      });
    }

    const userAccepted = await inFlightDisclosure;
    if (userAccepted) {
      await Storage.setItem(STORAGE_KEY_DISCLOSURE, 'true');
    }
    return userAccepted;
  } catch (error) {
    logger.error('[LocationDisclosure] Gagal cek disclosure:', error);
    return false;
  }
}

/**
 * Drop-in pengganti `Location.requestForegroundPermissionsAsync()`.
 * Menjamin disclosure tampil lebih dulu. Jika user menolak disclosure,
 * izin sistem TIDAK diminta dan status dikembalikan sebagai 'denied'.
 */
export async function requestForegroundLocationWithDisclosure(): Promise<{
  status: Location.PermissionStatus;
}> {
  const disclosureAccepted = await ensureLocationDisclosure();
  if (!disclosureAccepted) {
    return { status: Location.PermissionStatus.DENIED };
  }

  const { status } = await Location.requestForegroundPermissionsAsync();
  return { status };
}

/**
 * True jika user sudah pernah menerima disclosure (untuk gating UI).
 */
export async function hasAcceptedLocationDisclosure(): Promise<boolean> {
  const accepted = await Storage.getItem(STORAGE_KEY_DISCLOSURE);
  return accepted === 'true';
}

export { STORAGE_KEY_DISCLOSURE };

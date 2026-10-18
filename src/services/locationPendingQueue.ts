import { Storage } from '@/utils/storage';
import { logger } from '@/utils/logger';
import type { LocationData } from './locationSample';

export const STORAGE_KEY_PENDING = '@pending_locations';

/** Batas antrean agar penyimpanan HP tidak penuh saat lama offline. */
const MAKS_ANTREAN = 100;

let antreanOperasi: Promise<unknown> = Promise.resolve();

/**
 * Jalankan baca-ubah-tulis antrean satu per satu. Task background dan layar
 * berbagi runtime JS; tanpa ini, penambahan dari task yang terjadi di sela
 * baca dan tulis milik sinkron akan tertimpa.
 */
function berurutan<T>(operasi: () => Promise<T>): Promise<T> {
    const hasil = antreanOperasi.then(operasi, operasi);
    antreanOperasi = hasil.catch(() => undefined);
    return hasil;
}

/** Isi antrean lokasi yang belum terkirim, tertua dulu. */
export async function bacaAntrean(): Promise<LocationData[]> {
    try {
        const isi = await Storage.getItem(STORAGE_KEY_PENDING);
        return isi ? JSON.parse(isi) : [];
    } catch (error) {
        logger.error('[LocationTracking] Failed to read pending locations:', error);
        return [];
    }
}

/** Tambahkan titik ke antrean; titik tertua dibuang bila melewati batas. */
export function tambahKeAntrean(titik: LocationData[]): Promise<void> {
    return berurutan(() => tambahLangsung(titik));
}

async function tambahLangsung(titik: LocationData[]): Promise<void> {
    try {
        const antrean = [...(await bacaAntrean()), ...titik].slice(-MAKS_ANTREAN);
        await Storage.setItem(STORAGE_KEY_PENDING, JSON.stringify(antrean));
    } catch (error) {
        logger.error('[LocationTracking] Failed to save pending location:', error);
    }
}

/**
 * Buang titik yang sudah terkirim. Antrean dibaca ulang lebih dulu: task
 * background bisa menambah titik selama request sinkron berjalan, dan
 * menghapus seluruh kunci akan ikut membuang titik baru itu.
 */
export function buangDariAntrean(terkirim: LocationData[]): Promise<void> {
    return berurutan(() => buangLangsung(terkirim));
}

async function buangLangsung(terkirim: LocationData[]): Promise<void> {
    const waktuTerkirim = new Set(terkirim.map((titik) => titik.recordedAt));
    const sisa = (await bacaAntrean()).filter((titik) => !waktuTerkirim.has(titik.recordedAt));
    if (sisa.length === 0) {
        await Storage.removeItem(STORAGE_KEY_PENDING);
        return;
    }
    await Storage.setItem(STORAGE_KEY_PENDING, JSON.stringify(sisa));
}

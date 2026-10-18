import * as Battery from 'expo-battery';
import type * as Location from 'expo-location';

/** Batas tunggu baca baterai; task background tidak boleh tertahan karenanya. */
const BATAS_BACA_BATERAI_MS = 2000;

/** ~1,8 km/jam, kecepatan jalan kaki. */
const KECEPATAN_BERGERAK_MPS = 0.5;

/** Satu titik lokasi seperti dikirim ke `/api/mobile/location`. */
export interface LocationData {
    latitude: number;
    longitude: number;
    accuracy: number | null;
    altitude: number | null;
    speed: number | null;
    heading: number | null;
    batteryLevel?: number;
    isMoving?: boolean;
    recordedAt: string;
}

/** Level baterai 0..1, atau undefined bila tidak terbaca tepat waktu. */
export async function bacaLevelBaterai(): Promise<number | undefined> {
    try {
        return await Promise.race([
            Battery.getBatteryLevelAsync(),
            new Promise<number>((_, reject) =>
                setTimeout(() => reject(new Error('Timeout')), BATAS_BACA_BATERAI_MS)),
        ]);
    } catch {
        return undefined;
    }
}

/** Apakah kecepatan dari OS menandakan karyawan sedang bergerak. */
export function isSedangBergerak(speed: number | null): boolean {
    return speed !== null && speed > KECEPATAN_BERGERAK_MPS;
}

/** Ubah titik dari OS menjadi data yang dikirim ke server. */
export function keDataLokasi(location: Location.LocationObject, batteryLevel?: number): LocationData {
    const { coords } = location;
    return {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        altitude: coords.altitude,
        speed: coords.speed,
        heading: coords.heading,
        batteryLevel,
        isMoving: isSedangBergerak(coords.speed),
        recordedAt: new Date(location.timestamp).toISOString(),
    };
}

/**
 * Pisahkan titik terbaru dari batch OS. Android mengirim batch tertahan dari
 * yang tertua; mengambil `locations[0]` membuat peta tertinggal sepanjang batch.
 */
export function pisahkanTitikTerbaru(locations: Location.LocationObject[]): {
    terbaru: Location.LocationObject | undefined;
    sebelumnya: Location.LocationObject[];
} {
    const urut = [...locations].sort((a, b) => a.timestamp - b.timestamp);
    return { terbaru: urut[urut.length - 1], sebelumnya: urut.slice(0, -1) };
}

import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import { TombolAksi } from '@/components/molecules/TombolAksi';
import type { HakAksesRencana } from '@/utils/presurvei/timRencana';

/** Alasan Ubah/Batalkan dinonaktifkan saat offline. */
export const TEKS_ATUR_RENCANA_BUTUH_ONLINE = 'Ubah dan Batalkan rencana butuh koneksi internet.';

/** Pengganti tombol laporan selama laporannya masih di antrean offline. */
export const TEKS_LAPORAN_MENUNGGU_KIRIM = 'Laporan kunjungan tersimpan dan menunggu dikirim.';

interface AksiRencanaProps {
  /** Hasil `hakAksesRencana`: keduanya false untuk rencana yang sudah ditutup. */
  hak: HakAksesRencana;
  isOnline: boolean;
  isMenungguKirim: boolean;
  onLaporkan: () => void;
  onUbah: () => void;
  onBatalkan: () => void;
}

/**
 * Aksi rincian rencana. "Laporkan Kunjungan" tetap bisa offline (antrean
 * catat kegiatan) dan hanya untuk sales pemilik rencana; Ubah/Batalkan
 * butuh online dan mengikuti hak (sales: MANDIRI; pemberi tugas: semua
 * rencana terbuka dalam lingkupnya).
 */
export function AksiRencana(props: AksiRencanaProps) {
  const { hak, isOnline, isMenungguKirim, onLaporkan, onUbah, onBatalkan } = props;
  if (!hak.isBolehLaporkan && !hak.isBolehAtur) return null;
  if (isMenungguKirim) {
    return <Text style={tw`mx-4 mb-4 text-sm text-amber-700`}>{TEKS_LAPORAN_MENUNGGU_KIRIM}</Text>;
  }
  return (
    <View style={tw`px-4 mb-4`}>
      {hak.isBolehLaporkan ? <TombolAksi label="Laporkan Kunjungan" onPress={onLaporkan} isAktif /> : null}
      {hak.isBolehAtur ? (
        <View>
          <TombolAksi label="Ubah" varian="kedua" onPress={onUbah} isAktif={isOnline} />
          <TombolAksi label="Batalkan" varian="kedua" onPress={onBatalkan} isAktif={isOnline} />
          {!isOnline ? <Text style={tw`text-xs text-amber-700`}>{TEKS_ATUR_RENCANA_BUTUH_ONLINE}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

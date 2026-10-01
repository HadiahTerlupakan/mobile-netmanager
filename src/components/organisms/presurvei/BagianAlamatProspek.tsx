import { MapPin } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity } from 'react-native';

import { useTemaPersona } from '@/theme';
import { KartuFormulir } from '@/components/atoms/KartuFormulir';
import { IsianTeks } from '@/components/molecules/IsianTeks';
import { JudulIsian } from '@/components/molecules/JudulIsian';
import { TEKS_LOKASI_PROSPEK, type StatusLokasiProspek } from '@/hooks/presurvei/useLokasiProspek';
import { PANJANG_ALAMAT_PROSPEK_MAKS } from '@/utils/presurvei/isianProspek';

const UKURAN_IKON = 20;
const BARIS_ISIAN_ALAMAT = 3;

/** Warna teks status lokasi per keadaan. */
const WARNA_STATUS_LOKASI: Record<StatusLokasiProspek, string> = {
  belum: 'text-gray-500',
  mencari: 'text-gray-600',
  tersimpan: 'text-green-700',
  gagal: 'text-amber-700',
};

interface BagianAlamatProspekProps {
  /** Judul isian, mis. "Alamat pemasangan" atau "Alamat rumah/tempat". */
  judul: string;
  alamat: string;
  kesalahan?: string;
  statusLokasi: StatusLokasiProspek;
  onUbah: (alamat: string) => void;
  onPakaiLokasi: () => void;
}

/**
 * Alamat prospek (wajib) dengan tombol besar "Pakai lokasi saya sekarang".
 * Lokasi hanya mengisi alamat yang masih kosong; bila tidak ditemukan, sales
 * cukup menulis alamatnya.
 */
export function BagianAlamatProspek({ judul, alamat, kesalahan, statusLokasi, onUbah, onPakaiLokasi }: BagianAlamatProspekProps) {
  const { tw, warna } = useTemaPersona();
  const isMencari = statusLokasi === 'mencari';
  const teksStatus = TEKS_LOKASI_PROSPEK[statusLokasi];
  return (
    <KartuFormulir>
      <JudulIsian judul={judul} isWajib petunjuk="Tulis nama jalan, nomor rumah, RT/RW, atau patokan." />
      <IsianTeks
        label={judul}
        isLabelTersembunyi
        nilai={alamat}
        kesalahan={kesalahan}
        multiline
        jumlahBaris={BARIS_ISIAN_ALAMAT}
        maxLength={PANJANG_ALAMAT_PROSPEK_MAKS}
        placeholder="Contoh: Jl. Melati No. 5, RT 02, dekat masjid"
        onUbah={onUbah}
      />
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Pakai lokasi saya sekarang"
        accessibilityState={{ disabled: isMencari, busy: isMencari }}
        disabled={isMencari}
        onPress={onPakaiLokasi}
        style={tw`flex-row items-center justify-center min-h-12 border-2 border-utama-pucat bg-utama-sangat-muda rounded-xl py-3`}
      >
        {isMencari ? <ActivityIndicator color={warna.utamaGelap} /> : <MapPin size={UKURAN_IKON} color={warna.utamaGelap} />}
        <Text style={tw`ml-2 text-base font-semibold text-utama-gelap`}>Pakai lokasi saya sekarang</Text>
      </TouchableOpacity>
      {teksStatus !== '' ? (
        <Text accessibilityLiveRegion="polite" style={tw`mt-2 text-sm font-semibold ${WARNA_STATUS_LOKASI[statusLokasi]}`}>
          {teksStatus}
        </Text>
      ) : null}
    </KartuFormulir>
  );
}

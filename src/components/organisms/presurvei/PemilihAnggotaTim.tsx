import { ChevronDown, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import type { SalesRencana } from '@/types/presurvei';
import type { ProgresHarian } from '@/utils/presurvei/timRencana';
import { PilihAnggotaTimModal } from './PilihAnggotaTimModal';

const UKURAN_IKON = 14;
const WARNA_IKON = '#4b5563';
/** Perluasan area sentuh tombol hapus pilihan (ikon kecil). */
const PERLUASAN_SENTUH = { top: 10, bottom: 10, left: 10, right: 10 };
/** Nama cadangan bila anggota terpilih belum ada di daftar (masih memuat). */
const NAMA_ANGGOTA_CADANGAN = 'Anggota terpilih';

interface PemilihAnggotaTimProps {
  /** Kosong selama memuat/gagal: modal hanya menawarkan "Semua anggota". */
  daftar: readonly SalesRencana[];
  terpilih: string | null;
  penggunaId: string | null;
  progres?: ReadonlyMap<string, ProgresHarian>;
  onPilih: (salesId: string | null) => void;
}

/**
 * Filter anggota tampilan Tim: tombol ringkas "Anggota: Semua ▾" yang membuka
 * pemilih bercari, dan ✕ untuk kembali ke semua anggota.
 */
export function PemilihAnggotaTim({ daftar, terpilih, penggunaId, progres, onPilih }: PemilihAnggotaTimProps) {
  const [isTerbuka, setTerbuka] = useState(false);
  const nama = terpilih === null
    ? 'Semua'
    : daftar.find((sales) => sales.id === terpilih)?.nama ?? NAMA_ANGGOTA_CADANGAN;
  const label = `Anggota: ${nama}`;

  return (
    <View style={tw`flex-row items-center px-4 mb-3`}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setTerbuka(true)}
        style={tw`flex-row items-center flex-shrink bg-white border ${
          terpilih === null ? 'border-gray-200' : 'border-blue-500'
        } rounded-full pl-3 pr-2 py-2`}
      >
        <Text style={tw`text-sm text-gray-800 mr-1 flex-shrink`} numberOfLines={1}>{label}</Text>
        <ChevronDown size={UKURAN_IKON} color={WARNA_IKON} />
      </TouchableOpacity>
      {terpilih !== null ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Tampilkan semua anggota"
          hitSlop={PERLUASAN_SENTUH}
          onPress={() => onPilih(null)}
          style={tw`ml-2 w-8 h-8 rounded-full bg-gray-100 items-center justify-center`}
        >
          <X size={UKURAN_IKON} color={WARNA_IKON} />
        </TouchableOpacity>
      ) : null}
      {isTerbuka ? (
        <PilihAnggotaTimModal
          judul="Pilih Anggota"
          daftar={daftar}
          terpilih={terpilih}
          penggunaId={penggunaId}
          isBolehSemua
          progres={progres}
          onPilih={onPilih}
          onTutup={() => setTerbuka(false)}
        />
      ) : null}
    </View>
  );
}

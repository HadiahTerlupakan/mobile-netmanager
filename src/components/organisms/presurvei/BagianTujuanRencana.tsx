import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import { KartuFormulir } from '@/components/atoms/KartuFormulir';
import { IsianTeks } from '@/components/molecules/IsianTeks';
import { PilihanChip } from '@/components/molecules/PilihanChip';
import { CONTOH_TUJUAN_RENCANA, TUJUAN_RENCANA_MAKS } from '@/constants/presurvei';

const OPSI_CONTOH = CONTOH_TUJUAN_RENCANA.map((contoh) => ({ nilai: contoh, label: contoh }));
const BARIS_ISIAN_TUJUAN = 3;

interface BagianTujuanRencanaProps {
  tujuan: string;
  kesalahan?: string;
  onUbah: (tujuan: string) => void;
}

/**
 * Isian tujuan kunjungan: contoh siap ketuk (mengisi kotak, tetap bisa
 * diubah) lalu kotak teks tiga baris dengan penghitung huruf.
 */
export function BagianTujuanRencana({ tujuan, kesalahan, onUbah }: BagianTujuanRencanaProps) {
  const contohTerpilih = OPSI_CONTOH.find((opsi) => opsi.nilai === tujuan.trim())?.nilai ?? null;

  return (
    <KartuFormulir>
      <Text style={tw`font-bold text-gray-900`}>
        Tujuan kunjungan <Text style={tw`text-red-600`}>(wajib diisi)</Text>
      </Text>
      <Text style={tw`text-xs text-gray-500 mb-2`}>
        Mau apa ke sana? Ketuk salah satu contoh, atau tulis sendiri di kotak.
      </Text>
      <PilihanChip opsi={OPSI_CONTOH} terpilih={contohTerpilih} onPilih={onUbah} />
      <View style={tw`h-3`} />
      <IsianTeks
        label="Tujuan kunjungan"
        isLabelTersembunyi
        nilai={tujuan}
        kesalahan={kesalahan}
        multiline
        jumlahBaris={BARIS_ISIAN_TUJUAN}
        isTampilPenghitung
        maxLength={TUJUAN_RENCANA_MAKS}
        placeholder="Contoh: tawarkan paket 20 Mbps ke Pak Budi"
        onUbah={onUbah}
      />
    </KartuFormulir>
  );
}

import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import { BilahKemajuan } from '@/components/molecules/BilahKemajuan';
import { KartuHeroGradien } from '@/components/molecules/KartuHeroGradien';
import { DESAIN_PREMIUM, GAYA_ANGKA_TABULAR, useTemaPersona } from '@/theme';
import { formatPersen, formatRupiah, hitungImbalHasil, hitungPersenModalKembali } from '@/utils/investor';

interface KartuPortofolioProps {
  /** Total modal investor di semua proyek. */
  modal: string;
  jumlahProyek: number;
  /** Bagi hasil milik investor dari bulan-bulan aktual (hitungan RAB). */
  bagiHasil: string;
  /** Modal yang sudah kembali dari bulan-bulan aktual (hitungan RAB). */
  modalKembali: string;
  uangDiterima: number;
  siapDibayar: number;
}

/**
 * Kartu utama Beranda investor: total modal, bagi hasil & imbal hasilnya,
 * kemajuan pengembalian modal, serta uang yang sudah diterima / siap dibayar.
 */
export function KartuPortofolio({
  modal,
  jumlahProyek,
  bagiHasil,
  modalKembali,
  uangDiterima,
  siapDibayar,
}: KartuPortofolioProps) {
  const { warna } = useTemaPersona();
  const teksLembut = { color: warna.utamaGaris };
  const persenKembali = hitungPersenModalKembali(modalKembali, modal);
  const imbalHasil = hitungImbalHasil(bagiHasil, modal);

  return (
    <KartuHeroGradien>
      <Text style={[tw`text-xs font-semibold uppercase tracking-wider`, teksLembut]}>Total modal investasi</Text>
      <Text style={[tw`text-3xl font-bold text-white mt-1`, GAYA_ANGKA_TABULAR]}>{formatRupiah(modal)}</Text>
      <Text style={[tw`text-sm mt-1`, teksLembut]}>Di {jumlahProyek} proyek</Text>

      <View style={tw`flex-row mt-5`}>
        <View style={tw`flex-1`}>
          <Text style={[tw`text-xs`, teksLembut]}>Total bagi hasil</Text>
          <Text style={[tw`text-xl font-bold mt-0.5`, GAYA_ANGKA_TABULAR, { color: DESAIN_PREMIUM.aksenEmas }]}>
            {formatRupiah(bagiHasil)}
          </Text>
        </View>
        <View style={tw`items-end`}>
          <Text style={[tw`text-xs`, teksLembut]}>Imbal hasil</Text>
          <Text style={[tw`text-xl font-bold text-white mt-0.5`, GAYA_ANGKA_TABULAR]}>{formatPersen(imbalHasil)}</Text>
        </View>
      </View>

      <View style={tw`mt-5`}>
        <View style={tw`flex-row justify-between mb-2`}>
          <Text style={[tw`text-xs`, teksLembut]}>Modal kembali</Text>
          <Text style={[tw`text-xs font-semibold text-white`, GAYA_ANGKA_TABULAR]}>
            {formatRupiah(modalKembali)} · {formatPersen(Math.round(persenKembali))}
          </Text>
        </View>
        <BilahKemajuan
          persen={persenKembali}
          warnaIsi={DESAIN_PREMIUM.aksenEmas}
          warnaLatar={DESAIN_PREMIUM.garisDiAtasGelap}
        />
      </View>

      <View style={[tw`flex-row mt-5 pt-4 border-t`, { borderColor: DESAIN_PREMIUM.garisDiAtasGelap }]}>
        <View style={tw`flex-1`}>
          <Text style={[tw`text-xs`, teksLembut]}>Sudah saya terima</Text>
          <Text style={[tw`text-base font-bold text-white mt-1`, GAYA_ANGKA_TABULAR]}>{formatRupiah(uangDiterima)}</Text>
        </View>
        <View style={tw`flex-1`}>
          <Text style={[tw`text-xs`, teksLembut]}>Siap dibayar ke saya</Text>
          <Text style={[tw`text-base font-bold text-white mt-1`, GAYA_ANGKA_TABULAR]}>{formatRupiah(siapDibayar)}</Text>
        </View>
      </View>
    </KartuHeroGradien>
  );
}

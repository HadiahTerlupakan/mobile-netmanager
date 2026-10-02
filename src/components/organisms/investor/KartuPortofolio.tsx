import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import { LatarGradien } from '@/components/atoms/LatarGradien';
import { DESAIN_INVESTOR } from '@/constants/investor';
import { formatPersen, formatRupiah, hitungImbalHasil, hitungPersenModalKembali } from '@/utils/investor';

import { BilahKemajuan } from './BilahKemajuan';

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

const GAYA_ANGKA = { fontVariant: ['tabular-nums' as const] };

function AngkaBawah({ label, nilai }: { label: string; nilai: string }) {
  return (
    <View style={tw`flex-1`}>
      <Text style={[tw`text-xs`, { color: DESAIN_INVESTOR.teksLembutDiAtasGelap }]}>{label}</Text>
      <Text style={[tw`text-base font-bold text-white mt-1`, GAYA_ANGKA]}>{nilai}</Text>
    </View>
  );
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
  const persenKembali = hitungPersenModalKembali(modalKembali, modal);
  const imbalHasil = hitungImbalHasil(bagiHasil, modal);

  return (
    <View style={tw`rounded-3xl overflow-hidden`}>
      <LatarGradien dari={DESAIN_INVESTOR.gradienAwal} ke={DESAIN_INVESTOR.gradienAkhir} />
      <View style={tw`p-5`}>
        <Text style={[tw`text-xs font-semibold uppercase tracking-wider`, { color: DESAIN_INVESTOR.teksLembutDiAtasGelap }]}>
          Total modal investasi
        </Text>
        <Text style={[tw`text-3xl font-bold text-white mt-1`, GAYA_ANGKA]}>{formatRupiah(modal)}</Text>
        <Text style={[tw`text-sm mt-1`, { color: DESAIN_INVESTOR.teksLembutDiAtasGelap }]}>
          Di {jumlahProyek} proyek
        </Text>

        <View style={tw`flex-row mt-5`}>
          <View style={tw`flex-1`}>
            <Text style={[tw`text-xs`, { color: DESAIN_INVESTOR.teksLembutDiAtasGelap }]}>Total bagi hasil</Text>
            <Text style={[tw`text-xl font-bold mt-0.5`, GAYA_ANGKA, { color: DESAIN_INVESTOR.aksenEmas }]}>
              {formatRupiah(bagiHasil)}
            </Text>
          </View>
          <View style={tw`items-end`}>
            <Text style={[tw`text-xs`, { color: DESAIN_INVESTOR.teksLembutDiAtasGelap }]}>Imbal hasil</Text>
            <Text style={[tw`text-xl font-bold text-white mt-0.5`, GAYA_ANGKA]}>{formatPersen(imbalHasil)}</Text>
          </View>
        </View>

        <View style={tw`mt-5`}>
          <View style={tw`flex-row justify-between mb-2`}>
            <Text style={[tw`text-xs`, { color: DESAIN_INVESTOR.teksLembutDiAtasGelap }]}>Modal kembali</Text>
            <Text style={[tw`text-xs font-semibold text-white`, GAYA_ANGKA]}>
              {formatRupiah(modalKembali)} · {formatPersen(Math.round(persenKembali))}
            </Text>
          </View>
          <BilahKemajuan
            persen={persenKembali}
            warnaIsi={DESAIN_INVESTOR.aksenEmas}
            warnaLatar={DESAIN_INVESTOR.garisDiAtasGelap}
          />
        </View>

        <View style={[tw`flex-row mt-5 pt-4 border-t`, { borderColor: DESAIN_INVESTOR.garisDiAtasGelap }]}>
          <AngkaBawah label="Sudah saya terima" nilai={formatRupiah(uangDiterima)} />
          <AngkaBawah label="Siap dibayar ke saya" nilai={formatRupiah(siapDibayar)} />
        </View>
      </View>
    </View>
  );
}

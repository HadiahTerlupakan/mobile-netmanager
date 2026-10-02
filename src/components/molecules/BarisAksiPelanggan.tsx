import { MapPin, Phone, type LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { TombolIkonBulat } from '@/components/molecules/TombolIkonBulat';
import { useTemaPersona } from '@/theme';
import { bukaAlamatDiPeta, hubungiKontak } from '@/utils/kontak';

const UKURAN_IKON_AKSI = 14;

/** Aksi utama kartu pelanggan, mis. "Ajukan WO", "Ingatkan bayar", "Lapor keluhan". */
export interface AksiUtamaPelanggan {
  label: string;
  ikon: LucideIcon;
  onTekan: () => void;
  isNonaktif?: boolean;
}

interface BarisAksiPelangganProps {
  namaPelanggan: string;
  aksi: AksiUtamaPelanggan;
  noTelp: string | null;
  /** Alamat / koordinat untuk tombol peta; null menyembunyikan tombol peta. */
  tujuanPeta: string | null;
}

/** Baris bawah kartu pelanggan: satu aksi utama melebar, lalu tombol telepon (WhatsApp) dan peta bila tersedia. */
export function BarisAksiPelanggan({ namaPelanggan, aksi, noTelp, tujuanPeta }: BarisAksiPelangganProps) {
  const { tw, warna } = useTemaPersona();
  const IkonAksi = aksi.ikon;
  return (
    <View style={tw`flex-row items-center mt-2.5`}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`${aksi.label} untuk ${namaPelanggan}`}
        accessibilityState={{ disabled: Boolean(aksi.isNonaktif) }}
        onPress={aksi.onTekan}
        disabled={aksi.isNonaktif}
        style={tw`flex-1 flex-row items-center justify-center bg-utama-sangat-muda py-2 rounded-full ${aksi.isNonaktif ? 'opacity-50' : ''}`}
      >
        <IkonAksi size={UKURAN_IKON_AKSI} color={warna.utamaKuat} />
        <Text style={tw`font-semibold text-utama-kuat text-xs ml-1.5`}>{aksi.label}</Text>
      </TouchableOpacity>
      {noTelp ? <TombolIkonBulat ikon={Phone} label={`Hubungi ${noTelp}`} onTekan={() => hubungiKontak(noTelp)} /> : null}
      {tujuanPeta ? (
        <TombolIkonBulat ikon={MapPin} label={`Buka peta ${namaPelanggan}`} onTekan={() => bukaAlamatDiPeta(tujuanPeta)} />
      ) : null}
    </View>
  );
}

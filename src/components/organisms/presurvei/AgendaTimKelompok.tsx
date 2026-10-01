import { ChevronRight, Plus } from 'lucide-react-native';
import React, { useState } from 'react';
import { SectionList, Text, TouchableOpacity, View, type RefreshControlProps } from 'react-native';

import { useTemaPersona } from '@/theme';
import type { Rencana, SalesRencana } from '@/types/presurvei';
import {
  anggotaTanpaRencana,
  hitungTerlewatPerAnggota,
  kelompokkanAgendaTim,
  type BagianAgendaTim,
  type TerlewatAnggota,
} from '@/utils/presurvei/timRencana';
import { AvatarAnggota } from './AvatarAnggota';
import { KartuRencana } from './KartuRencana';

/** Jumlah anggota "Belum ada rencana" yang tampil sebelum "Lihat semua". */
const BATAS_DAFTAR_RINGKAS = 5;
/**
 * Butir terlewat tertutup secara bawaan: pil per anggota sudah memberi
 * gambaran, dan kartu penuh di atas agenda mendorong agenda hari ini jauh ke
 * bawah pada tim besar.
 */
const BATAS_TERLEWAT_TERTUTUP = 0;
const UKURAN_IKON_CHEVRON = 18;
const UKURAN_IKON_TUGASKAN = 12;
const WARNA_ABU = '#9ca3af';

/** Daftar yang dipotong ke `batas` butir sampai pengguna meminta semuanya. */
function useDaftarRingkas<T>(daftar: readonly T[], batas: number = BATAS_DAFTAR_RINGKAS) {
  const [isTerbuka, setTerbuka] = useState(false);
  return {
    tampil: isTerbuka ? daftar : daftar.slice(0, batas),
    isPerluTombol: daftar.length > batas,
    isTerbuka,
    alihkan: () => setTerbuka((lama) => !lama),
  };
}

interface TombolLihatSemuaProps {
  jumlah: number;
  isTerbuka: boolean;
  onPress: () => void;
  /** Teks saat tertutup; bawaan "Lihat semua (n)". */
  labelTertutup?: string;
}

/** Tombol teks "Lihat semua (n)" / "Tampilkan lebih sedikit". */
function TombolLihatSemua({ jumlah, isTerbuka, onPress, labelTertutup }: TombolLihatSemuaProps) {
  const { tw } = useTemaPersona();
  return (
    <TouchableOpacity accessibilityRole="button" onPress={onPress} style={tw`py-2`}>
      <Text style={tw`text-sm font-semibold text-utama-kuat`}>
        {isTerbuka ? 'Tampilkan lebih sedikit' : (labelTertutup ?? `Lihat semua (${jumlah})`)}
      </Text>
    </TouchableOpacity>
  );
}

interface BagianTerlewatTimProps {
  rencana: readonly Rencana[];
  perAnggota: readonly TerlewatAnggota[];
  jumlah: number;
  menungguKirim: Set<string>;
  onBuka: (id: string) => void;
  onFokus: (salesId: string) => void;
}

/** Terlewat seluruh tim secara ringkas: jumlah per anggota (ketuk = fokus), lalu butir terlewat yang bisa dibuka semua. */
function BagianTerlewatTim({ rencana, perAnggota, jumlah, menungguKirim, onBuka, onFokus }: BagianTerlewatTimProps) {
  const { tw } = useTemaPersona();
  const ringkas = useDaftarRingkas(rencana, BATAS_TERLEWAT_TERTUTUP);
  if (jumlah === 0) return null;
  return (
    <View style={tw`mb-3`}>
      <View style={tw`flex-row items-center mb-2`}>
        <View style={tw`w-2 h-2 rounded-full bg-rose-500 mr-2`} />
        <Text style={tw`text-sm font-bold text-rose-700`}>{`Terlewat (${jumlah})`}</Text>
      </View>
      <View style={tw`flex-row flex-wrap -m-1 mb-2`}>
        {perAnggota.map((item) => (
          <TouchableOpacity
            key={item.salesId}
            accessibilityRole="button"
            accessibilityLabel={`Terlewat ${item.namaSales}: ${item.jumlah}`}
            onPress={() => onFokus(item.salesId)}
            style={tw`m-1 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-100`}
          >
            <Text style={tw`text-xs font-semibold text-rose-700`}>{`${item.namaSales} · ${item.jumlah}`}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {ringkas.tampil.map((item) => (
        <KartuRencana
          key={item.id}
          rencana={item}
          isMenungguKirim={menungguKirim.has(item.id)}
          isTampilTanggal
          isTampilSales
          onBuka={onBuka}
        />
      ))}
      {ringkas.isPerluTombol ? (
        <TombolLihatSemua
          jumlah={rencana.length}
          isTerbuka={ringkas.isTerbuka}
          onPress={ringkas.alihkan}
          labelTertutup={`Lihat ${rencana.length} rencana terlewat`}
        />
      ) : null}
      <Text style={tw`text-xs font-bold uppercase tracking-wider text-gray-400 mt-3`}>Rencana di tanggal ini</Text>
    </View>
  );
}

/** Kepala bagian satu anggota: avatar, nama, x/y selesai, lencana terlewat; ketuk = fokus ke anggota itu. */
function KepalaBagianAnggota({ bagian, onFokus }: { bagian: BagianAgendaTim; onFokus: (salesId: string) => void }) {
  const { tw } = useTemaPersona();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Agenda ${bagian.namaSales}`}
      onPress={() => onFokus(bagian.salesId)}
      style={tw`flex-row items-center py-2 mt-2 mb-1`}
    >
      <AvatarAnggota nama={bagian.namaSales} />
      <View style={tw`flex-1 mr-2`}>
        <Text style={tw`text-sm font-bold text-gray-900`} numberOfLines={1}>{bagian.namaSales}</Text>
        <Text style={tw`text-xs text-gray-500`}>{`${bagian.selesai}/${bagian.total} selesai`}</Text>
      </View>
      {bagian.terlewat > 0 ? (
        <View style={tw`bg-rose-50 rounded-full px-2.5 py-1 mr-2`}>
          <Text style={tw`text-[11px] font-semibold text-rose-600`}>{`${bagian.terlewat} terlewat`}</Text>
        </View>
      ) : null}
      <ChevronRight size={UKURAN_IKON_CHEVRON} color={WARNA_ABU} />
    </TouchableOpacity>
  );
}

/** Anggota tanpa rencana di hari itu, masing-masing dengan aksi Tugaskan. */
function BagianBelumAdaRencana({ anggota, onTugaskan }: { anggota: readonly SalesRencana[]; onTugaskan: (salesId: string) => void }) {
  const { tw, warna } = useTemaPersona();
  const ringkas = useDaftarRingkas(anggota);
  if (anggota.length === 0) return null;
  return (
    <View style={tw`mt-4 bg-white rounded-2xl border border-gray-100 px-3 py-2`}>
      <Text style={tw`text-xs font-bold uppercase tracking-wider text-gray-400 my-1`}>
        {`Belum ada rencana (${anggota.length})`}
      </Text>
      {ringkas.tampil.map((sales) => (
        <View key={sales.id} style={tw`flex-row items-center py-2`}>
          <AvatarAnggota nama={sales.nama} ukuran="kecil" />
          <Text style={tw`flex-1 text-sm text-gray-800 mr-2`} numberOfLines={1}>{sales.nama}</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Tugaskan ${sales.nama}`}
            onPress={() => onTugaskan(sales.id)}
            style={tw`flex-row items-center bg-utama-sangat-muda rounded-full px-3 py-1.5`}
          >
            <Plus size={UKURAN_IKON_TUGASKAN} color={warna.utama} />
            <Text style={tw`text-xs font-semibold text-utama-kuat ml-1`}>Tugaskan</Text>
          </TouchableOpacity>
        </View>
      ))}
      {ringkas.isPerluTombol ? (
        <TombolLihatSemua jumlah={anggota.length} isTerbuka={ringkas.isTerbuka} onPress={ringkas.alihkan} />
      ) : null}
    </View>
  );
}

interface AgendaTimKelompokProps {
  harian: readonly Rencana[];
  terlewat: readonly Rencana[];
  /** Jumlah terlewat sebenarnya (`meta.total`), bisa melebihi yang dimuat. */
  jumlahTerlewat: number;
  daftarSales: readonly SalesRencana[];
  menungguKirim: Set<string>;
  onBuka: (id: string) => void;
  onFokus: (salesId: string) => void;
  onTugaskan: (salesId: string) => void;
  refreshControl: React.ReactElement<RefreshControlProps>;
  kosong: React.ReactElement | null;
}

/**
 * Agenda tim "Semua anggota" untuk tim besar: rencana dikelompokkan per
 * anggota (yang punya terlewat dan rencana terbuka terbanyak di atas), blok
 * terlewat ringkas di atas, dan anggota tanpa rencana di bawah.
 */
export function AgendaTimKelompok(props: AgendaTimKelompokProps) {
  const { tw } = useTemaPersona();
  const { harian, terlewat, jumlahTerlewat, daftarSales, menungguKirim, onBuka, onFokus, onTugaskan } = props;
  const terlewatPerAnggota = hitungTerlewatPerAnggota(terlewat);
  const bagian = kelompokkanAgendaTim(harian, terlewatPerAnggota);

  return (
    <SectionList
      sections={bagian}
      keyExtractor={(item) => item.id}
      stickySectionHeadersEnabled={false}
      renderSectionHeader={({ section }) => <KepalaBagianAnggota bagian={section} onFokus={onFokus} />}
      renderItem={({ item }) => (
        <KartuRencana rencana={item} isMenungguKirim={menungguKirim.has(item.id)} onBuka={onBuka} />
      )}
      ListHeaderComponent={
        <BagianTerlewatTim
          rencana={terlewat}
          perAnggota={terlewatPerAnggota}
          jumlah={jumlahTerlewat}
          menungguKirim={menungguKirim}
          onBuka={onBuka}
          onFokus={onFokus}
        />
      }
      ListFooterComponent={
        <BagianBelumAdaRencana anggota={anggotaTanpaRencana(daftarSales, harian)} onTugaskan={onTugaskan} />
      }
      ListEmptyComponent={props.kosong}
      contentContainerStyle={tw`px-4 pb-24`}
      refreshControl={props.refreshControl}
    />
  );
}

import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';

import { useTemaPersona } from '@/theme';
import { NavigasiTanggal } from '@/components/molecules/NavigasiTanggal';
import { SegmenPilihan } from '@/components/molecules/SegmenPilihan';
import { ruteBuatRencana, ruteRincianRencana, ruteTugaskanRencana } from '@/constants/rutePresurvei';
import { useTampilanRencana, type FokusTimRencana } from '@/hooks/presurvei/useTampilanRencana';
import { useKegiatanMenungguKirim } from '@/hooks/queries/usePresurveiKegiatan';
import { useDaftarRencana, useRekapRencana, useSalesTersediaRencana } from '@/hooks/queries/usePresurveiRencana';
import type { Rencana } from '@/types/presurvei';
import {
  FILTER_RENCANA_TERLEWAT,
  filterRencanaHarian,
  idRencanaMenungguKirim,
  keTanggalKalender,
} from '@/utils/presurvei/rencana';
import { geserHari } from '@/utils/presurvei/rentangHari';
import {
  filterTampilanRencana,
  petaProgresRekap,
  ringkasanAgenda,
  type TampilanRencana,
} from '@/utils/presurvei/timRencana';
import { AgendaTimKelompok } from './AgendaTimKelompok';
import { KartuRencana } from './KartuRencana';
import { PemilihAnggotaTim } from './PemilihAnggotaTim';

const UKURAN_IKON_TAMBAH = 16;
const WARNA_IKON_TAMBAH = '#ffffff';

const OPSI_TAMPILAN: { nilai: TampilanRencana; label: string }[] = [
  { nilai: 'saya', label: 'Saya' },
  { nilai: 'tim', label: 'Tim' },
];

interface BagianTerlewatProps {
  rencana: Rencana[];
  jumlah: number;
  menungguKirim: Set<string>;
  onBuka: (id: string) => void;
}

/** Rencana yang tanggalnya lewat tapi belum dilaporkan, apa pun tanggal yang sedang dilihat. */
function BagianTerlewat({ rencana, jumlah, menungguKirim, onBuka }: BagianTerlewatProps) {
  const { tw } = useTemaPersona();
  if (jumlah === 0) return null;
  return (
    <View style={tw`mb-3`}>
      <View style={tw`flex-row items-center mb-2`}>
        <View style={tw`w-2 h-2 rounded-full bg-rose-500 mr-2`} />
        <Text style={tw`text-sm font-bold text-rose-700`}>{`Terlewat (${jumlah})`}</Text>
      </View>
      {rencana.map((item) => (
        <KartuRencana
          key={item.id}
          rencana={item}
          isMenungguKirim={menungguKirim.has(item.id)}
          isTampilTanggal
          onBuka={onBuka}
        />
      ))}
      <Text style={tw`text-xs font-bold uppercase tracking-wider text-gray-400 mt-3`}>Rencana di tanggal ini</Text>
    </View>
  );
}

interface TabRencanaProps {
  /** Permintaan membuka tampilan Tim (dari Beranda); hanya berlaku bagi pemberi tugas. */
  fokusTim?: FokusTimRencana | null;
}

/**
 * Sub-tab Rencana: agenda kunjungan per hari (boleh ke depan), bagian
 * terlewat, dan Buat Rencana. Pemberi tugas (kepala sales/admin) mendapat
 * segmen Saya | Tim: Tim "Semua" mengelompokkan agenda per anggota (lihat
 * `AgendaTimKelompok`), atau dipusatkan ke satu anggota lewat pemilih bercari,
 * dengan tombol Tugaskan. Sales biasa tidak melihat perbedaan apa pun.
 */
export function TabRencana({ fokusTim = null }: TabRencanaProps) {
  const { tw } = useTemaPersona();
  const router = useRouter();
  const [tanggal, setTanggal] = useState(() => new Date());
  const { lingkup, tampilan, ubahTampilan, salesIdTim, ubahSalesIdTim } = useTampilanRencana(fokusTim);
  const isTim = tampilan === 'tim';
  // Tim "Semua" dikelompokkan per anggota; dipusatkan ke satu orang tetap daftar biasa.
  const isKelompok = isTim && salesIdTim === null;
  const tanggalAgenda = keTanggalKalender(tanggal);
  const harian = useDaftarRencana(filterTampilanRencana(filterRencanaHarian(tanggal), tampilan, lingkup, salesIdTim));
  const terlewat = useDaftarRencana(filterTampilanRencana(FILTER_RENCANA_TERLEWAT, tampilan, lingkup, salesIdTim));
  const salesTim = useSalesTersediaRencana(isTim);
  const rekapHarian = useRekapRencana(filterRencanaHarian(tanggal), isTim);
  const progresAnggota = rekapHarian.data ? petaProgresRekap(rekapHarian.data.baris) : undefined;
  const antrean = useKegiatanMenungguKirim();
  const menungguKirim = idRencanaMenungguKirim(antrean.data ?? []);
  const bukaRincian = (id: string) => router.push(ruteRincianRencana(id));
  const tugaskan = (salesId: string | null) => router.push(ruteTugaskanRencana(salesId, tanggalAgenda));
  const segarkan = () => {
    void harian.refetch();
    void terlewat.refetch();
    void antrean.refetch();
    // refetch() mengabaikan `enabled`: rekap tim hanya disegarkan di tampilan Tim.
    if (isTim) void rekapHarian.refetch();
  };
  const refreshControl = <RefreshControl refreshing={harian.isRefetching} onRefresh={segarkan} />;
  const kosong = harian.isPending ? (
    <ActivityIndicator />
  ) : harian.isError ? null : (
    <Text style={tw`text-center text-gray-500 mt-8`}>
      {isTim ? 'Belum ada rencana tim di tanggal ini.' : 'Belum ada rencana di tanggal ini.'}
    </Text>
  );

  return (
    <View style={tw`flex-1`}>
      {lingkup.isPemberiTugas ? (
        <View style={tw`px-4 mb-3`}>
          <SegmenPilihan opsi={OPSI_TAMPILAN} terpilih={tampilan} onPilih={ubahTampilan} />
        </View>
      ) : null}
      {isTim ? (
        <PemilihAnggotaTim
          daftar={salesTim.data ?? []}
          terpilih={salesIdTim}
          penggunaId={lingkup.penggunaId}
          progres={progresAnggota}
          onPilih={ubahSalesIdTim}
        />
      ) : null}
      <NavigasiTanggal
        tanggal={tanggal}
        isBolehMasaDepan
        onGeser={(jumlah) => setTanggal((lama) => geserHari(lama, jumlah))}
      />
      <View style={tw`flex-row items-center justify-between px-4 mb-3`}>
        <Text style={tw`text-xs text-gray-500 flex-1 mr-2`}>
          {ringkasanAgenda(harian.data?.data ?? []) ?? 'Belum ada rencana'}
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={isTim ? 'Tugaskan rencana' : 'Buat Rencana'}
          onPress={() => (isTim ? tugaskan(salesIdTim) : router.push(ruteBuatRencana(tanggalAgenda)))}
          style={tw`flex-row items-center bg-utama-kuat rounded-full pl-3 pr-4 py-2`}
        >
          <Plus size={UKURAN_IKON_TAMBAH} color={WARNA_IKON_TAMBAH} />
          <Text style={tw`text-white font-bold text-sm ml-1`}>{isTim ? 'Tugaskan' : 'Buat Rencana'}</Text>
        </TouchableOpacity>
      </View>
      {harian.isError ? (
        <View style={tw`mx-4 mb-2 bg-red-50 border border-red-200 rounded-xl p-3`}>
          <Text style={tw`text-red-700 text-sm`}>Rencana gagal dimuat.</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Coba lagi" onPress={segarkan}>
            <Text style={tw`text-red-700 font-semibold text-sm mt-1`}>Coba lagi</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {isKelompok ? (
        <AgendaTimKelompok
          harian={harian.data?.data ?? []}
          terlewat={terlewat.data?.data ?? []}
          jumlahTerlewat={terlewat.data?.meta.total ?? 0}
          // Sebelum agenda termuat semua anggota akan tampak "belum ada rencana".
          daftarSales={harian.data ? salesTim.data ?? [] : []}
          menungguKirim={menungguKirim}
          onBuka={bukaRincian}
          onFokus={ubahSalesIdTim}
          onTugaskan={tugaskan}
          refreshControl={refreshControl}
          kosong={kosong}
        />
      ) : (
        <FlatList
          data={harian.data?.data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <KartuRencana rencana={item} isMenungguKirim={menungguKirim.has(item.id)} onBuka={bukaRincian} />
          )}
          ListHeaderComponent={
            <BagianTerlewat
              rencana={terlewat.data?.data ?? []}
              jumlah={terlewat.data?.meta.total ?? 0}
              menungguKirim={menungguKirim}
              onBuka={bukaRincian}
            />
          }
          contentContainerStyle={tw`px-4 pb-24`}
          refreshControl={refreshControl}
          ListEmptyComponent={kosong}
        />
      )}
    </View>
  );
}

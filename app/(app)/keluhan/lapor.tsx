import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { UserSearch } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/atoms/EmptyState';
import { KartuFormulir } from '@/components/atoms/KartuFormulir';
import { IsianTeks } from '@/components/molecules/IsianTeks';
import { JudulIsian } from '@/components/molecules/JudulIsian';
import { KepalaLayar } from '@/components/molecules/KepalaLayar';
import { PilihanChip } from '@/components/molecules/PilihanChip';
import { SegmenPilihan } from '@/components/molecules/SegmenPilihan';
import { PILIHAN_KATEGORI_KELUHAN, PILIHAN_PRIORITAS_KELUHAN } from '@/constants/keluhan';
import { useLaporKeluhan } from '@/hooks/queries/useKeluhan';
import { useIsOnline } from '@/hooks/useIsOnline';
import { useTemaPersona } from '@/theme';
import {
  DESKRIPSI_MAKS,
  keMuatanLaporKeluhan,
  NILAI_FORM_KELUHAN_BARU,
  periksaFormKeluhan,
  SUBJEK_MAKS,
  USULAN_SUBJEK,
  type KesalahanFormKeluhan,
  type NilaiFormKeluhan,
} from '@/utils/keluhan/formKeluhan';
import { presentSuccessMessage } from '@/utils/errorPresenter';

const OPSI_KATEGORI = PILIHAN_KATEGORI_KELUHAN.map(({ nilai, label }) => ({ nilai, label }));
const OPSI_PRIORITAS = PILIHAN_PRIORITAS_KELUHAN.map(({ nilai, label }) => ({ nilai, label }));
const TEKS_BUTUH_ONLINE = 'Mengirim keluhan butuh koneksi internet.';

/**
 * Lapor keluhan atas nama pelanggan. Keluhan menjadi tiket yang ditangani
 * helpdesk (bisa dijadikan WO teknisi); sales dikabari setiap perkembangannya.
 */
export default function LaporKeluhanScreen() {
  const { tw } = useTemaPersona();
  const router = useRouter();
  const { pelangganId, nama } = useLocalSearchParams<{ pelangganId?: string; nama?: string }>();
  const isOnline = useIsOnline();
  const [nilai, setNilai] = useState<NilaiFormKeluhan>(NILAI_FORM_KELUHAN_BARU);
  const [kesalahan, setKesalahan] = useState<KesalahanFormKeluhan>({});
  const lapor = useLaporKeluhan((hasil) => {
    presentSuccessMessage(`Keluhan tercatat dengan nomor ${hasil.nomor}. Pantau perkembangannya di menu Keluhan.`);
    // Kembali ke asal (bukan replace): di navigator Tabs, replace meninggalkan form ini di riwayat.
    router.back();
  });

  // Tabs mempertahankan instance layar: setiap kali dibuka, mulai dari form kosong.
  useFocusEffect(
    useCallback(() => {
      setNilai(NILAI_FORM_KELUHAN_BARU);
      setKesalahan({});
    }, []),
  );

  const ubah = <K extends keyof NilaiFormKeluhan>(kunci: K, isian: NilaiFormKeluhan[K]) =>
    setNilai((sebelum) => ({ ...sebelum, [kunci]: isian }));

  const kirim = () => {
    if (!pelangganId || !isOnline || lapor.isPending) return;
    const hasilPeriksa = periksaFormKeluhan(nilai);
    setKesalahan(hasilPeriksa);
    if (Object.keys(hasilPeriksa).length > 0) return;
    lapor.mutate(keMuatanLaporKeluhan(pelangganId, nilai));
  };

  if (!pelangganId) {
    return (
      <SafeAreaView style={tw`flex-1 bg-gray-50`}>
        <KepalaLayar judul="Lapor keluhan" />
        <EmptyState
          ikon={UserSearch}
          judul="Pilih pelanggan dulu"
          pesan="Buka Pelanggan saya, lalu ketuk Lapor keluhan pada pelanggan yang mengeluh."
          aksi={{ label: 'Buka Pelanggan saya', onTekan: () => router.replace('/(app)/pelanggan/saya') }}
        />
      </SafeAreaView>
    );
  }

  const kategoriTerpilih = PILIHAN_KATEGORI_KELUHAN.find((item) => item.nilai === nilai.kategori);
  const isBolehKirim = isOnline && !lapor.isPending;

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <KepalaLayar judul="Lapor keluhan" isKembaliNonaktif={lapor.isPending} />
      <ScrollView contentContainerStyle={tw`p-4 pb-40`} keyboardShouldPersistTaps="handled">
        <View style={tw`bg-utama-sangat-muda rounded-2xl px-4 py-3 mb-4`}>
          <Text style={tw`text-xs text-utama-kuat font-semibold`}>Atas nama pelanggan</Text>
          <Text style={tw`text-base font-bold text-gray-900`} numberOfLines={1}>
            {nama || 'Pelanggan'}
          </Text>
        </View>

        <KartuFormulir>
          <JudulIsian judul="Jenis keluhan" isWajib petunjuk={kategoriTerpilih?.keterangan} />
          <PilihanChip opsi={OPSI_KATEGORI} terpilih={nilai.kategori} onPilih={(kategori) => ubah('kategori', kategori)} />
        </KartuFormulir>

        <KartuFormulir>
          <JudulIsian judul="Judul" isWajib petunjuk="Ringkas, mis. Internet mati sejak pagi" />
          {USULAN_SUBJEK[nilai.kategori].length > 0 ? (
            <View style={tw`flex-row flex-wrap -m-1 mb-2`}>
              {USULAN_SUBJEK[nilai.kategori].map((usulan) => (
                <TouchableOpacity
                  key={usulan}
                  accessibilityRole="button"
                  accessibilityLabel={`Pakai judul ${usulan}`}
                  onPress={() => ubah('subjek', usulan)}
                  style={tw`m-1 px-2.5 py-1 rounded-full bg-gray-100`}
                >
                  <Text style={tw`text-xs text-gray-700`}>{usulan}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
          <IsianTeks
            label="Judul keluhan"
            isLabelTersembunyi
            nilai={nilai.subjek}
            onUbah={(isian) => ubah('subjek', isian)}
            kesalahan={kesalahan.subjek}
            placeholder="Judul keluhan"
            maxLength={SUBJEK_MAKS}
          />
        </KartuFormulir>

        <KartuFormulir>
          <JudulIsian judul="Cerita pelanggan" isWajib petunjuk="Sejak kapan, apa yang sudah dicoba, kapan pelanggan ada di rumah." />
          <IsianTeks
            label="Cerita pelanggan"
            isLabelTersembunyi
            nilai={nilai.deskripsi}
            onUbah={(isian) => ubah('deskripsi', isian)}
            kesalahan={kesalahan.deskripsi}
            placeholder="Tulis keluhan pelanggan"
            multiline
            jumlahBaris={5}
            maxLength={DESKRIPSI_MAKS}
            isTampilPenghitung
          />
        </KartuFormulir>

        <KartuFormulir>
          <JudulIsian judul="Tingkat urgensi" isWajib petunjuk="Darurat hanya untuk pelanggan bisnis / banyak pelanggan terdampak." />
          <SegmenPilihan opsi={OPSI_PRIORITAS} terpilih={nilai.prioritas} onPilih={(prioritas) => ubah('prioritas', prioritas)} />
        </KartuFormulir>
      </ScrollView>

      <View style={tw`absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100`}>
        {!isOnline ? <Text style={tw`text-xs text-amber-700 mb-2`}>{TEKS_BUTUH_ONLINE}</Text> : null}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ disabled: !isBolehKirim }}
          disabled={!isBolehKirim}
          onPress={kirim}
          style={tw`rounded-xl py-3 items-center ${isBolehKirim ? 'bg-utama-kuat' : 'bg-gray-400'}`}
        >
          <Text style={tw`text-white font-bold`}>{lapor.isPending ? 'Mengirim…' : 'Kirim ke helpdesk'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

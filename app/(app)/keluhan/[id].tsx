import { useLocalSearchParams } from 'expo-router';
import { AlertTriangle, ListChecks, MessageCircle, MessagesSquare, Send } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/atoms/EmptyState';
import { KartuBagian } from '@/components/molecules/KartuBagian';
import { KepalaLayar } from '@/components/molecules/KepalaLayar';
import { LencanaStatus } from '@/components/molecules/LencanaStatus';
import { LinimasaKeluhan } from '@/components/organisms/keluhan/LinimasaKeluhan';
import { PercakapanKeluhan } from '@/components/organisms/keluhan/PercakapanKeluhan';
import { labelKategoriKeluhan, statusKeluhan } from '@/constants/keluhan';
import { useAuth } from '@/context/AuthContext';
import { useBalasKeluhan, useDetailKeluhan } from '@/hooks/queries/useKeluhan';
import { DESAIN_PREMIUM, useTemaPersona } from '@/theme';
import type { DetailKeluhan } from '@/types/keluhan';
import { pesanKabarKeluhan, susunLangkahKeluhan } from '@/utils/keluhan/langkahKeluhan';
import { hubungiKontak } from '@/utils/kontak';

const BALASAN_MAKS = 2000;
const UKURAN_IKON_KIRIM = 18;
const UKURAN_IKON_KABARI = 16;
/** slate-400 */
const WARNA_PLACEHOLDER = '#94a3b8';
/** slate-300: tombol kirim nonaktif. */
const WARNA_KIRIM_NONAKTIF = '#cbd5e1';

/** Kotak balas helpdesk di bawah layar; nonaktif untuk keluhan yang sudah ditutup. */
function KotakBalas({ keluhan }: { keluhan: DetailKeluhan }) {
  const { tw, warna } = useTemaPersona();
  const [pesan, setPesan] = useState('');
  const balas = useBalasKeluhan(keluhan.id, () => setPesan(''));
  const isDitutup = keluhan.status === 'CLOSED';
  const isBolehKirim = pesan.trim().length > 0 && !balas.isPending && !isDitutup;

  if (isDitutup) {
    return <Text style={tw`text-xs text-slate-500 text-center p-4 bg-white border-t border-gray-100`}>Keluhan sudah ditutup helpdesk.</Text>;
  }
  return (
    <View style={tw`flex-row items-end p-3 bg-white border-t border-gray-100`}>
      <TextInput
        accessibilityLabel="Balas helpdesk"
        value={pesan}
        onChangeText={setPesan}
        placeholder={keluhan.status === 'WAITING_CUSTOMER' ? 'Jawab pertanyaan helpdesk…' : 'Tambah info untuk helpdesk…'}
        placeholderTextColor={WARNA_PLACEHOLDER}
        multiline
        maxLength={BALASAN_MAKS}
        style={tw`flex-1 max-h-28 bg-slate-100 rounded-2xl px-3 py-2 text-slate-900`}
      />
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Kirim balasan"
        accessibilityState={{ disabled: !isBolehKirim }}
        disabled={!isBolehKirim}
        onPress={() => balas.mutate(pesan.trim())}
        style={[tw`ml-2 w-10 h-10 rounded-full items-center justify-center`, { backgroundColor: isBolehKirim ? warna.utamaKuat : WARNA_KIRIM_NONAKTIF }]}
      >
        {balas.isPending ? <ActivityIndicator size="small" color="white" /> : <Send size={UKURAN_IKON_KIRIM} color="white" />}
      </TouchableOpacity>
    </View>
  );
}

/** Kepala detail: pelanggan, judul, status, dan tombol kabari pelanggan via WhatsApp. */
function RingkasanKeluhan({ keluhan, namaSales }: { keluhan: DetailKeluhan; namaSales: string }) {
  const { tw, warna } = useTemaPersona();
  const noTelp = keluhan.pelanggan.noTelp;
  return (
    <View style={tw`bg-white rounded-2xl p-4 mb-3 border border-slate-200/70`}>
      <View style={tw`flex-row items-center`}>
        <Text style={tw`flex-1 text-lg font-bold text-slate-900 mr-2`} numberOfLines={1}>
          {keluhan.pelanggan.nama}
        </Text>
        <LencanaStatus status={statusKeluhan(keluhan.status)} />
      </View>
      <Text style={tw`text-xs text-slate-400 mt-0.5`}>
        {[keluhan.nomor, labelKategoriKeluhan(keluhan.kategori), keluhan.pelanggan.idPelanggan].join(' · ')}
      </Text>
      <Text style={tw`text-base font-semibold text-slate-800 mt-3`}>{keluhan.subjek}</Text>
      <Text style={tw`text-sm text-slate-600 mt-1`}>{keluhan.deskripsi}</Text>
      {keluhan.namaPelapor ? <Text style={tw`text-xs text-slate-400 mt-2`}>{`Dilaporkan oleh ${keluhan.namaPelapor}`}</Text> : null}
      {noTelp ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Kabari ${keluhan.pelanggan.nama} lewat WhatsApp`}
          onPress={() => hubungiKontak(noTelp, pesanKabarKeluhan(keluhan, namaSales))}
          style={tw`mt-3 flex-row items-center justify-center bg-utama-sangat-muda py-2.5 rounded-full`}
        >
          <MessageCircle size={UKURAN_IKON_KABARI} color={warna.utamaKuat} />
          <Text style={tw`font-semibold text-utama-kuat text-sm ml-1.5`}>Kabari pelanggan</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/**
 * Detail keluhan: ringkasan, linimasa penanganan (helpdesk → teknisi →
 * selesai), percakapan dengan helpdesk, dan kotak balas.
 */
export default function DetailKeluhanScreen() {
  const { tw, warna } = useTemaPersona();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: keluhan, isPending, isError, isRefetching, refetch } = useDetailKeluhan(id);

  return (
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: DESAIN_PREMIUM.latarLayar }]} edges={['top', 'bottom']}>
      <KepalaLayar judul={keluhan?.nomor ?? 'Keluhan'} />
      {isPending ? (
        <ActivityIndicator style={tw`mt-16`} color={warna.utamaKuat} />
      ) : !keluhan ? (
        <EmptyState
          ikon={AlertTriangle}
          judul={isError ? 'Gagal memuat keluhan' : 'Keluhan tidak ditemukan'}
          pesan={isError ? 'Periksa koneksi lalu coba lagi.' : 'Keluhan ini di luar pelanggan yang Anda pegang.'}
          aksi={{ label: 'Coba lagi', onTekan: () => void refetch() }}
        />
      ) : (
        <KeyboardAvoidingView style={tw`flex-1`} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={tw`p-4 pb-8`}
            keyboardShouldPersistTaps="handled"
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={warna.utamaKuat} />}
          >
            <RingkasanKeluhan keluhan={keluhan} namaSales={user?.name || 'sales'} />
            <KartuBagian judul="Perkembangan" ikon={ListChecks}>
              <LinimasaKeluhan langkah={susunLangkahKeluhan(keluhan)} />
            </KartuBagian>
            <KartuBagian judul="Percakapan dengan helpdesk" ikon={MessagesSquare}>
              <PercakapanKeluhan balasan={keluhan.balasan} namaSaya={user?.name ?? undefined} />
            </KartuBagian>
          </ScrollView>
          <KotakBalas keluhan={keluhan} />
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

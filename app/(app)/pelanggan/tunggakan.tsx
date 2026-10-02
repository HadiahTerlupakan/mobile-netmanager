import { Stack, useRouter } from "expo-router";
import { AlertTriangle, ArrowLeft, MessageCircle, ShieldCheck } from "lucide-react-native";
import React from "react";
import { ActivityIndicator, RefreshControl, SectionList, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import tw from "twrnc";

import { EmptyState } from "@/components/atoms/EmptyState";
import { PelangganCard } from "@/components/molecules/PelangganCard";
import { useAuth } from "@/context/AuthContext";
import { useTunggakanPelanggan } from "@/hooks/queries/useTunggakanPelanggan";
import { DESAIN_PREMIUM, useTemaPersona } from "@/theme";
import type { KelompokTunggakan, PelangganTunggakan } from "@/types/tunggakan";
import { hubungiKontak, pesanPengingatTunggakan } from "@/utils/kontak";

/** Judul seksi: nama sales dan jumlah pelanggannya (hanya bila lebih dari satu kelompok). */
function JudulKelompok({ kelompok }: { kelompok: KelompokTunggakan }) {
  return (
    <View style={tw`flex-row items-center justify-between px-4 pt-5 pb-2`}>
      <Text style={tw`text-sm font-bold text-slate-900`}>{kelompok.namaSales}</Text>
      <Text style={tw`text-xs font-semibold text-rose-600`}>{`${kelompok.pelanggan.length} pelanggan`}</Text>
    </View>
  );
}

/**
 * Tunggakan pelanggan: pelanggan isolir yang perlu ditindaklanjuti pembayarannya.
 * Sales melihat pelanggannya sendiri, kepala sales timnya, head of sales seluruh
 * tenant (dikelompokkan per sales). Tombol utama membuka WhatsApp dengan pesan
 * pengingat siap kirim.
 */
export default function TunggakanPelangganScreen() {
  const { warna } = useTemaPersona();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isPending, isError, isRefetching, refetch } = useTunggakanPelanggan();
  const kelompok = data?.kelompok ?? [];
  const isBanyakKelompok = kelompok.length > 1;
  const bagian = kelompok.map((item) => ({ kelompok: item, data: item.pelanggan }));

  const ingatkan = (pelanggan: PelangganTunggakan, namaSales: string) => {
    if (!pelanggan.noTelp) return;
    const pengirim = user?.name || namaSales;
    hubungiKontak(pelanggan.noTelp, pesanPengingatTunggakan({ ...pelanggan, namaSales: pengirim }));
  };

  return (
    <View style={[tw`flex-1`, { paddingTop: insets.top, backgroundColor: DESAIN_PREMIUM.latarLayar }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={tw`flex-row items-center px-4 pt-3 pb-2`}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Kembali" onPress={() => router.back()} style={tw`p-2 -ml-2 mr-1`}>
          <ArrowLeft size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={tw`flex-1`}>
          <Text style={tw`text-2xl font-bold text-slate-900`}>Tunggakan pelanggan</Text>
          <Text style={tw`text-sm text-slate-500 mt-0.5`}>
            {data ? `${data.total} pelanggan terisolir perlu ditindaklanjuti` : "Pelanggan terisolir karena tunggakan"}
          </Text>
        </View>
      </View>

      {isPending ? (
        <ActivityIndicator style={tw`mt-16`} color={warna.utamaKuat} />
      ) : (
        <SectionList
          sections={bagian}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={tw`pb-12 pt-2`}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={warna.utamaKuat} />}
          renderSectionHeader={({ section }) => (isBanyakKelompok ? <JudulKelompok kelompok={section.kelompok} /> : null)}
          renderItem={({ item, section }) => (
            <PelangganCard
              pelanggan={item}
              aksi={{
                label: item.noTelp ? "Ingatkan via WhatsApp" : "Nomor HP belum ada",
                ikon: MessageCircle,
                onTekan: () => ingatkan(item, section.kelompok.namaSales),
                isNonaktif: !item.noTelp,
              }}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              ikon={isError ? AlertTriangle : ShieldCheck}
              judul={isError ? "Gagal memuat" : "Tidak ada tunggakan"}
              pesan={isError ? "Tarik ke bawah untuk mencoba lagi." : "Semua pelanggan Anda membayar tepat waktu."}
              aksi={isError ? { label: "Coba lagi", onTekan: () => void refetch() } : undefined}
            />
          }
        />
      )}
    </View>
  );
}

import { useLocalSearchParams } from 'expo-router';
import { MapPin, ReceiptText, Users } from 'lucide-react-native';
import React from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { KartuHeroGradien } from '@/components/molecules/KartuHeroGradien';
import { ScreenErrorBoundary } from '@/components/atoms/ScreenErrorBoundary';
import { KepalaLayar } from '@/components/molecules/KepalaLayar';
import { LencanaStatus } from '@/components/molecules/LencanaStatus';
import { BarisCapaianBulanan } from '@/components/organisms/investor/BarisCapaianBulanan';
import { BilahKemajuan } from '@/components/molecules/BilahKemajuan';
import {
  GrafikPendapatanBulanan,
  type BatangBulanan,
} from '@/components/organisms/investor/GrafikPendapatanBulanan';
import { JudulBagian } from '@/components/molecules/JudulBagian';
import { KartuAngka } from '@/components/molecules/KartuAngka';
import { KeadaanDaftar } from '@/components/organisms/investor/KeadaanDaftar';
import { STATUS_PROYEK } from '@/constants/investor';
import { useRincianProyekInvestor } from '@/hooks/queries/useInvestor';
import { useSegarkanDataInvestor } from '@/hooks/useSegarkanDataInvestor';
import { DESAIN_PREMIUM, GAYA_ANGKA_TABULAR, useTemaPersona } from '@/theme';
import type { CapaianBulananProyek, RincianProyekInvestor } from '@/types/investor';
import {
  formatPersen,
  formatRupiah,
  hitungPersenModalKembali,
  labelBatangBulanProyek,
  labelBulanProyek,
  tampilanStatus,
} from '@/utils/investor';

/** Jumlah bulan terakhir yang digambar di grafik. */
const BULAN_DI_GRAFIK = 6;
const UKURAN_IKON_LOKASI = 13;

/** Capaian bulanan terbaru dulu (bulan ke-n terbesar). */
function urutkanTerbaru(daftar: CapaianBulananProyek[]): CapaianBulananProyek[] {
  return [...daftar].sort((a, b) => b.month - a.month);
}

/** Batang grafik untuk beberapa bulan terakhir, urut lama → baru. */
function susunBatang(terbaruDulu: CapaianBulananProyek[], tanggalMulai: string | null): BatangBulanan[] {
  return terbaruDulu
    .slice(0, BULAN_DI_GRAFIK)
    .reverse()
    .map((bulan) => ({
      kunci: bulan.id,
      label: labelBatangBulanProyek(bulan.month, tanggalMulai),
      pendapatan: Number(bulan.achievedRevenue) || 0,
      bagianSaya: bulan.myProfitShare + bulan.myCapitalReturn,
    }));
}

function KepalaProyek({ proyek }: { proyek: RincianProyekInvestor }) {
  const { warna } = useTemaPersona();
  const teksLembut = { color: warna.utamaGaris };
  return (
    <KartuHeroGradien>
        <LencanaStatus status={tampilanStatus(STATUS_PROYEK, proyek.status)} />
        <Text style={tw`text-xl font-bold text-white mt-3`}>{proyek.name}</Text>
        {proyek.siteName ? (
          <View style={tw`flex-row items-center mt-1`}>
            <MapPin size={UKURAN_IKON_LOKASI} color={warna.utamaGaris} />
            <Text style={[tw`text-xs ml-1`, teksLembut]}>{proyek.siteName}</Text>
          </View>
        ) : null}
        {proyek.description ? <Text style={[tw`text-sm mt-3`, teksLembut]}>{proyek.description}</Text> : null}
        <View style={[tw`flex-row mt-5 pt-4 border-t`, { borderColor: DESAIN_PREMIUM.garisDiAtasGelap }]}>
          <View style={tw`flex-1`}>
            <Text style={[tw`text-xs`, teksLembut]}>Modal saya</Text>
            <Text style={[tw`text-lg font-bold text-white mt-0.5`, GAYA_ANGKA_TABULAR]}>
              {formatRupiah(proyek.investmentAmount)}
            </Text>
          </View>
          <View style={tw`items-end`}>
            <Text style={[tw`text-xs`, teksLembut]}>Porsi bagi hasil</Text>
            <Text style={[tw`text-lg font-bold mt-0.5`, GAYA_ANGKA_TABULAR, { color: DESAIN_PREMIUM.aksenEmas }]}>
              {formatPersen(proyek.profitSharePercent)}
            </Text>
          </View>
        </View>
    </KartuHeroGradien>
  );
}

function KartuPengembalian({ proyek }: { proyek: RincianProyekInvestor }) {
  const { warna } = useTemaPersona();
  const persen = hitungPersenModalKembali(proyek.myTotalCapitalReturn, proyek.investmentAmount);
  const sisaModal = Math.max(0, Number(proyek.investmentAmount) - proyek.myTotalCapitalReturn);
  return (
    <View style={tw`bg-white rounded-2xl p-4 border border-slate-200/70`}>
      <View style={tw`flex-row`}>
        <View style={tw`flex-1`}>
          <Text style={tw`text-xs font-medium text-slate-500`}>Bagi hasil saya</Text>
          <Text style={[tw`text-lg font-bold text-slate-900 mt-0.5`, GAYA_ANGKA_TABULAR]}>
            {formatRupiah(proyek.myTotalProfitShare)}
          </Text>
        </View>
        <View style={tw`flex-1 items-end`}>
          <Text style={tw`text-xs font-medium text-slate-500`}>Modal sudah kembali</Text>
          <Text style={[tw`text-lg font-bold text-slate-900 mt-0.5`, GAYA_ANGKA_TABULAR]}>
            {formatRupiah(proyek.myTotalCapitalReturn)}
          </Text>
        </View>
      </View>
      <View style={tw`mt-4`}>
        <BilahKemajuan persen={persen} warnaIsi={warna.utamaKuat} warnaLatar={warna.utamaSangatMuda} />
        <View style={tw`flex-row justify-between mt-2`}>
          <Text style={tw`text-xs font-semibold text-slate-700`}>{formatPersen(Math.round(persen))} modal kembali</Text>
          <Text style={[tw`text-xs text-slate-500`, GAYA_ANGKA_TABULAR]}>Sisa {formatRupiah(sisaModal)}</Text>
        </View>
      </View>
    </View>
  );
}

function IsiRincian({ proyek }: { proyek: RincianProyekInvestor }) {
  const pelanggan = proyek.subscribers;
  const capaian = urutkanTerbaru(proyek.actualAchievements);
  return (
    <View style={tw`px-4 pt-4`}>
      <KepalaProyek proyek={proyek} />

      <JudulBagian judul="Pengembalian untuk saya" />
      <KartuPengembalian proyek={proyek} />

      <JudulBagian judul="Pelanggan" />
      <View style={tw`flex-row gap-3`}>
        <KartuAngka
          ikon={Users}
          label="Pelanggan aktif"
          nilai={`${pelanggan.active} orang`}
          keterangan={proyek.targetSubscribers ? `Target ${proyek.targetSubscribers} orang` : undefined}
        />
        <KartuAngka
          ikon={ReceiptText}
          label="Bayar bulan ini"
          nilai={`${pelanggan.paying} orang`}
          keterangan={`Perkiraan pendapatan ${formatRupiah(proyek.estimatedCurrentRevenue)}`}
        />
      </View>

      <JudulBagian judul="Hasil per bulan" />
      {capaian.length === 0 ? (
        <Text style={tw`text-slate-500`}>Belum ada laporan bulanan.</Text>
      ) : (
        <>
          <GrafikPendapatanBulanan batang={susunBatang(capaian, proyek.startDate)} />
          <View style={tw`mt-3`}>
            {capaian.map((bulan) => (
              <BarisCapaianBulanan
                key={bulan.id}
                judul={labelBulanProyek(bulan.month, proyek.startDate)}
                capaian={bulan}
              />
            ))}
          </View>
        </>
      )}
    </View>
  );
}

/** Rincian satu proyek investor. */
export default function RincianProyekInvestorScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError, isRefetching, refetch } = useRincianProyekInvestor(id);
  useSegarkanDataInvestor();

  return (
    <ScreenErrorBoundary screenName="RincianProyekInvestor">
      <SafeAreaView style={[tw`flex-1`, { backgroundColor: DESAIN_PREMIUM.latarLayar }]} edges={['top', 'bottom']}>
        <KepalaLayar judul="Rincian Proyek" />
        <ScrollView
          contentContainerStyle={tw`pb-8`}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
        >
          <KeadaanDaftar
            isMemuat={isLoading}
            isGalat={isError}
            isKosong={false}
            pesanKosong=""
            onUlang={() => void refetch()}
          >
            {data ? <IsiRincian proyek={data} /> : null}
          </KeadaanDaftar>
        </ScrollView>
      </SafeAreaView>
    </ScreenErrorBoundary>
  );
}

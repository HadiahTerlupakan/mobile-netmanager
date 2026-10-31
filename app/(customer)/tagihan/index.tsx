import { Skeleton } from '@/components/atoms/Skeleton';
import { LembarPembayaranBerhasil } from '@/components/molecules/LembarPembayaranBerhasil';
import { KartuPembayaranMenunggu } from '@/components/organisms/tagihan/KartuPembayaranMenunggu';
import { KartuRingkasanTagihan } from '@/components/organisms/tagihan/KartuRingkasanTagihan';
import { PanelRincianPembayaran } from '@/components/organisms/tagihan/PanelRincianPembayaran';
import { useProfilPelanggan } from '@/hooks/queries/useAkunPelanggan';
import { usePembayaranLunas } from '@/hooks/usePembayaranLunas';
import { bukaHalamanBayar, useBuatPembayaran, type HasilHalamanBayar } from '@/hooks/tagihan/useBuatPembayaran';
import { useHitungMundurPembayaran } from '@/hooks/tagihan/useHitungMundurPembayaran';
import { useCekStatusPembayaran } from '@/hooks/tagihan/useCekStatusPembayaran';
import { useKuponTagihan } from '@/hooks/tagihan/useKuponTagihan';
import { useMetodeBayar } from '@/hooks/tagihan/useMetodeBayar';
import { usePanelBayar } from '@/hooks/tagihan/usePanelBayar';
import { usePantauStatusPembayaran } from '@/hooks/tagihan/usePantauStatusPembayaran';
import { useTagihanPelanggan } from '@/hooks/tagihan/useTagihanPelanggan';
import { useUnggahBuktiTransfer } from '@/hooks/tagihan/useUnggahBuktiTransfer';
import { presentErrorMessage, presentInfoMessage, presentSuccessMessage } from '@/utils/errorPresenter';
import { logger } from '@/utils/logger';
import { formatRupiah } from '@/utils/rupiah';
import { simpanQrisKeGaleri } from '@/utils/simpanQrisKeGaleri';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect, useRouter } from 'expo-router';
import { ArrowLeft, ChevronRight, Headset, History } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

const salin = async (teks: string, label: string) => {
  try {
    await Clipboard.setStringAsync(teks);
    presentInfoMessage(`${label} berhasil disalin!`, 'Disalin');
  } catch (error) {
    logger.error('[CustomerTagihan] Failed to copy payment detail', error);
    presentErrorMessage(`Gagal menyalin ${label}.`);
  }
};

const simpanQris = async (base64Png: string) => {
  try {
    if ((await simpanQrisKeGaleri(base64Png)) === 'ditolak') {
      presentInfoMessage('Izinkan akses Galeri agar gambar QRIS bisa disimpan.', 'Izin Ditolak');
      return;
    }
    presentSuccessMessage('QRIS tersimpan di Galeri. Buka aplikasi e-wallet, pilih Scan lalu ambil dari Galeri.');
  } catch (error) {
    logger.error('[CustomerTagihan] Failed to save QRIS', error);
    presentErrorMessage('Gagal menyimpan gambar QRIS.');
  }
};

export default function CustomerTagihanScreen() {
  const router = useRouter();
  const panel = usePanelBayar();
  // Spinner tarik-segarkan hanya untuk tarikan pelanggan, bukan polling atau cek status.
  const [isMenarikUlang, setIsMenarikUlang] = useState(false);

  const { data: dataTagihan, isLoading, refetch, ringkasan, ambilTagihanMenunggu } = useTagihanPelanggan();
  const { terutang, totalTerutang, jatuhTempoTerdekat, tagihanMenunggu } = ringkasan;
  const kupon = useKuponTagihan(totalTerutang);
  const totalBayar = totalTerutang - (kupon.diskon?.amount ?? 0);
  const metodeBayar = useMetodeBayar(totalBayar);
  const daftarMetode = metodeBayar.data;
  // Metode terpilih bisa hilang dari daftar setelah nominal berubah (kupon).
  const kodeTerpilih = daftarMetode?.some((metode) => metode.code === panel.kodeMetode) ? panel.kodeMetode : '';
  const muatUlang = useCallback(() => void refetch(), [refetch]);
  // Tagihan bisa dilunasi lewat portal web atau loket selama tab ini tertutup.
  useFocusEffect(muatUlang);

  const pembayaranMenunggu = tagihanMenunggu?.lastPayment;
  const metodeMenunggu = daftarMetode?.find((metode) => metode.code === pembayaranMenunggu?.gatewayProvider);
  const rekeningManual =
    pembayaranMenunggu?.method === 'BANK_TRANSFER' && pembayaranMenunggu.accountId
      ? daftarMetode?.find((metode) => metode.id === `manual_${pembayaranMenunggu.accountId}`)?.details
      : undefined;

  const { data: profil } = useProfilPelanggan();
  const pembayaranLunas = usePembayaranLunas(ringkasan.daftarPantauan, profil?.status);
  const hitungMundur = useHitungMundurPembayaran(pembayaranMenunggu?.expiresAt, muatUlang);
  usePantauStatusPembayaran({ tagihan: tagihanMenunggu, isAktif: !hitungMundur.isKedaluwarsa, muatUlang: refetch });
  const cekStatus = useCekStatusPembayaran({ ambilTagihanMenunggu, muatUlang: refetch });
  const unggahBukti = useUnggahBuktiTransfer(muatUlang);
  // Kembali lewat redirect gateway berarti pelanggan mungkin sudah membayar;
  // tab yang ditutup sendiri tidak perlu disebut "belum diterima".
  const kembaliDariHalamanBayar = (hasil: HasilHalamanBayar) => cekStatus.cek(hasil.type === 'success');
  const buatPembayaran = useBuatPembayaran({
    onDibuat: () => {
      panel.tutup();
      return refetch();
    },
    onKembaliDariHalamanBayar: kembaliDariHalamanBayar,
  });

  const tarikUlang = async () => {
    setIsMenarikUlang(true);
    try {
      await Promise.all([refetch(), metodeBayar.refetch()]);
    } finally {
      setIsMenarikUlang(false);
    }
  };

  const bayar = () => {
    if (!terutang.length || !kodeTerpilih) return;
    const kodeKupon = kupon.diskon?.code ?? null;
    buatPembayaran.mutate({ invoiceIds: terutang.map((tagihan) => tagihan.id), kodeKupon, kodeMetode: kodeTerpilih });
  };

  const kartuMenunggu = pembayaranMenunggu && tagihanMenunggu && (
    <KartuPembayaranMenunggu
      tagihan={tagihanMenunggu}
      pembayaran={pembayaranMenunggu}
      metode={metodeMenunggu}
      rekening={rekeningManual}
      hitungMundur={hitungMundur}
      isMengecekStatus={cekStatus.isMengecek}
      isMengunggah={unggahBukti.isMengunggah}
      aksi={{
        onSalin: salin,
        onSimpanQris: simpanQris,
        onCekStatus: () => cekStatus.cek(),
        onBukaHalamanBayar: () => void bukaHalamanBayar(pembayaranMenunggu.paymentUrl!).then(kembaliDariHalamanBayar),
        onGantiMetode: panel.bukaGantiMetode,
        onUnggahBukti: () => unggahBukti.pilihDanUnggah(tagihanMenunggu.id),
      }}
    />
  );

  const ringkasanDanPanel = (
    <View style={tw`p-4`}>
      <KartuRingkasanTagihan
        jumlahTagihan={terutang.length}
        total={formatRupiah(totalTerutang)}
        jatuhTempoTerdekat={jatuhTempoTerdekat}
        isTampilkanTombolBayar={totalTerutang > 0 && !panel.isTerbuka && !buatPembayaran.isPending}
        onBayar={panel.buka}
      />
      {panel.isTerbuka && totalTerutang > 0 && (
        <PanelRincianPembayaran
          kupon={kupon}
          daftarMetode={{ metode: daftarMetode, isGagal: metodeBayar.isError, onMuatUlang: () => void metodeBayar.refetch() }}
          kodeTerpilih={kodeTerpilih}
          onPilihMetode={panel.setKodeMetode}
          totalBayar={totalBayar}
          isGantiMetode={panel.isGantiMetode && !hitungMundur.isKedaluwarsa}
          isMembayar={buatPembayaran.isPending}
          onBayar={bayar}
          onTutup={panel.tutup}
        />
      )}
    </View>
  );

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={['top']}>
      <View style={tw`bg-white px-4 py-3 border-b border-gray-100 flex-row items-center justify-between`}>
        <View style={tw`flex-row items-center`}>
          <TouchableOpacity onPress={() => router.back()} style={tw`mr-3`}>
            <ArrowLeft size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={tw`text-lg font-bold text-gray-900`}>Tagihan & Pembayaran</Text>
        </View>
        <TouchableOpacity accessibilityLabel="Bantuan pembayaran" onPress={() => router.push('/(customer)/tickets')} style={tw`p-1`}>
          <Headset size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={tw`pb-24`}
        refreshControl={<RefreshControl refreshing={isMenarikUlang} onRefresh={tarikUlang} tintColor="#0d9488" />}
      >
        {isLoading && !dataTagihan ? (
          <View style={tw`p-4 gap-3`}>
            <Skeleton height={200} borderRadius={16} />
            <Skeleton height={80} borderRadius={12} />
            <Skeleton height={80} borderRadius={12} />
          </View>
        ) : (
          <>
            {kartuMenunggu && !panel.isGantiMetode ? kartuMenunggu : ringkasanDanPanel}
            {/* Riwayat punya layar sendiri agar halaman bayar tidak memanjang seiring tagihan bertambah. */}
            <TouchableOpacity
              onPress={() => router.push('/(customer)/riwayat')}
              style={tw`mx-4 mb-4 bg-white rounded-xl border border-gray-100 p-4 flex-row items-center`}
            >
              <History size={20} color="#0d9488" />
              <Text style={tw`flex-1 ml-3 font-bold text-gray-900`}>Riwayat Tagihan & Pembayaran</Text>
              <ChevronRight size={20} color="#9ca3af" />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
      <LembarPembayaranBerhasil
        nominal={pembayaranLunas.lunas ? formatRupiah(pembayaranLunas.lunas.nominal) : null}
        daftarNomorTagihan={pembayaranLunas.lunas?.daftarNomorTagihan ?? []}
        isLayananDipulihkan={pembayaranLunas.lunas?.isLayananDipulihkan ?? false}
        onTutup={pembayaranLunas.tutup}
      />
    </SafeAreaView>
  );
}

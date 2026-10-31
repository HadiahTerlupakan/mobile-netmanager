import { Skeleton } from '@/components/atoms/Skeleton';
import { LembarPembayaranBerhasil } from '@/components/molecules/LembarPembayaranBerhasil';
import { KartuPembayaranMenunggu } from '@/components/organisms/tagihan/KartuPembayaranMenunggu';
import { KartuRingkasanTagihan } from '@/components/organisms/tagihan/KartuRingkasanTagihan';
import { PanelRincianPembayaran } from '@/components/organisms/tagihan/PanelRincianPembayaran';
import { useProfilPelanggan } from '@/hooks/queries/useAkunPelanggan';
import { usePembayaranLunas } from '@/hooks/usePembayaranLunas';
import { bukaHalamanBayar, useBuatPembayaran } from '@/hooks/tagihan/useBuatPembayaran';
import { useHitungMundurPembayaran } from '@/hooks/tagihan/useHitungMundurPembayaran';
import { useKuponTagihan } from '@/hooks/tagihan/useKuponTagihan';
import { useSseStatusPembayaran } from '@/hooks/tagihan/useSseStatusPembayaran';
import { useTagihanPelanggan } from '@/hooks/tagihan/useTagihanPelanggan';
import { useUnggahBuktiTransfer } from '@/hooks/tagihan/useUnggahBuktiTransfer';
import api from '@/services/api';
import type { MetodePembayaranPelanggan } from '@/types/portalPelanggan';
import { presentErrorMessage, presentInfoMessage, presentSuccessMessage } from '@/utils/errorPresenter';
import { logger } from '@/utils/logger';
import { formatRupiah } from '@/utils/rupiah';
import { simpanQrisKeGaleri } from '@/utils/simpanQrisKeGaleri';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect, useRouter } from 'expo-router';
import { ArrowLeft, ChevronRight, Headset, History } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

const ambilMetode = async () => {
  const res = await api.get('/api/customer/payment-methods');
  return res.data.data as MetodePembayaranPelanggan[];
};

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
  const [kodeMetode, setKodeMetode] = useState('');
  const [isPanelBayarTerbuka, setIsPanelBayarTerbuka] = useState(false);
  // Checkout yang menunggu sedang diganti metodenya: tampilkan pilihan metode.
  const [isGantiMetode, setIsGantiMetode] = useState(false);
  const [isMengecekStatus, setIsMengecekStatus] = useState(false);
  // Spinner tarik-segarkan hanya untuk tarikan pelanggan, bukan polling atau cek status.
  const [isMenarikUlang, setIsMenarikUlang] = useState(false);

  const { data: dataTagihan, isLoading, refetch, ringkasan } = useTagihanPelanggan();
  const { terutang, totalTerutang, jatuhTempoTerdekat, tagihanMenunggu } = ringkasan;
  const { data: daftarMetode, refetch: refetchMetode } = useQuery({ queryKey: ['payment-methods'], queryFn: ambilMetode });
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
  // Checkout yang lewat batas tidak akan berubah lagi; koneksi status tidak perlu dibuka.
  useSseStatusPembayaran(hitungMundur.isKedaluwarsa ? undefined : tagihanMenunggu?.id, muatUlang);
  const kupon = useKuponTagihan(totalTerutang);
  const unggahBukti = useUnggahBuktiTransfer(muatUlang);
  const buatPembayaran = useBuatPembayaran(() => {
    muatUlang();
    setIsGantiMetode(false);
  });

  const tarikUlang = async () => {
    setIsMenarikUlang(true);
    try {
      await Promise.all([refetch(), refetchMetode()]);
    } finally {
      setIsMenarikUlang(false);
    }
  };

  const bayar = () => {
    if (!terutang.length || !kodeMetode) return;
    buatPembayaran.mutate({ invoiceIds: terutang.map((tagihan) => tagihan.id), kodeKupon: kupon.diskon?.code ?? null, kodeMetode });
  };

  const cekStatusPembayaran = async () => {
    setIsMengecekStatus(true);
    try {
      const hasil = await refetch();
      if (hasil.data?.terbuka.some((tagihan) => tagihan.id === tagihanMenunggu?.id)) {
        presentInfoMessage('Pembayaran belum kami terima. Bila baru saja membayar, tunggu 1–2 menit lalu cek lagi.', 'Belum Diterima');
      }
    } finally {
      setIsMengecekStatus(false);
    }
  };

  const kartuMenunggu = pembayaranMenunggu && tagihanMenunggu && (
    <KartuPembayaranMenunggu
      tagihan={tagihanMenunggu}
      pembayaran={pembayaranMenunggu}
      metode={metodeMenunggu}
      rekening={rekeningManual}
      hitungMundur={hitungMundur}
      isMengecekStatus={isMengecekStatus}
      isMengunggah={unggahBukti.isMengunggah}
      aksi={{
        onSalin: salin,
        onSimpanQris: simpanQris,
        onCekStatus: cekStatusPembayaran,
        onBukaHalamanBayar: () => bukaHalamanBayar(pembayaranMenunggu.paymentUrl!),
        onGantiMetode: () => {
          setIsGantiMetode(true);
          setIsPanelBayarTerbuka(true);
        },
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
        isTampilkanTombolBayar={totalTerutang > 0 && !isPanelBayarTerbuka}
        onBayar={() => setIsPanelBayarTerbuka(true)}
      />
      {isPanelBayarTerbuka && totalTerutang > 0 && (
        <PanelRincianPembayaran
          kupon={kupon}
          metode={daftarMetode}
          kodeTerpilih={kodeMetode}
          onPilihMetode={setKodeMetode}
          totalBayar={totalTerutang - (kupon.diskon?.amount ?? 0)}
          isGantiMetode={isGantiMetode && !hitungMundur.isKedaluwarsa}
          isMembayar={buatPembayaran.isPending}
          onBayar={bayar}
          onTutup={() => {
            setIsPanelBayarTerbuka(false);
            setIsGantiMetode(false);
          }}
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
            {kartuMenunggu && !isGantiMetode ? kartuMenunggu : ringkasanDanPanel}
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

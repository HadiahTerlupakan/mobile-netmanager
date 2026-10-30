import { Skeleton } from '@/components/atoms/Skeleton';
import { LembarPembayaranBerhasil } from '@/components/molecules/LembarPembayaranBerhasil';
import { KartuMenungguGateway } from '@/components/organisms/tagihan/KartuMenungguGateway';
import { KartuRingkasanTagihan } from '@/components/organisms/tagihan/KartuRingkasanTagihan';
import { KartuTransferManual } from '@/components/organisms/tagihan/KartuTransferManual';
import { PanelRincianPembayaran } from '@/components/organisms/tagihan/PanelRincianPembayaran';
import { RiwayatTagihan } from '@/components/organisms/tagihan/RiwayatTagihan';
import { usePembayaranLunas } from '@/hooks/usePembayaranLunas';
import { bukaHalamanBayar, useBuatPembayaran } from '@/hooks/tagihan/useBuatPembayaran';
import { useHitungMundurPembayaran } from '@/hooks/tagihan/useHitungMundurPembayaran';
import { useKuponTagihan } from '@/hooks/tagihan/useKuponTagihan';
import { useSseStatusPembayaran } from '@/hooks/tagihan/useSseStatusPembayaran';
import { useUnggahBuktiTransfer } from '@/hooks/tagihan/useUnggahBuktiTransfer';
import api from '@/services/api';
import type { MetodePembayaranPelanggan, PembayaranTerakhir, TagihanPelanggan } from '@/types/portalPelanggan';
import { presentErrorMessage, presentInfoMessage, presentSuccessMessage } from '@/utils/errorPresenter';
import { logger } from '@/utils/logger';
import { ambilMuatan } from '@/utils/responsPelanggan';
import { formatRupiah } from '@/utils/rupiah';
import { simpanQrisKeGaleri } from '@/utils/simpanQrisKeGaleri';
import { isTagihanTerutang } from '@/utils/statusTagihanPelanggan';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { ArrowLeft, Clock, Headset } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

dayjs.locale('id');

/** SSE status pembayaran bisa putus tanpa tersambung lagi; polling ini cadangannya. */
const INTERVAL_CEK_PEMBAYARAN_MS = 15_000;
const STATUS_MENUNGGU = 'PENDING';

const ambilTagihan = async () => {
  const res = await api.get('/api/customer/invoices?limit=20');
  return ambilMuatan<TagihanPelanggan[]>(res.data, 'invoices') ?? [];
};

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

function KepalaMenunggu({ sisaWaktu, keterangan }: { sisaWaktu: string; keterangan: string }) {
  return (
    <>
      <View style={tw`flex-row items-center mb-4`}>
        <Clock size={20} color="#ea580c" />
        <Text style={tw`text-orange-600 font-bold ml-2 text-sm`}>Selesaikan Pembayaran</Text>
        {sisaWaktu !== '' && (
          <View style={tw`ml-auto bg-orange-100 px-3 py-1 rounded-full`}>
            <Text style={tw`text-orange-600 font-bold text-xs`}>Sisa {sisaWaktu}</Text>
          </View>
        )}
      </View>
      <Text style={tw`text-xs text-gray-500 -mt-2 mb-4`}>{keterangan}</Text>
    </>
  );
}

const keteranganMenunggu = (metode: string | undefined, nomorTagihan: string | undefined, pembayaran: PembayaranTerakhir) =>
  [metode, `#${nomorTagihan}`, pembayaran.expiresAt ? `bayar sebelum ${dayjs(pembayaran.expiresAt).format('D MMM, HH.mm')}` : null]
    .filter(Boolean)
    .join(' · ');

export default function CustomerTagihanScreen() {
  const router = useRouter();
  const [kodeMetode, setKodeMetode] = useState('');
  const [isPanelBayarTerbuka, setIsPanelBayarTerbuka] = useState(false);
  // Checkout yang menunggu sedang diganti metodenya: tampilkan pilihan metode.
  const [isGantiMetode, setIsGantiMetode] = useState(false);
  const [isMengecekStatus, setIsMengecekStatus] = useState(false);
  // Spinner tarik-segarkan hanya untuk tarikan pelanggan, bukan polling atau cek status.
  const [isMenarikUlang, setIsMenarikUlang] = useState(false);

  const { data: daftarTagihan, isLoading, refetch } = useQuery({
    queryKey: ['customer-invoices'],
    queryFn: ambilTagihan,
    refetchInterval: (query) =>
      query.state.data?.some((tagihan) => tagihan.lastPayment?.gatewayStatus === STATUS_MENUNGGU) ? INTERVAL_CEK_PEMBAYARAN_MS : false,
  });
  const { data: daftarMetode, refetch: refetchMetode } = useQuery({ queryKey: ['payment-methods'], queryFn: ambilMetode });
  const muatUlang = useCallback(() => void refetch(), [refetch]);

  const terutang = (daftarTagihan ?? []).filter((tagihan) => isTagihanTerutang(tagihan.status));
  const totalTerutang = terutang.reduce((sum, tagihan) => sum + tagihan.remainingAmount, 0);
  const jatuhTempoTerdekat = [...terutang].sort((a, b) => dayjs(a.dueDate).diff(b.dueDate))[0]?.dueDate ?? null;
  const tagihanMenunggu = terutang.find((tagihan) => tagihan.lastPayment?.gatewayStatus === STATUS_MENUNGGU);
  const pembayaranMenunggu = tagihanMenunggu?.lastPayment;
  const metodeMenunggu = daftarMetode?.find((metode) => metode.code === pembayaranMenunggu?.gatewayProvider);
  const rekeningManual =
    pembayaranMenunggu?.method === 'BANK_TRANSFER' && pembayaranMenunggu.accountId
      ? daftarMetode?.find((metode) => metode.id === `manual_${pembayaranMenunggu.accountId}`)?.details
      : undefined;

  const pembayaranLunas = usePembayaranLunas(daftarTagihan);
  const sisaWaktu = useHitungMundurPembayaran(pembayaranMenunggu?.expiresAt, muatUlang);
  useSseStatusPembayaran(tagihanMenunggu?.id, muatUlang);
  const kupon = useKuponTagihan(totalTerutang);
  const unggahBukti = useUnggahBuktiTransfer(muatUlang);
  const buatPembayaran = useBuatPembayaran(() => {
    muatUlang();
    setIsGantiMetode(false);
    kupon.reset();
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
      if (hasil.data?.some((tagihan) => tagihan.id === tagihanMenunggu?.id && tagihan.status !== 'PAID')) {
        presentInfoMessage('Pembayaran belum kami terima. Bila baru saja membayar, tunggu 1–2 menit lalu cek lagi.', 'Belum Diterima');
      }
    } finally {
      setIsMengecekStatus(false);
    }
  };

  const kartuMenunggu = pembayaranMenunggu && tagihanMenunggu && (
    <View style={tw`p-4`}>
      <View style={tw`bg-white rounded-2xl p-5 shadow-lg border border-orange-200 overflow-hidden`}>
        <KepalaMenunggu sisaWaktu={sisaWaktu} keterangan={keteranganMenunggu(metodeMenunggu?.name, tagihanMenunggu.invoiceNumber, pembayaranMenunggu)} />
        {rekeningManual ? (
          <KartuTransferManual
            rekening={rekeningManual}
            nominal={formatRupiah(pembayaranMenunggu.amount)}
            nominalMentah={pembayaranMenunggu.amount}
            isBuktiTerkirim={Boolean(pembayaranMenunggu.receiptUrl)}
            isMengunggah={unggahBukti.isMengunggah}
            onSalin={salin}
            onUnggahBukti={() => unggahBukti.pilihDanUnggah(tagihanMenunggu.id)}
          />
        ) : (
          <KartuMenungguGateway
            nominal={formatRupiah(pembayaranMenunggu.amount)}
            nomorVa={pembayaranMenunggu.vaNumber}
            stringQris={pembayaranMenunggu.qrString}
            namaMetode={metodeMenunggu?.name}
            jenisMetode={metodeMenunggu?.type}
            urlBayar={pembayaranMenunggu.paymentUrl}
            isMengecekStatus={isMengecekStatus}
            onSalin={salin}
            onSimpanQris={simpanQris}
            onCekStatus={cekStatusPembayaran}
            onBukaHalamanBayar={() => bukaHalamanBayar(pembayaranMenunggu.paymentUrl!)}
            onGantiMetode={() => {
              setIsGantiMetode(true);
              setIsPanelBayarTerbuka(true);
            }}
          />
        )}
      </View>
    </View>
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
          isGantiMetode={isGantiMetode}
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
        {isLoading && !daftarTagihan ? (
          <View style={tw`p-4 gap-3`}>
            <Skeleton height={200} borderRadius={16} />
            <Skeleton height={80} borderRadius={12} />
            <Skeleton height={80} borderRadius={12} />
          </View>
        ) : (
          <>
            {kartuMenunggu && !isGantiMetode ? kartuMenunggu : ringkasanDanPanel}
            <RiwayatTagihan daftar={daftarTagihan ?? []} />
          </>
        )}
      </ScrollView>
      <LembarPembayaranBerhasil
        nominal={pembayaranLunas.lunas ? formatRupiah(pembayaranLunas.lunas.nominal) : null}
        nomorTagihan={pembayaranLunas.lunas?.nomorTagihan ?? null}
        onTutup={pembayaranLunas.tutup}
      />
    </SafeAreaView>
  );
}

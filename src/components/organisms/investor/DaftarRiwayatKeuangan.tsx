import React from 'react';
import { ActivityIndicator, TouchableOpacity, Text } from 'react-native';
import tw from 'twrnc';

import { BarisRiwayatUang } from './BarisRiwayatUang';
import { KeadaanDaftar } from './KeadaanDaftar';
import { JENIS_SETORAN, STATUS_BAGI_HASIL, STATUS_PENCAIRAN, STATUS_SETORAN } from '@/constants/investor';
import {
  useBagiHasilInvestor,
  usePencairanInvestor,
  useSetoranModalInvestor,
} from '@/hooks/queries/useInvestor';
import { formatDate } from '@/utils/date';
import { formatPersen, formatRupiah, labelPeriode, tampilanStatus } from '@/utils/investor';

const FORMAT_TANGGAL = 'd MMMM yyyy';

/** Riwayat bagi hasil per periode. */
export function DaftarBagiHasil() {
  const { data = [], isLoading, isError, refetch } = useBagiHasilInvestor();
  return (
    <KeadaanDaftar
      isMemuat={isLoading}
      isGalat={isError}
      isKosong={data.length === 0}
      pesanKosong="Belum ada bagi hasil."
      onUlang={() => void refetch()}
    >
      {data.map((bagi) => (
        <BarisRiwayatUang
          key={bagi.id}
          judul={labelPeriode(bagi.periodStart, bagi.periodEnd)}
          tanggal={`Bagian saya ${formatPersen(bagi.sharePercent)} dari laba ${formatRupiah(bagi.netProfit)}`}
          nominal={formatRupiah(bagi.shareAmount)}
          status={tampilanStatus(STATUS_BAGI_HASIL, bagi.status)}
          catatan={bagi.paidAt ? `Dibayar ${formatDate(bagi.paidAt, FORMAT_TANGGAL)}` : null}
        />
      ))}
    </KeadaanDaftar>
  );
}

/** Riwayat setoran modal. */
export function DaftarSetoranModal() {
  const { data = [], isLoading, isError, refetch } = useSetoranModalInvestor();
  return (
    <KeadaanDaftar
      isMemuat={isLoading}
      isGalat={isError}
      isKosong={data.length === 0}
      pesanKosong="Belum ada setoran modal."
      onUlang={() => void refetch()}
    >
      {data.map((setoran) => (
        <BarisRiwayatUang
          key={setoran.id}
          judul={JENIS_SETORAN[setoran.depositType] ?? setoran.depositType}
          tanggal={formatDate(setoran.date, FORMAT_TANGGAL)}
          nominal={formatRupiah(setoran.amount)}
          status={tampilanStatus(STATUS_SETORAN, setoran.status)}
          catatan={setoran.rejectedReason ? `Alasan ditolak: ${setoran.rejectedReason}` : null}
        />
      ))}
    </KeadaanDaftar>
  );
}

/** Riwayat uang yang sudah dikirim ke rekening investor, dimuat per halaman. */
export function DaftarPencairan() {
  const { data, isLoading, isError, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } =
    usePencairanInvestor();
  const daftar = data?.pages.flatMap((halaman) => halaman.data) ?? [];
  return (
    <KeadaanDaftar
      isMemuat={isLoading}
      isGalat={isError}
      isKosong={daftar.length === 0}
      pesanKosong="Belum ada uang yang dikirim ke Anda."
      onUlang={() => void refetch()}
    >
      {daftar.map((cair) => (
        <BarisRiwayatUang
          key={cair.id}
          judul="Uang dikirim ke saya"
          tanggal={formatDate(cair.date, FORMAT_TANGGAL)}
          nominal={formatRupiah(cair.amount)}
          status={tampilanStatus(STATUS_PENCAIRAN, cair.status)}
          catatan={cair.bankName ? `Ke rekening ${cair.bankName} ${cair.accountNumber ?? ''}`.trim() : cair.notes}
        />
      ))}
      {hasNextPage ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Muat lebih banyak"
          disabled={isFetchingNextPage}
          onPress={() => void fetchNextPage()}
          style={tw`items-center py-3`}
        >
          {isFetchingNextPage ? (
            <ActivityIndicator />
          ) : (
            <Text style={tw`font-semibold text-gray-700`}>Tampilkan lebih banyak</Text>
          )}
        </TouchableOpacity>
      ) : null}
    </KeadaanDaftar>
  );
}

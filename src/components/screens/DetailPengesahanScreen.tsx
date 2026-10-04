import { useLocalSearchParams, useRouter } from 'expo-router';
import { AlertTriangle } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { EmptyState } from '@/components/atoms/EmptyState';
import { KepalaLayar } from '@/components/molecules/KepalaLayar';
import { AksiPengesahan } from '@/components/organisms/pengesahan/AksiPengesahan';
import { DaftarPenandaTangan } from '@/components/organisms/pengesahan/DaftarPenandaTangan';
import { RingkasanSuratPengesahan } from '@/components/organisms/pengesahan/RingkasanSuratPengesahan';
import { ruteTandaTanganPengesahan, ruteTolakPengesahan } from '@/constants/rutePengesahan';
import { useLihatDokumenPengesahan } from '@/hooks/pengesahan/useLihatDokumenPengesahan';
import { useDetailPengesahan } from '@/hooks/queries/usePengesahan';
import { DESAIN_PREMIUM, useTemaPersona } from '@/theme';
import { isSuratTidakDitemukan } from '@/utils/pengesahan/tampilanPengesahan';

/** Detail surat pengesahan: ringkasan, penanda tangan, lihat dokumen, tanda tangani / tolak. */
export function DetailPengesahanScreen() {
  const { warna } = useTemaPersona();
  const router = useRouter();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { data, error, isPending, isError, isRefetching, refetch } = useDetailPengesahan(id);
  // Data lama di cache tidak boleh tetap tampil setelah server menyatakan surat sudah tidak ada.
  const isTidakDitemukan = isSuratTidakDitemukan(error);
  const surat = isTidakDitemukan ? undefined : data;
  const lihatDokumen = useLihatDokumenPengesahan(id);

  return (
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: DESAIN_PREMIUM.latarLayar }]} edges={['top', 'bottom']}>
      <KepalaLayar judul={surat?.number ?? 'Pengesahan'} />
      {isPending ? (
        <ActivityIndicator style={tw`mt-16`} color={warna.utamaKuat} />
      ) : !surat ? (
        <EmptyState
          ikon={AlertTriangle}
          judul={isError && !isTidakDitemukan ? 'Gagal memuat surat' : 'Surat tidak ditemukan'}
          pesan={isError && !isTidakDitemukan ? 'Periksa koneksi lalu coba lagi.' : 'Surat ini sudah ditarik atau tidak lagi ditujukan kepada Anda.'}
          aksi={{ label: 'Coba lagi', onTekan: () => void refetch() }}
        />
      ) : (
        <>
          <ScrollView
            contentContainerStyle={tw`p-4 pb-8`}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={warna.utamaKuat} />}
          >
            <RingkasanSuratPengesahan surat={surat} />
            <DaftarPenandaTangan penandaTangan={surat.signers} jumlahSelesai={surat.signedCount} />
          </ScrollView>
          <AksiPengesahan
            isBolehTandaTangan={surat.canSign}
            isBolehLihatDokumen={surat.canViewDocument}
            isMembukaDokumen={lihatDokumen.isPending}
            isDokumenSah={surat.hasSignedFile}
            onLihatDokumen={() => lihatDokumen.mutate()}
            onTandaTangan={() => router.push(ruteTandaTanganPengesahan(id))}
            onTolak={() => router.push(ruteTolakPengesahan(id))}
          />
        </>
      )}
    </SafeAreaView>
  );
}

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

/** Detail surat pengesahan: ringkasan, penanda tangan, lihat dokumen, tanda tangani / tolak. */
export function DetailPengesahanScreen() {
  const { warna } = useTemaPersona();
  const router = useRouter();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { data: surat, isPending, isError, isRefetching, refetch } = useDetailPengesahan(id);
  const lihatDokumen = useLihatDokumenPengesahan(id);

  return (
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: DESAIN_PREMIUM.latarLayar }]} edges={['top', 'bottom']}>
      <KepalaLayar judul={surat?.number ?? 'Pengesahan'} />
      {isPending ? (
        <ActivityIndicator style={tw`mt-16`} color={warna.utamaKuat} />
      ) : !surat ? (
        <EmptyState
          ikon={AlertTriangle}
          judul={isError ? 'Gagal memuat surat' : 'Surat tidak ditemukan'}
          pesan={isError ? 'Periksa koneksi lalu coba lagi.' : 'Surat ini tidak ditujukan kepada Anda.'}
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

import { Info } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, Text, View } from 'react-native';
import tw from 'twrnc';

import { STATUS_TIKET_DITUTUP } from '@/constants/tiketPelanggan';
import { useTutupTiketPelanggan } from '@/hooks/queries/useTiketPelanggan';
import type { DetailTiket } from '@/types/portalPelanggan';
import { presentSuccessMessage } from '@/utils/errorPresenter';

import { KepalaTiket } from './KepalaTiket';
import { KotakBalasTiket } from './KotakBalasTiket';
import { ModalTutupTiket } from './ModalTutupTiket';
import { PercakapanTiket } from './PercakapanTiket';

const UKURAN_IKON_INFO = 18;
/** gray-500 */
const WARNA_IKON_INFO = '#6b7280';
/** teal-600 */
const WARNA_SEGARKAN = '#0d9488';

interface TampilanDetailTiketProps {
  tiket: DetailTiket;
  isMenyegarkan: boolean;
  onSegarkan: () => void;
}

/** Tiket yang sudah dimuat: kepala, percakapan, lalu kotak balas — atau keterangan bila sudah ditutup. */
export function TampilanDetailTiket({ tiket, isMenyegarkan, onSegarkan }: TampilanDetailTiketProps) {
  const gulir = useRef<ScrollView>(null);
  const [isModalTutup, setIsModalTutup] = useState(false);
  const tutup = useTutupTiketPelanggan(tiket.id, (pesan) => {
    setIsModalTutup(false);
    presentSuccessMessage(pesan ?? 'Tiket berhasil ditutup');
  });
  const isDitutup = tiket.status === STATUS_TIKET_DITUTUP;

  return (
    <KeyboardAvoidingView style={tw`flex-1`} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <KepalaTiket tiket={tiket} onTutupTiket={() => setIsModalTutup(true)} />
      <ScrollView
        ref={gulir}
        contentContainerStyle={tw`p-4`}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => gulir.current?.scrollToEnd({ animated: false })}
        refreshControl={<RefreshControl refreshing={isMenyegarkan} onRefresh={onSegarkan} tintColor={WARNA_SEGARKAN} />}
      >
        <PercakapanTiket tiket={tiket} />
      </ScrollView>
      {isDitutup ? (
        <View style={tw`flex-row items-center p-4 bg-gray-50 border-t border-gray-200`}>
          <Info size={UKURAN_IKON_INFO} color={WARNA_IKON_INFO} />
          <Text style={tw`text-sm text-gray-500 ml-2`}>Tiket ini sudah ditutup</Text>
        </View>
      ) : (
        <KotakBalasTiket idTiket={tiket.id} status={tiket.status} />
      )}
      <ModalTutupTiket
        isTerlihat={isModalTutup}
        isMenutup={tutup.isPending}
        onBatal={() => setIsModalTutup(false)}
        onTutup={(muatan) => tutup.mutate(muatan)}
      />
    </KeyboardAvoidingView>
  );
}

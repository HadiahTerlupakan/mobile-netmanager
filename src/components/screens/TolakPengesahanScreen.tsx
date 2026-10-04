import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { KepalaLayar } from '@/components/molecules/KepalaLayar';
import { FormTolakPengesahan } from '@/components/organisms/pengesahan/FormTolakPengesahan';
import { DESAIN_PREMIUM } from '@/theme';

/** Layar alasan menolak surat; setelah terkirim kembali ke detail surat. */
export function TolakPengesahanScreen() {
  const router = useRouter();
  const { id = '' } = useLocalSearchParams<{ id: string }>();

  return (
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: DESAIN_PREMIUM.latarLayar }]} edges={['top', 'bottom']}>
      <KepalaLayar judul="Tolak surat" />
      <KeyboardAvoidingView style={tw`flex-1`} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <FormTolakPengesahan id={id} onSelesai={() => router.back()} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

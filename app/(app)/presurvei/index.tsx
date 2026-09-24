import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { PilihanChip } from '@/components/molecules/PilihanChip';
import { TabKegiatan } from '@/components/organisms/presurvei/TabKegiatan';
import { TabProspek } from '@/components/organisms/presurvei/TabProspek';
import { AppFeature } from '@/constants/features';
import { useSegarkanPresurveiSetelahSinkron } from '@/hooks/queries/usePresurveiKegiatan';
import { useFeatureGuard } from '@/hooks/useFeatureGuard';

type SubTabPresurvei = 'kegiatan' | 'prospek';

const OPSI_SUB_TAB: { nilai: SubTabPresurvei; label: string }[] = [
  { nilai: 'kegiatan', label: 'Kegiatan' },
  { nilai: 'prospek', label: 'Prospek' },
];

/** Tab Presurvei: sub-tab Kegiatan dan Prospek milik sendiri. */
export default function PresurveiScreen() {
  useFeatureGuard(AppFeature.PRESURVEI);
  useSegarkanPresurveiSetelahSinkron();
  const [subTab, setSubTab] = useState<SubTabPresurvei>('kegiatan');

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={['top']}>
      <Text style={tw`text-xl font-bold text-gray-900 px-4 pt-4 pb-2`}>Presurvei</Text>
      <View style={tw`px-4 mb-3`}>
        <PilihanChip opsi={OPSI_SUB_TAB} terpilih={subTab} onPilih={setSubTab} />
      </View>
      {subTab === 'kegiatan' ? <TabKegiatan /> : <TabProspek />}
    </SafeAreaView>
  );
}

import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { PilihanChip } from '@/components/molecules/PilihanChip';
import { TabKegiatan } from '@/components/organisms/presurvei/TabKegiatan';
import { TabProspek } from '@/components/organisms/presurvei/TabProspek';
import { TabRencana } from '@/components/organisms/presurvei/TabRencana';
import { AppFeature } from '@/constants/features';
import type { FokusTimRencana } from '@/hooks/presurvei/useTampilanRencana';
import { useSegarkanPresurveiSetelahSinkron } from '@/hooks/queries/usePresurveiKegiatan';
import { useFeatureGuard } from '@/hooks/useFeatureGuard';

type SubTabPresurvei = 'kegiatan' | 'rencana' | 'prospek';

/**
 * Rencana di posisi kedua: Kegiatan tetap sub-tab bawaan (tombol Catat
 * Kegiatan satu ketukan dari tab), sedangkan rencana hari ini sudah tampil di
 * Beranda dan penugasan dibuka lewat notifikasi.
 */
const OPSI_SUB_TAB: { nilai: SubTabPresurvei; label: string }[] = [
  { nilai: 'kegiatan', label: 'Kegiatan' },
  { nilai: 'rencana', label: 'Rencana' },
  { nilai: 'prospek', label: 'Prospek' },
];

/** Param `ruteTimRencana`: buka sub-tab Rencana tampilan Tim. */
type ParamPresurvei = {
  subTab?: string;
  salesId?: string;
  diminta?: string;
};

/** Permintaan tampilan Tim dari param rute, atau null bila tab dibuka biasa. */
function useFokusTimDariParam(): FokusTimRencana | null {
  const { subTab, salesId, diminta } = useLocalSearchParams<ParamPresurvei>();
  return useMemo(
    () => (subTab === 'rencana' && diminta ? { salesId: salesId || null, kunci: diminta } : null),
    [subTab, salesId, diminta],
  );
}

/** Tab Presurvei: sub-tab Kegiatan, Rencana kunjungan, dan Prospek milik sendiri. */
export default function PresurveiScreen() {
  useFeatureGuard(AppFeature.PRESURVEI);
  useSegarkanPresurveiSetelahSinkron();
  const [subTab, setSubTab] = useState<SubTabPresurvei>('kegiatan');
  const fokusParam = useFokusTimDariParam();
  // Disalin ke state supaya bisa dilepas saat pindah sub-tab: kembali ke
  // Rencana setelahnya membuka tampilan bawaan, bukan mengulang permintaan lama.
  const [fokusTim, setFokusTim] = useState<FokusTimRencana | null>(null);

  useEffect(() => {
    if (fokusParam === null) return;
    setSubTab('rencana');
    setFokusTim(fokusParam);
  }, [fokusParam]);

  const pilihSubTab = (tujuan: SubTabPresurvei) => {
    setSubTab(tujuan);
    setFokusTim(null);
  };

  const renderKonten = () => {
    if (subTab === 'rencana') return <TabRencana fokusTim={fokusTim} />;
    return subTab === 'kegiatan' ? <TabKegiatan /> : <TabProspek />;
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={['top']}>
      <Text style={tw`text-xl font-bold text-gray-900 px-4 pt-4 pb-2`}>Presurvei</Text>
      <View style={tw`px-4 mb-3`}>
        <PilihanChip opsi={OPSI_SUB_TAB} terpilih={subTab} onPilih={pilihSubTab} />
      </View>
      {renderKonten()}
    </SafeAreaView>
  );
}

import React from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { useMutation } from '@/hooks/queries';
import api from '@/services/api';
import { presentAppError, presentSuccessMessage } from '@/utils/errorPresenter';

/** Target canvasing bila server belum mengirimkannya (perilaku lama Beranda). */
const TARGET_CANVASING_BAWAAN = 30;
const PERSEN_PENUH = 100;

/** Bagian statistik Beranda (`/api/mobile/dashboard`) yang dibaca kartu ini. */
export interface StatistikPencairanCanvasing {
  unclaimedCanvasing?: number;
  canvasingTarget?: number;
  targetSchema?: 'MONTHLY_RESET' | 'ACCUMULATED';
}

interface KartuPencairanCanvasingProps {
  statistik: StatistikPencairanCanvasing | undefined;
  onBerhasilCair: () => void;
}

/** Apakah bonus belum diklaim sudah mencapai target sehingga boleh dicairkan. */
function isTargetTercapai(statistik: StatistikPencairanCanvasing | undefined): boolean {
  const belumDiklaim = statistik?.unclaimedCanvasing;
  const target = statistik?.canvasingTarget;
  return belumDiklaim !== undefined && !!target && belumDiklaim >= target;
}

/** Pencairan bonus (finansial) → plain useMutation, tanpa offline-queue. */
function useCairkanBonusCanvasing(onBerhasilCair: () => void) {
  return useMutation({
    mutationFn: () => api.post('/api/marketing/claims/cashout'),
    onSuccess: () => {
      presentSuccessMessage('Bonus canvasing berhasil dicairkan! Saldo akan direset menjadi 0.');
      onBerhasilCair();
    },
    onError: (error) => {
      presentAppError(error, { screen: 'DashboardScreen', route: '/(app)/dashboard', fallbackTitle: 'Gagal' });
    },
  });
}

/** Kartu target canvasing dan tombol pencairan bonus (skema akumulasi). */
export function KartuPencairanCanvasing({ statistik, onBerhasilCair }: KartuPencairanCanvasingProps) {
  const pencairan = useCairkanBonusCanvasing(onBerhasilCair);
  const isAkumulasi = statistik?.targetSchema === 'ACCUMULATED';
  const isTercapai = isTargetTercapai(statistik);
  const belumDiklaim = statistik?.unclaimedCanvasing || 0;
  const target = statistik?.canvasingTarget || TARGET_CANVASING_BAWAAN;

  const konfirmasiCairkan = () => {
    Alert.alert(
      'Konfirmasi Pencairan',
      `Anda memiliki ${belumDiklaim} bonus canvasing yang siap dicairkan. Yakin ingin mencairkan semuanya sekarang?`,
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Cairkan', onPress: () => pencairan.mutate() },
      ],
    );
  };

  return (
    <View style={tw`mx-4 mb-4 bg-white rounded-2xl p-5 shadow-sm border border-gray-100`}>
      <View style={tw`flex-row justify-between items-center mb-3`}>
        <Text style={tw`text-base font-bold text-gray-900`}>Target & Pencairan</Text>
        <View style={tw`px-2 py-1 rounded-md ${isAkumulasi ? 'bg-amber-50' : 'bg-blue-50'}`}>
          <Text style={tw`text-[10px] font-bold ${isAkumulasi ? 'text-amber-600' : 'text-blue-600'}`}>
            {isAkumulasi ? 'AKUMULASI' : 'BULANAN'}
          </Text>
        </View>
      </View>

      <View style={tw`flex-row justify-between items-center mb-2`}>
        <Text style={tw`text-sm text-gray-600`}>{isAkumulasi ? 'Progress Pencairan' : 'Progress Bulan Ini'}</Text>
        <Text style={tw`text-sm font-bold ${isTercapai ? 'text-emerald-600' : 'text-blue-600'}`}>
          {belumDiklaim} / {target}
        </Text>
      </View>
      <View style={tw`h-2 bg-gray-100 rounded-full overflow-hidden mb-4`}>
        <View
          style={[
            { width: `${Math.min((belumDiklaim / target) * PERSEN_PENUH, PERSEN_PENUH)}%` },
            tw`h-full ${isTercapai ? 'bg-emerald-500' : 'bg-blue-500'}`,
          ]}
        />
      </View>

      {isAkumulasi ? (
        <TouchableOpacity
          disabled={!isTercapai}
          onPress={konfirmasiCairkan}
          style={tw`w-full py-3 rounded-xl items-center justify-center ${isTercapai ? 'bg-emerald-600' : 'bg-gray-200'}`}
          accessibilityLabel="Cairkan komisi"
          accessibilityRole="button"
        >
          <Text style={tw`font-bold ${isTercapai ? 'text-white' : 'text-gray-400'}`}>Cairkan Bonus Belum Diklaim</Text>
        </TouchableOpacity>
      ) : (
        <View style={tw`bg-blue-50 p-3 rounded-xl`}>
          <Text style={tw`text-xs text-blue-700 text-center leading-4`}>
            Target Anda direset otomatis setiap awal bulan. Bonus akan diproses langsung oleh Admin.
          </Text>
        </View>
      )}
    </View>
  );
}

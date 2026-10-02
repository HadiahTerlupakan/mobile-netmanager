import React from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { Coins } from 'lucide-react-native';

import { BilahKemajuan } from '@/components/molecules/BilahKemajuan';
import { KartuBagian, LencanaJudul } from '@/components/molecules/KartuBagian';
import { GAYA_ANGKA_TABULAR, useTemaPersona } from '@/theme';

import { useMutation } from '@/hooks/queries';
import api from '@/services/api';
import { presentAppError, presentSuccessMessage } from '@/utils/errorPresenter';

/** Target canvasing bila server belum mengirimkannya (perilaku lama Beranda). */
const TARGET_CANVASING_BAWAAN = 30;
const PERSEN_PENUH = 100;
/** Hijau makna "target tercapai" (bukan warna identitas persona). */
const WARNA_TERCAPAI = '#059669';

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
  const { tw, warna } = useTemaPersona();
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

  const persen = Math.min((belumDiklaim / target) * PERSEN_PENUH, PERSEN_PENUH);
  return (
    <View style={tw`mx-4`}>
      <KartuBagian
        judul="Bonus canvasing"
        ikon={Coins}
        kanan={<LencanaJudul teks={isAkumulasi ? 'Akumulasi' : 'Bulanan'} nada={isAkumulasi ? 'peringatan' : 'netral'} />}
      >
        <View style={tw`flex-row justify-between items-baseline mb-1.5`}>
          <Text style={tw`text-sm text-slate-600`}>{isAkumulasi ? 'Poin siap dicairkan' : 'Poin bulan ini'}</Text>
          <Text style={[tw`text-sm font-bold ${isTercapai ? 'text-emerald-600' : 'text-slate-900'}`, GAYA_ANGKA_TABULAR]}>
            {belumDiklaim} / {target}
          </Text>
        </View>
        <BilahKemajuan
          persen={persen}
          warnaIsi={isTercapai ? WARNA_TERCAPAI : warna.utama}
          warnaLatar={warna.utamaSangatMuda}
        />

        {isAkumulasi ? (
          <TouchableOpacity
            disabled={!isTercapai}
            onPress={konfirmasiCairkan}
            style={tw`w-full py-3 mt-4 rounded-xl items-center justify-center ${isTercapai ? 'bg-emerald-600' : 'bg-slate-100'}`}
            accessibilityLabel="Cairkan komisi"
            accessibilityRole="button"
          >
            <Text style={tw`font-bold ${isTercapai ? 'text-white' : 'text-slate-400'}`}>Cairkan Bonus Belum Diklaim</Text>
          </TouchableOpacity>
        ) : (
          <Text style={tw`text-xs text-slate-500 mt-3 leading-4`}>
            Poin direset otomatis setiap awal bulan. Bonus diproses langsung oleh admin.
          </Text>
        )}
      </KartuBagian>
    </View>
  );
}

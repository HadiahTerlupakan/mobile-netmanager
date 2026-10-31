import { Info } from 'lucide-react-native';
import React, { useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import tw from 'twrnc';

import { useAjukanUpgradePaket, useBatalkanUpgradePaket } from '@/hooks/queries/usePaketPelanggan';
import type { PaketPelanggan } from '@/types/portalPelanggan';
import { ALASAN_UPGRADE_BUTUH_AKTIF, idPilihanAwal, isBolehAjukanUpgrade } from '@/utils/paketPelanggan';

import { BilahAjukanUpgrade } from './BilahAjukanUpgrade';
import { KartuPaketSaatIni } from './KartuPaketSaatIni';
import { KartuPengajuanUpgrade } from './KartuPengajuanUpgrade';
import { KartuPilihanUpgrade } from './KartuPilihanUpgrade';

const UKURAN_IKON_KOSONG = 32;
/** gray-400 / teal-600 */
const WARNA_IKON_KOSONG = '#9ca3af';
const WARNA_SEGARKAN = '#0d9488';

interface TampilanUpgradePaketProps {
  paket: PaketPelanggan;
  isMenyegarkan: boolean;
  onSegarkan: () => void;
}

/** Tidak ada paket yang lebih tinggi di lokasi layanan pelanggan. */
function TanpaPilihanUpgrade() {
  return (
    <View style={tw`items-center rounded-xl border border-dashed border-gray-300 bg-white p-8`}>
      <Info size={UKURAN_IKON_KOSONG} color={WARNA_IKON_KOSONG} />
      <Text style={tw`mt-3 font-bold text-gray-900`}>Belum ada paket upgrade</Text>
      <Text style={tw`mt-1 text-sm text-gray-500 text-center`}>
        Saat ini tidak ada paket dengan harga di atas paket Anda di lokasi layanan ini.
      </Text>
    </View>
  );
}

/** Pengganti bilah ajukan selama layanan tidak aktif; server akan menolak pengajuannya. */
function KeteranganUpgradeTertutup() {
  return (
    <View style={tw`bg-white border-t border-gray-200 p-4`}>
      <Text style={tw`text-sm text-gray-600 text-center`}>{ALASAN_UPGRADE_BUTUH_AKTIF}</Text>
    </View>
  );
}

/** Paket saat ini, pengajuan yang menunggu, pilihan upgrade, dan bilah ajukan. */
export function TampilanUpgradePaket({ paket, isMenyegarkan, onSegarkan }: TampilanUpgradePaketProps) {
  const ajukan = useAjukanUpgradePaket();
  const batalkan = useBatalkanUpgradePaket();
  const [idDipilih, setIdDipilih] = useState<string | null>(null);
  const pilihan = paket.upgradeOptions;
  const idAktif = idDipilih ?? idPilihanAwal(pilihan);
  const pilihanAktif = pilihan.find((item) => item.id === idAktif);
  const isBolehAjukan = isBolehAjukanUpgrade(paket.subscription.status);

  return (
    <View style={tw`flex-1`}>
      <ScrollView
        contentContainerStyle={tw`p-4 pb-8`}
        refreshControl={<RefreshControl refreshing={isMenyegarkan} onRefresh={onSegarkan} tintColor={WARNA_SEGARKAN} />}
      >
        <KartuPaketSaatIni paket={paket} />
        {paket.pendingUpgrade ? (
          <KartuPengajuanUpgrade pengajuan={paket.pendingUpgrade} isMembatalkan={batalkan.isPending} onBatalkan={() => batalkan.mutate()} />
        ) : null}
        <Text style={tw`text-xl font-bold text-gray-900 mt-6`}>Pilihan Upgrade</Text>
        <Text style={tw`text-sm text-gray-500 mb-3`}>Paket yang tersedia di lokasi layanan Anda.</Text>
        {pilihan.length === 0 ? <TanpaPilihanUpgrade /> : null}
        {pilihan.map((item) => (
          <KartuPilihanUpgrade key={item.id} pilihan={item} isTerpilih={item.id === idAktif} onPilih={() => setIdDipilih(item.id)} />
        ))}
      </ScrollView>
      {pilihanAktif && !paket.pendingUpgrade && !isBolehAjukan ? <KeteranganUpgradeTertutup /> : null}
      {pilihanAktif && !paket.pendingUpgrade && isBolehAjukan ? (
        <BilahAjukanUpgrade pilihan={pilihanAktif} isMengajukan={ajukan.isPending} onAjukan={() => ajukan.mutate(pilihanAktif.id)} />
      ) : null}
    </View>
  );
}

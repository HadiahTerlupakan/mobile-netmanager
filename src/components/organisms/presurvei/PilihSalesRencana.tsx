import { ChevronDown } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import tw from 'twrnc';

import { KartuFormulir } from '@/components/atoms/KartuFormulir';
import { TeksKesalahan } from '@/components/atoms/TeksKesalahan';
import type { PemilihSalesRencana } from '@/hooks/presurvei/useLayarFormRencana';
import { labelAnggotaTim } from '@/utils/presurvei/timRencana';
import { AvatarAnggota } from './AvatarAnggota';
import { PilihAnggotaTimModal } from './PilihAnggotaTimModal';

const UKURAN_IKON = 16;
const WARNA_IKON = '#6b7280';

interface PilihSalesRencanaProps {
  sales: PemilihSalesRencana;
}

/** Blok "Sales" di layar Tugaskan: medan pilih yang membuka pemilih anggota bercari; memuat, gagal, atau kosong. */
export function PilihSalesRencana({ sales }: PilihSalesRencanaProps) {
  const [isTerbuka, setTerbuka] = useState(false);

  const renderIsi = () => {
    if (sales.daftar === undefined) {
      if (!sales.isGagal) return <ActivityIndicator />;
      return (
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Muat ulang daftar sales" onPress={sales.cobaLagi}>
          <Text style={tw`text-sm text-red-700`}>Daftar sales gagal dimuat. Ketuk untuk coba lagi.</Text>
        </TouchableOpacity>
      );
    }
    if (sales.daftar.length === 0) {
      return <Text style={tw`text-sm text-gray-500`}>Belum ada sales di tim Anda.</Text>;
    }
    const terpilih = sales.daftar.find((item) => item.id === sales.terpilih);
    const label = terpilih ? labelAnggotaTim(terpilih, sales.penggunaId) : null;
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Pilih sales"
        accessibilityValue={{ text: label ?? 'Belum dipilih' }}
        onPress={() => setTerbuka(true)}
        style={tw`flex-row items-center bg-white border ${
          sales.kesalahan ? 'border-red-400' : 'border-gray-300'
        } rounded-xl px-3 py-3`}
      >
        {terpilih ? <AvatarAnggota nama={terpilih.nama} ukuran="kecil" /> : null}
        <Text style={tw`flex-1 ${label ? 'text-gray-900' : 'text-gray-400'}`} numberOfLines={1}>
          {label ?? 'Ketuk untuk memilih sales'}
        </Text>
        <ChevronDown size={UKURAN_IKON} color={WARNA_IKON} />
      </TouchableOpacity>
    );
  };

  return (
    <KartuFormulir>
      <Text style={tw`font-bold text-gray-900 mb-2`}>Sales</Text>
      {renderIsi()}
      <TeksKesalahan pesan={sales.kesalahan} />
      {isTerbuka && sales.daftar ? (
        <PilihAnggotaTimModal
          judul="Pilih Sales"
          daftar={sales.daftar}
          terpilih={sales.terpilih}
          penggunaId={sales.penggunaId}
          isBolehSemua={false}
          onPilih={(salesId) => {
            if (salesId !== null) sales.pilih(salesId);
          }}
          onTutup={() => setTerbuka(false)}
        />
      ) : null}
    </KartuFormulir>
  );
}

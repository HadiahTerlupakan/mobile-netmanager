import React from 'react';
import { View } from 'react-native';
import tw from 'twrnc';

import { KartuFormulir } from '@/components/atoms/KartuFormulir';
import { IsianTeks } from '@/components/molecules/IsianTeks';
import { JudulIsian } from '@/components/molecules/JudulIsian';
import { TombolPilihanBesar } from '@/components/molecules/TombolPilihanBesar';
import {
  OPSI_SUMBER_PROSPEK,
  isButuhNamaPengenal,
  type SumberProspekFormulir,
} from '@/utils/presurvei/formProspek';
import { PANJANG_NAMA_REFERRAL_MAKS } from '@/utils/presurvei/isianProspek';

const JUMLAH_KOLOM_SUMBER = 2;

interface BagianSumberProspekProps {
  sumber: SumberProspekFormulir;
  referralNama: string;
  kesalahanReferral?: string;
  onPilihSumber: (sumber: SumberProspekFormulir) => void;
  onUbahReferral: (nama: string) => void;
}

/** "Kenal dari mana?" sebagai tombol besar; "Dikenalkan orang lain" meminta nama pengenalnya. */
export function BagianSumberProspek(props: BagianSumberProspekProps) {
  const { sumber, referralNama, kesalahanReferral, onPilihSumber, onUbahReferral } = props;
  return (
    <KartuFormulir>
      <JudulIsian judul="Kenal dari mana?" isWajib petunjuk="Ketuk salah satu." />
      <TombolPilihanBesar
        opsi={OPSI_SUMBER_PROSPEK}
        terpilih={sumber}
        onPilih={onPilihSumber}
        jumlahKolom={JUMLAH_KOLOM_SUMBER}
      />
      {isButuhNamaPengenal(sumber) ? (
        <View style={tw`mt-4`}>
          <JudulIsian judul="Nama yang mengenalkan" isWajib />
          <IsianTeks
            label="Nama yang mengenalkan"
            isLabelTersembunyi
            nilai={referralNama}
            kesalahan={kesalahanReferral}
            maxLength={PANJANG_NAMA_REFERRAL_MAKS}
            placeholder="Contoh: Bu Siti, tetangga sebelah"
            onUbah={onUbahReferral}
          />
        </View>
      ) : null}
    </KartuFormulir>
  );
}

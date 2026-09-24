import React from 'react';
import { Text } from 'react-native';
import tw from 'twrnc';

import { KartuFormulir } from '@/components/atoms/KartuFormulir';
import { IsianTeks } from '@/components/molecules/IsianTeks';
import type { KesalahanFormKegiatan, NilaiFormKegiatan } from '@/utils/presurvei/formKegiatan';

interface IsianDataTeknisProps {
  nilai: Pick<NilaiFormKegiatan, 'odpTerdekat' | 'estimasiKabel' | 'catatanTeknis'>;
  kesalahan: KesalahanFormKegiatan;
  onUbah: (perubahan: Partial<NilaiFormKegiatan>) => void;
}

/** Data teknis yang hanya berlaku untuk survei lokasi. */
export function IsianDataTeknis({ nilai, kesalahan, onUbah }: IsianDataTeknisProps) {
  return (
    <KartuFormulir>
      <Text style={tw`font-bold text-gray-900 mb-2`}>Data teknis survei</Text>
      <IsianTeks
        label="ODP terdekat"
        nilai={nilai.odpTerdekat}
        kesalahan={kesalahan.odpTerdekat}
        onUbah={(isian) => onUbah({ odpTerdekat: isian })}
      />
      <IsianTeks
        label="Estimasi kabel (meter)"
        nilai={nilai.estimasiKabel}
        kesalahan={kesalahan.estimasiKabel}
        keyboardType="number-pad"
        onUbah={(isian) => onUbah({ estimasiKabel: isian })}
      />
      <IsianTeks
        label="Catatan teknis"
        nilai={nilai.catatanTeknis}
        kesalahan={kesalahan.catatanTeknis}
        multiline
        onUbah={(isian) => onUbah({ catatanTeknis: isian })}
      />
    </KartuFormulir>
  );
}

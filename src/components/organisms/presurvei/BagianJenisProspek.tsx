import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import { KartuFormulir } from '@/components/atoms/KartuFormulir';
import { IsianTeks } from '@/components/molecules/IsianTeks';
import { JudulIsian } from '@/components/molecules/JudulIsian';
import { TombolPilihanBesar } from '@/components/molecules/TombolPilihanBesar';
import type { ProspekJenis } from '@/constants/presurvei';
import {
  OPSI_JENIS_PROSPEK,
  OPSI_PERAN_PERANTARA,
  batasKeteranganPeran,
  isPeranDitulisSendiri,
  isPerantara,
  type PilihanPeran,
} from '@/utils/presurvei/jenisProspek';

const JUMLAH_KOLOM_JENIS = 2;
const JUMLAH_KOLOM_PERAN = 2;

interface BagianJenisProspekProps {
  jenis: ProspekJenis;
  peranPilihan: PilihanPeran | null;
  peranKeterangan: string;
  kesalahanPeranPilihan?: string;
  kesalahanPeranKeterangan?: string;
  onPilihJenis: (jenis: ProspekJenis) => void;
  onPilihPeran: (pilihan: PilihanPeran) => void;
  onUbahKeterangan: (keterangan: string) => void;
}

interface IsianKeteranganPeranProps {
  pilihan: PilihanPeran | null;
  keterangan: string;
  kesalahan?: string;
  onUbah: (keterangan: string) => void;
}

/**
 * Keterangan peran: wajib dan menjadi perannya sendiri untuk "Lainnya";
 * selain itu hanya pelengkap (mis. nomor RT) yang boleh dikosongkan.
 */
function IsianKeteranganPeran({ pilihan, keterangan, kesalahan, onUbah }: IsianKeteranganPeranProps) {
  const isDitulisSendiri = isPeranDitulisSendiri(pilihan);
  const judul = isDitulisSendiri ? 'Tulis perannya' : 'Keterangan';
  return (
    <View style={tw`mt-4`}>
      <JudulIsian
        judul={judul}
        isWajib={isDitulisSendiri}
        petunjuk={isDitulisSendiri ? undefined : 'Misalnya nomor RT atau nama kampungnya.'}
      />
      <IsianTeks
        label={judul}
        isLabelTersembunyi
        nilai={keterangan}
        kesalahan={kesalahan}
        maxLength={batasKeteranganPeran(pilihan)}
        placeholder={isDitulisSendiri ? 'Contoh: Ketua karang taruna' : 'Contoh: RT 03 Kel. Melati'}
        onUbah={onUbah}
      />
    </View>
  );
}

/**
 * "Orang ini siapa?": calon pelanggan atau perantara. Perantara wajib
 * memilih perannya (tombol besar) dengan keterangan tambahan.
 */
export function BagianJenisProspek(props: BagianJenisProspekProps) {
  const { jenis, peranPilihan, peranKeterangan, onPilihJenis, onPilihPeran, onUbahKeterangan } = props;
  return (
    <>
      <KartuFormulir>
        <JudulIsian judul="Orang ini siapa?" isWajib petunjuk="Ketuk salah satu." />
        <TombolPilihanBesar
          opsi={OPSI_JENIS_PROSPEK}
          terpilih={jenis}
          onPilih={onPilihJenis}
          jumlahKolom={JUMLAH_KOLOM_JENIS}
        />
      </KartuFormulir>
      {isPerantara(jenis) ? (
        <KartuFormulir>
          <JudulIsian judul="Perannya apa?" isWajib petunjuk="Ketuk salah satu." />
          <TombolPilihanBesar
            opsi={OPSI_PERAN_PERANTARA}
            terpilih={peranPilihan}
            onPilih={onPilihPeran}
            jumlahKolom={JUMLAH_KOLOM_PERAN}
          />
          {props.kesalahanPeranPilihan ? (
            <Text accessibilityLiveRegion="polite" style={tw`text-red-600 text-sm mt-2`}>{props.kesalahanPeranPilihan}</Text>
          ) : null}
          {peranPilihan !== null ? (
            <IsianKeteranganPeran
              pilihan={peranPilihan}
              keterangan={peranKeterangan}
              kesalahan={props.kesalahanPeranKeterangan}
              onUbah={onUbahKeterangan}
            />
          ) : null}
        </KartuFormulir>
      ) : null}
    </>
  );
}

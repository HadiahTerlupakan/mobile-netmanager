import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import { TeksKesalahan } from '@/components/atoms/TeksKesalahan';
import { IsianTeks } from '@/components/molecules/IsianTeks';
import { PilihanChip } from '@/components/molecules/PilihanChip';
import { KEGIATAN_HASIL, LABEL_HASIL_KEGIATAN, LABEL_JENIS_KEGIATAN } from '@/constants/presurvei';
import type { FormKegiatan } from '@/hooks/presurvei/useFormKegiatan';
import type { LokasiKegiatan } from '@/hooks/presurvei/useLokasiKegiatan';
import { daftarJenisDitawarkan, isButuhDataTeknis, isButuhLokasi } from '@/utils/presurvei/aturanPresurvei';
import { BlokFotoBukti } from './BlokFotoBukti';
import { BlokLokasiGps } from './BlokLokasiGps';
import { BlokProspekKegiatan } from './BlokProspekKegiatan';
import { IsianDataTeknis } from './IsianDataTeknis';

const OPSI_JENIS = daftarJenisDitawarkan().map((jenis) => ({ nilai: jenis, label: LABEL_JENIS_KEGIATAN[jenis] }));
const OPSI_HASIL = KEGIATAN_HASIL.map((hasil) => ({ nilai: hasil, label: LABEL_HASIL_KEGIATAN[hasil] }));

interface FormCatatKegiatanProps {
  form: FormKegiatan;
  lokasi: LokasiKegiatan;
  namaProspek: string | null;
  onBukaKamera: () => void;
  onBukaPilihProspek: () => void;
  onLepasProspek: () => void;
}

/**
 * Isi form catat kegiatan dalam satu halaman; blok GPS/foto hanya untuk
 * kegiatan lapangan dan data teknis hanya untuk survei lokasi.
 */
export function FormCatatKegiatan(props: FormCatatKegiatanProps) {
  const { form, lokasi, namaProspek, onBukaKamera, onBukaPilihProspek, onLepasProspek } = props;
  const { nilai, kesalahan, ubah } = form;
  const isLapangan = nilai.jenis !== null && isButuhLokasi(nilai.jenis);
  const isSurvei = nilai.jenis !== null && isButuhDataTeknis(nilai.jenis);
  return (
    <View>
      <Text style={tw`font-bold text-gray-900 mb-2`}>Jenis kegiatan</Text>
      <PilihanChip opsi={OPSI_JENIS} terpilih={nilai.jenis} onPilih={(jenis) => ubah({ jenis })} />
      <TeksKesalahan pesan={kesalahan.jenis} />
      <View style={tw`h-4`} />
      {isLapangan ? (
        <View>
          <BlokLokasiGps status={lokasi.status} titik={lokasi.titik} kesalahan={kesalahan.lokasi} onCobaLagi={lokasi.cari} />
          <BlokFotoBukti fotoLokal={form.fotoLokal} kesalahan={kesalahan.foto} onTambah={onBukaKamera} onHapus={form.hapusFoto} />
        </View>
      ) : null}
      <Text style={tw`font-bold text-gray-900 mb-2`}>Hasil</Text>
      <PilihanChip opsi={OPSI_HASIL} terpilih={nilai.hasil} onPilih={(hasil) => ubah({ hasil })} />
      <TeksKesalahan pesan={kesalahan.hasil} />
      <View style={tw`h-4`} />
      <IsianTeks label={isLapangan ? 'Yang ditemui' : 'Yang dihubungi'} nilai={nilai.ditemuiNama} kesalahan={kesalahan.ditemuiNama} onUbah={(isian) => ubah({ ditemuiNama: isian })} />
      {isLapangan ? <IsianTeks label="Alamat" nilai={nilai.alamat} kesalahan={kesalahan.alamat} onUbah={(isian) => ubah({ alamat: isian })} /> : null}
      <IsianTeks label="Catatan" nilai={nilai.catatan} kesalahan={kesalahan.catatan} multiline onUbah={(isian) => ubah({ catatan: isian })} />
      {isSurvei ? <IsianDataTeknis nilai={nilai} kesalahan={kesalahan} onUbah={ubah} /> : null}
      <BlokProspekKegiatan
        nilai={nilai}
        namaProspek={namaProspek}
        kesalahan={kesalahan}
        onBukaPilih={onBukaPilihProspek}
        onLepas={onLepasProspek}
        onUbah={ubah}
        onUbahProspekBaru={form.ubahProspekBaru}
      />
    </View>
  );
}

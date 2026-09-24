import React from 'react';
import { Switch, Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { KartuFormulir } from '@/components/atoms/KartuFormulir';
import { IsianTeks } from '@/components/molecules/IsianTeks';
import { isBolehProspekBaru } from '@/utils/presurvei/aturanPresurvei';
import type {
  IsianProspekBaru,
  KesalahanFormKegiatan,
  NilaiFormKegiatan,
} from '@/utils/presurvei/formKegiatan';

interface BlokProspekKegiatanProps {
  nilai: NilaiFormKegiatan;
  namaProspek: string | null;
  kesalahan: KesalahanFormKegiatan;
  onBukaPilih: () => void;
  onLepas: () => void;
  onUbah: (perubahan: Partial<NilaiFormKegiatan>) => void;
  onUbahProspekBaru: (perubahan: Partial<IsianProspekBaru>) => void;
}

/**
 * Tautan prospek: follow-up prospek yang ada, atau buat prospek baru. Opsi
 * prospek baru hanya ditawarkan bila syarat server terpenuhi
 * (`isBolehProspekBaru`); di luar itu server membuangnya diam-diam.
 */
export function BlokProspekKegiatan(props: BlokProspekKegiatanProps) {
  const { nilai, namaProspek, kesalahan, onBukaPilih, onLepas, onUbah, onUbahProspekBaru } = props;
  const baru = nilai.prospekBaru;
  return (
    <KartuFormulir>
      <Text style={tw`font-bold text-gray-900 mb-2`}>Prospek</Text>
      {nilai.prospekId !== null ? (
        <View style={tw`flex-row items-center`}>
          <Text style={tw`flex-1 text-gray-900`}>{namaProspek ?? 'Prospek terpilih'}</Text>
          <TouchableOpacity accessibilityRole="button" onPress={onLepas}>
            <Text style={tw`text-red-600 font-semibold`}>Lepas</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          accessibilityRole="button"
          onPress={onBukaPilih}
          style={tw`border border-gray-300 rounded-xl py-3 items-center`}
        >
          <Text style={tw`text-gray-700`}>Pilih prospek (follow-up)</Text>
        </TouchableOpacity>
      )}
      {isBolehProspekBaru(nilai) ? (
        <View style={tw`mt-3`}>
          <View style={tw`flex-row items-center justify-between mb-2`}>
            <Text style={tw`text-gray-900`}>Buat prospek baru</Text>
            <Switch
              accessibilityLabel="Buat prospek baru"
              value={nilai.isBuatProspekBaru}
              onValueChange={(isBuat) => onUbah({ isBuatProspekBaru: isBuat })}
            />
          </View>
          {nilai.isBuatProspekBaru ? (
            <View>
              <IsianTeks label="Nama calon pelanggan" nilai={baru.nama} kesalahan={kesalahan.prospekBaruNama} onUbah={(isian) => onUbahProspekBaru({ nama: isian })} />
              <IsianTeks label="No. HP" nilai={baru.noTelp} kesalahan={kesalahan.prospekBaruNoTelp} keyboardType="phone-pad" onUbah={(isian) => onUbahProspekBaru({ noTelp: isian })} />
              <IsianTeks label="Alamat pemasangan" nilai={baru.alamat} kesalahan={kesalahan.prospekBaruAlamat} onUbah={(isian) => onUbahProspekBaru({ alamat: isian })} />
              <IsianTeks label="Paket diminati" nilai={baru.paketDiminati} kesalahan={kesalahan.prospekBaruPaket} onUbah={(isian) => onUbahProspekBaru({ paketDiminati: isian })} />
            </View>
          ) : null}
        </View>
      ) : null}
    </KartuFormulir>
  );
}

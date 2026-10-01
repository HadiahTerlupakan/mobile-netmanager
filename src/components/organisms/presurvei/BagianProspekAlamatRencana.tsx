import { MapPin, UserRound } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { useTemaPersona } from '@/theme';
import { KartuFormulir } from '@/components/atoms/KartuFormulir';
import { IsianTeks } from '@/components/molecules/IsianTeks';
import { ALAMAT_RENCANA_MAKS } from '@/constants/presurvei';
import type { FormRencana } from '@/hooks/presurvei/useFormRencana';
import { isJenisBeralamat } from '@/utils/presurvei/formRencana';
import { LencanaJenisProspek } from './LencanaJenisProspek';

const UKURAN_IKON = 20;
const BARIS_ISIAN_ALAMAT = 2;

interface BagianProspekAlamatRencanaProps {
  form: FormRencana;
  onBukaPilihProspek: () => void;
}

/** Kartu prospek: tombol pilih, atau nama terpilih (dengan lencana perantara) dan aksi Ganti/Lepas. */
function KartuProspek({ form, onBukaPilihProspek }: BagianProspekAlamatRencanaProps) {
  const { tw, warna } = useTemaPersona();
  const isAdaProspek = form.nilai.prospekId !== null;
  return (
    <KartuFormulir>
      <Text style={tw`font-bold text-gray-900`}>Prospek</Text>
      <Text style={tw`text-xs text-gray-500 mb-2`}>Boleh dikosongkan. Calon pelanggan atau perantara (ketua RT, tokoh, dll.)</Text>
      {isAdaProspek ? (
        <View style={tw`flex-row items-center bg-utama-sangat-muda border border-utama-garis rounded-xl p-3`}>
          <UserRound size={UKURAN_IKON} color={warna.utamaGelap} />
          <View style={tw`ml-3 flex-1`}>
            <Text style={tw`text-base font-semibold text-gray-900`} numberOfLines={1}>
              {form.namaProspek ?? 'Prospek terpilih'}
            </Text>
            {form.jenisProspek !== null ? <LencanaJenisProspek prospek={form.jenisProspek} /> : null}
          </View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Ganti prospek" onPress={onBukaPilihProspek} style={tw`px-2`}>
            <Text style={tw`text-utama-gelap font-semibold`}>Ganti</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Lepas prospek" onPress={form.lepasProspek} style={tw`pl-2`}>
            <Text style={tw`text-red-600 font-semibold`}>Lepas</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Pilih prospek"
          onPress={onBukaPilihProspek}
          style={tw`flex-row items-center justify-center border-2 border-dashed border-utama-pucat rounded-xl py-3`}
        >
          <UserRound size={UKURAN_IKON} color={warna.utamaGelap} />
          <Text style={tw`ml-2 text-base font-semibold text-utama-gelap`}>Pilih prospek</Text>
        </TouchableOpacity>
      )}
    </KartuFormulir>
  );
}

/** Kartu alamat tujuan; tombol "Pakai alamat …" bila prospek punya alamat lain. */
function KartuAlamat({ form }: Pick<BagianProspekAlamatRencanaProps, 'form'>) {
  const { tw, warna } = useTemaPersona();
  const { nilai, kesalahan, ubah, alamatProspek, namaProspek } = form;
  const isBolehPakaiAlamatProspek = alamatProspek !== null && alamatProspek !== nilai.alamat.trim();
  return (
    <KartuFormulir>
      <Text style={tw`font-bold text-gray-900`}>Alamat tujuan</Text>
      <Text style={tw`text-xs text-gray-500 mb-2`}>Boleh dikosongkan. Tulis nama jalan, nomor rumah, atau patokan.</Text>
      {isBolehPakaiAlamatProspek ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Pakai alamat prospek"
          onPress={() => ubah({ alamat: alamatProspek })}
          style={tw`flex-row items-center bg-utama-sangat-muda border border-utama-garis rounded-xl p-3 mb-3`}
        >
          <MapPin size={UKURAN_IKON} color={warna.utamaGelap} />
          <View style={tw`ml-3 flex-1`}>
            <Text style={tw`text-sm font-semibold text-utama-gelap`}>{`Pakai alamat ${namaProspek ?? 'prospek'}`}</Text>
            <Text style={tw`text-xs text-gray-600`} numberOfLines={2}>{alamatProspek}</Text>
          </View>
        </TouchableOpacity>
      ) : null}
      <IsianTeks
        label="Alamat tujuan"
        isLabelTersembunyi
        nilai={nilai.alamat}
        kesalahan={kesalahan.alamat}
        multiline
        jumlahBaris={BARIS_ISIAN_ALAMAT}
        maxLength={ALAMAT_RENCANA_MAKS}
        placeholder="Contoh: Jl. Melati No. 5, dekat masjid"
        onUbah={(alamat) => ubah({ alamat })}
      />
    </KartuFormulir>
  );
}

/**
 * Prospek lalu alamat tujuan. Alamat hanya untuk jenis yang
 * mendatangi tempat (Kunjungan/Survei lokasi); memilih prospek (calon
 * pelanggan maupun perantara) mengisi alamat kosong secara otomatis.
 */
export function BagianProspekAlamatRencana({ form, onBukaPilihProspek }: BagianProspekAlamatRencanaProps) {
  const { tw } = useTemaPersona();
  return (
    <>
      <KartuProspek form={form} onBukaPilihProspek={onBukaPilihProspek} />
      {isJenisBeralamat(form.nilai.jenis) ? (
        <KartuAlamat form={form} />
      ) : (
        <KartuFormulir>
          <Text style={tw`text-sm text-gray-600`}>Telepon dan chat tidak perlu alamat.</Text>
        </KartuFormulir>
      )}
    </>
  );
}

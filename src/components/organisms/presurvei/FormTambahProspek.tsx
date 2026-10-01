import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { useTemaPersona } from '@/theme';
import { KartuFormulir } from '@/components/atoms/KartuFormulir';
import { IsianTeks } from '@/components/molecules/IsianTeks';
import { JudulIsian } from '@/components/molecules/JudulIsian';
import { useFormTambahProspek } from '@/hooks/presurvei/useFormTambahProspek';
import type { ProspekListItem } from '@/types/presurvei';
import {
  PANJANG_CATATAN_PROSPEK_MAKS,
  PANJANG_NAMA_PROSPEK_MAKS,
  PANJANG_PAKET_PROSPEK_MAKS,
  PANJANG_TELP_PROSPEK_MAKS,
} from '@/utils/presurvei/isianProspek';
import { isPaketDitanyakan } from '@/utils/presurvei/formProspek';
import { isPerantara } from '@/utils/presurvei/jenisProspek';
import { BagianAlamatProspek } from './BagianAlamatProspek';
import { BagianJenisProspek } from './BagianJenisProspek';
import { BagianSumberProspek } from './BagianSumberProspek';
import { PanelDuplikatProspek } from './PanelDuplikatProspek';

const BARIS_ISIAN_CATATAN = 3;

/** Alasan tombol simpan nonaktif saat offline. */
export const TEKS_PROSPEK_BUTUH_ONLINE =
  'Menyimpan prospek butuh internet. Sambungkan internet lalu coba lagi.';

/** Ajakan memperbaiki isian setelah simpan ditolak validasi. */
export const TEKS_ADA_ISIAN_SALAH = 'Ada isian yang belum benar. Lihat tulisan merah di atas.';

interface FormTambahProspekProps {
  /** Dipanggil dengan prospek yang baru dibuat, atau prospek lama yang dipilih saat nomor ganda. */
  onBerhasil: (prospek: ProspekListItem) => void;
}

/** Judul isian nama dan alamat mengikuti jenis prospek. */
function judulIsianMenurutJenis(isPerantaraTerpilih: boolean) {
  return isPerantaraTerpilih
    ? { nama: 'Nama perantara', contohNama: 'Contoh: Pak Slamet', alamat: 'Alamat rumah/tempat' }
    : { nama: 'Nama calon pelanggan', contohNama: 'Contoh: Pak Budi Santoso', alamat: 'Alamat pemasangan' };
}

/**
 * Form Tambah Prospek (calon pelanggan atau perantara) yang dapat dipakai
 * ulang (layar penuh maupun di dalam pemilih prospek). Mengisi ruang
 * induknya: isian bergulir, tombol simpan besar tetap di bawah.
 */
export function FormTambahProspek({ onBerhasil }: FormTambahProspekProps) {
  const { tw } = useTemaPersona();
  const form = useFormTambahProspek(onBerhasil);
  const { nilai, kesalahan, ubah } = form;
  const isBolehSimpan = form.isOnline && !form.isMenyimpan;
  const isAdaKesalahan = Object.keys(kesalahan).length > 0;
  const judul = judulIsianMenurutJenis(isPerantara(nilai.jenis));

  return (
    <View style={tw`flex-1`}>
      <ScrollView contentContainerStyle={tw`p-4 pb-8`} keyboardShouldPersistTaps="handled">
        <BagianJenisProspek
          jenis={nilai.jenis}
          peranPilihan={nilai.peranPilihan}
          peranKeterangan={nilai.peranKeterangan}
          kesalahanPeranPilihan={kesalahan.peranPilihan}
          kesalahanPeranKeterangan={kesalahan.peranKeterangan}
          onPilihJenis={(jenis) => ubah({ jenis })}
          onPilihPeran={(peranPilihan) => ubah({ peranPilihan })}
          onUbahKeterangan={(peranKeterangan) => ubah({ peranKeterangan })}
        />
        <KartuFormulir>
          <JudulIsian judul={judul.nama} isWajib />
          <IsianTeks
            label={judul.nama}
            isLabelTersembunyi
            nilai={nilai.nama}
            kesalahan={kesalahan.nama}
            maxLength={PANJANG_NAMA_PROSPEK_MAKS}
            placeholder={judul.contohNama}
            onUbah={(nama) => ubah({ nama })}
          />
        </KartuFormulir>
        <KartuFormulir>
          <JudulIsian judul="Nomor HP" isWajib petunjuk="Nomor yang bisa ditelepon atau di-WA." />
          <IsianTeks
            label="Nomor HP"
            isLabelTersembunyi
            nilai={nilai.noTelp}
            kesalahan={kesalahan.noTelp}
            keyboardType="phone-pad"
            maxLength={PANJANG_TELP_PROSPEK_MAKS}
            placeholder="Contoh: 0812 3456 7890"
            onUbah={(noTelp) => ubah({ noTelp })}
          />
        </KartuFormulir>
        <BagianAlamatProspek
          judul={judul.alamat}
          alamat={nilai.alamat}
          kesalahan={kesalahan.alamat}
          statusLokasi={form.statusLokasi}
          onUbah={(alamat) => ubah({ alamat })}
          onPakaiLokasi={form.pakaiLokasiSekarang}
        />
        <BagianSumberProspek
          sumber={nilai.sumber}
          referralNama={nilai.referralNama}
          kesalahanReferral={kesalahan.referralNama}
          onPilihSumber={(sumber) => ubah({ sumber })}
          onUbahReferral={(referralNama) => ubah({ referralNama })}
        />
        {isPaketDitanyakan(nilai.jenis) ? (
          <KartuFormulir>
            <JudulIsian judul="Paket yang diminati" isWajib={false} />
            <IsianTeks
              label="Paket yang diminati"
              isLabelTersembunyi
              nilai={nilai.paketDiminati}
              kesalahan={kesalahan.paketDiminati}
              maxLength={PANJANG_PAKET_PROSPEK_MAKS}
              placeholder="Contoh: 20 Mbps"
              onUbah={(paketDiminati) => ubah({ paketDiminati })}
            />
          </KartuFormulir>
        ) : null}
        <KartuFormulir>
          <JudulIsian judul="Catatan" isWajib={false} />
          <IsianTeks
            label="Catatan"
            isLabelTersembunyi
            nilai={nilai.catatan}
            kesalahan={kesalahan.catatan}
            multiline
            jumlahBaris={BARIS_ISIAN_CATATAN}
            isTampilPenghitung
            maxLength={PANJANG_CATATAN_PROSPEK_MAKS}
            placeholder="Contoh: minta dihubungi sore hari"
            onUbah={(catatan) => ubah({ catatan })}
          />
        </KartuFormulir>
      </ScrollView>
      <View style={tw`p-4 bg-white border-t border-gray-100`}>
        {form.duplikat ? (
          <PanelDuplikatProspek duplikat={form.duplikat} isMenyimpan={form.isMenyimpan} />
        ) : (
          <>
            {!form.isOnline ? <Text style={tw`text-sm text-amber-700 mb-2`}>{TEKS_PROSPEK_BUTUH_ONLINE}</Text> : null}
            {isAdaKesalahan ? <Text style={tw`text-sm text-red-600 mb-2`}>{TEKS_ADA_ISIAN_SALAH}</Text> : null}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ disabled: !isBolehSimpan }}
              disabled={!isBolehSimpan}
              onPress={form.simpan}
              style={tw`rounded-xl min-h-12 py-4 items-center justify-center ${isBolehSimpan ? 'bg-utama-kuat' : 'bg-gray-400'}`}
            >
              <Text style={tw`text-white text-base font-bold`}>
                {form.isMenyimpan ? 'Menyimpan…' : 'Simpan Prospek'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

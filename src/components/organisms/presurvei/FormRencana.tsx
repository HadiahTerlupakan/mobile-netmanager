import { CalendarDays, Clock } from 'lucide-react-native';
import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { useTemaPersona } from '@/theme';
import { KartuFormulir } from '@/components/atoms/KartuFormulir';
import { TeksKesalahan } from '@/components/atoms/TeksKesalahan';
import CustomDatePickerModal from '@/components/molecules/CustomDatePickerModal';
import { PilihanChip } from '@/components/molecules/PilihanChip';
import { TombolPilihanBesar } from '@/components/molecules/TombolPilihanBesar';
import { LABEL_JENIS_KEGIATAN, RENCANA_JENIS } from '@/constants/presurvei';
import type { FormRencana as StateFormRencana } from '@/hooks/presurvei/useFormRencana';
import { keTanggalKalender } from '@/utils/presurvei/rencana';
import {
  labelTombolJam,
  tentukanPilihanJam,
  tentukanPilihanTanggal,
  teksJamRingkas,
  teksTanggalLengkap,
  type PilihanJam,
  type PilihanTanggal,
} from '@/utils/presurvei/pilihanWaktuRencana';
import { geserHari } from '@/utils/presurvei/rentangHari';
import { BagianProspekAlamatRencana } from './BagianProspekAlamatRencana';
import { BagianTujuanRencana } from './BagianTujuanRencana';
import { PilihJamModal } from './PilihJamModal';

const OPSI_JENIS = RENCANA_JENIS.map((jenis) => ({ nilai: jenis, label: LABEL_JENIS_KEGIATAN[jenis] }));
const OPSI_TANGGAL: { nilai: PilihanTanggal; label: string }[] = [
  { nilai: 'HARI_INI', label: 'Hari ini' },
  { nilai: 'BESOK', label: 'Besok' },
  { nilai: 'LAIN', label: 'Tanggal lain' },
];
const OPSI_TANPA_JAM: { nilai: PilihanJam; label: string } = { nilai: 'TANPA_JAM', label: 'Tanpa jam' };
const UKURAN_IKON_RINGKASAN = 22;
/** Panjang "YYYY-MM-DD" di awal string ISO. */
const PANJANG_TANGGAL_ISO = 10;

/**
 * `CustomDatePickerModal` mengembalikan `new Date("YYYY-MM-DD")`, yaitu
 * tengah malam UTC; potongan ISO-nya adalah tanggal yang diketuk, apa pun
 * zona waktu perangkat.
 */
const tanggalDariKalender = (tanggal: Date): string => tanggal.toISOString().slice(0, PANJANG_TANGGAL_ISO);

interface FormRencanaProps {
  form: StateFormRencana;
  hariIni: string;
  onBukaPilihProspek: () => void;
}

/** Isi form rencana: tanggal (hari ini ke depan), jam opsional, jenis, tujuan, prospek & alamat opsional. */
export function FormRencana({ form, hariIni, onBukaPilihProspek }: FormRencanaProps) {
  const { tw, warna } = useTemaPersona();
  const { nilai, kesalahan, ubah } = form;
  const [isKalenderTerbuka, setIsKalenderTerbuka] = useState(false);
  const [isJamTerbuka, setIsJamTerbuka] = useState(false);

  const besok = keTanggalKalender(geserHari(new Date(), 1));
  const pilihanTanggal = tentukanPilihanTanggal(nilai.tanggal, hariIni, besok);
  const pilihTanggal = (pilihan: PilihanTanggal) => {
    if (pilihan === 'HARI_INI') ubah({ tanggal: hariIni });
    else if (pilihan === 'BESOK') ubah({ tanggal: besok });
    else setIsKalenderTerbuka(true);
  };
  const pilihJamOpsi = (pilihan: PilihanJam) => {
    if (pilihan === 'TANPA_JAM') ubah({ jam: '' });
    else setIsJamTerbuka(true);
  };

  return (
    <View>
      <KartuFormulir>
        <Text style={tw`font-bold text-gray-900 mb-2`}>Tanggal kunjungan</Text>
        <TombolPilihanBesar opsi={OPSI_TANGGAL} terpilih={pilihanTanggal} onPilih={pilihTanggal} />
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Tanggal terpilih ${teksTanggalLengkap(nilai.tanggal)}. Ketuk untuk ganti tanggal`}
          onPress={() => setIsKalenderTerbuka(true)}
          style={tw`mt-3 flex-row items-center bg-utama-sangat-muda border border-utama-garis rounded-xl p-3`}
        >
          <CalendarDays size={UKURAN_IKON_RINGKASAN} color={warna.utamaGelap} />
          <View style={tw`ml-3 flex-1`}>
            <Text style={tw`text-xs text-gray-600`}>Kunjungan pada</Text>
            <Text style={tw`text-base font-bold text-gray-900`}>{teksTanggalLengkap(nilai.tanggal)}</Text>
          </View>
          <Text style={tw`text-sm font-semibold text-utama-gelap`}>Ganti</Text>
        </TouchableOpacity>
        <TeksKesalahan pesan={kesalahan.tanggal} />
      </KartuFormulir>
      <KartuFormulir>
        <Text style={tw`font-bold text-gray-900`}>Jam kunjungan</Text>
        <Text style={tw`text-xs text-gray-500 mb-2`}>Boleh tidak diisi. Isi jam bila hari itu ada beberapa kunjungan.</Text>
        <TombolPilihanBesar
          opsi={[OPSI_TANPA_JAM, { nilai: 'PAKAI_JAM', label: labelTombolJam(nilai.jam) }]}
          terpilih={tentukanPilihanJam(nilai.jam)}
          onPilih={pilihJamOpsi}
        />
        <View style={tw`mt-3 flex-row items-center bg-gray-50 border border-gray-200 rounded-xl p-3`}>
          <Clock size={UKURAN_IKON_RINGKASAN} color={warna.utamaGelap} />
          <Text style={tw`ml-3 flex-1 text-sm text-gray-800`}>{teksJamRingkas(nilai.jam)}</Text>
        </View>
      </KartuFormulir>
      <KartuFormulir>
        <Text style={tw`font-bold text-gray-900 mb-2`}>Jenis kunjungan</Text>
        <PilihanChip opsi={OPSI_JENIS} terpilih={nilai.jenis} onPilih={(jenis) => ubah({ jenis })} />
        <TeksKesalahan pesan={kesalahan.jenis} />
      </KartuFormulir>
      <BagianTujuanRencana tujuan={nilai.tujuan} kesalahan={kesalahan.tujuan} onUbah={(tujuan) => ubah({ tujuan })} />
      <BagianProspekAlamatRencana form={form} onBukaPilihProspek={onBukaPilihProspek} />
      <PilihJamModal
        terlihat={isJamTerbuka}
        terpilih={nilai.jam}
        onPilih={(jam) => ubah({ jam })}
        onTutup={() => setIsJamTerbuka(false)}
      />
      <CustomDatePickerModal
        visible={isKalenderTerbuka}
        minDate={hariIni}
        title="Pilih tanggal kunjungan"
        tanggalTerpilih={nilai.tanggal}
        onClose={() => setIsKalenderTerbuka(false)}
        onSelect={(tanggal) => ubah({ tanggal: tanggalDariKalender(tanggal) })}
      />
    </View>
  );
}

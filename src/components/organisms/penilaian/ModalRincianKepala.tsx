import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import tw from 'twrnc';

import type { PenilaianKepala, PenilaianSales } from '@/types/penilaian';
import { daftarIndikatorKepala } from '@/utils/presurvei/penilaianKinerja';
import { BingkaiModalPenilaian } from './BingkaiModalPenilaian';
import { DaftarPenilaianSales } from './DaftarPenilaianSales';
import { KartuSkorPenilaian } from './KartuSkorPenilaian';
import { RincianPenilaianSales } from './RincianPenilaianSales';

/** Ruang kosong di bawah isi yang digulung. */
const JARAK_BAWAH = 16;

interface ModalRincianKepalaProps {
  kepala: PenilaianKepala;
  /** Anggota tim kepala ini (tanpa dirinya). */
  anggota: readonly PenilaianSales[];
  onTutup: () => void;
}

/**
 * Rincian satu kepala sales dalam satu modal: lima indikator lalu anggota
 * timnya (filter predikat). Ketuk anggota mengganti isi modal dengan rincian
 * anggota itu; tombol kembali memulihkan daftar tim.
 */
export function ModalRincianKepala({ kepala, anggota, onTutup }: ModalRincianKepalaProps) {
  const [anggotaId, setAnggotaId] = useState<string | null>(null);
  const anggotaTerbuka = anggota.find((sales) => sales.salesId === anggotaId) ?? null;
  if (anggotaTerbuka) {
    return (
      <BingkaiModalPenilaian judul={anggotaTerbuka.nama} onTutup={onTutup} onKembali={() => setAnggotaId(null)}>
        <ScrollView contentContainerStyle={[tw`px-4`, { paddingBottom: JARAK_BAWAH }]}>
          <RincianPenilaianSales penilaian={anggotaTerbuka} judul="Skor & indikator" />
        </ScrollView>
      </BingkaiModalPenilaian>
    );
  }
  const kartuKepala = (
    <View style={tw`px-4`}>
      <KartuSkorPenilaian
        judul="Penilaian kepala sales"
        skor={kepala.skor}
        predikat={kepala.predikat}
        indikator={daftarIndikatorKepala(kepala.indikator)}
        keterangan={`${kepala.jumlahAnggota} anggota tim`}
      />
    </View>
  );
  return (
    <BingkaiModalPenilaian judul={kepala.nama} onTutup={onTutup}>
      <DaftarPenilaianSales daftar={anggota} header={kartuKepala} penggunaId={null} onBuka={setAnggotaId} />
    </BingkaiModalPenilaian>
  );
}

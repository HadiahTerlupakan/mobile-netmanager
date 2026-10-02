import React from 'react';

import { BlokFoto } from '@/components/molecules/BlokFoto';
import { JUMLAH_FOTO_KEGIATAN_MAKS } from '@/constants/presurvei';

interface BlokFotoBuktiProps {
  fotoLokal: readonly string[];
  kesalahan?: string;
  onTambah: () => void;
  onHapus: (uri: string) => void;
}

/** Foto bukti kegiatan lapangan: minimal satu, maksimal enam, dari kamera. */
export function BlokFotoBukti({ fotoLokal, kesalahan, onTambah, onHapus }: BlokFotoBuktiProps) {
  return (
    <BlokFoto
      judul="Foto bukti"
      fotoLokal={fotoLokal}
      jumlahMaks={JUMLAH_FOTO_KEGIATAN_MAKS}
      tombolTambah={[{ label: 'Ambil Foto', onTekan: onTambah }]}
      onHapus={onHapus}
      kesalahan={kesalahan}
    />
  );
}

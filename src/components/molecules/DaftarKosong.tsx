import { AlertTriangle, type LucideIcon } from 'lucide-react-native';
import React from 'react';

import { EmptyState } from '@/components/atoms/EmptyState';

interface DaftarKosongProps {
  /** Muat gagal: tampilkan pesan gagal dan tombol "Coba lagi" sebagai ganti isi kosong. */
  isError: boolean;
  onCobaLagi: () => void;
  ikon: LucideIcon;
  judul: string;
  pesan: string;
}

/** Isi daftar yang kosong: keadaan kosong biasa, atau gagal muat yang bisa dicoba lagi. */
export function DaftarKosong({ isError, onCobaLagi, ikon, judul, pesan }: DaftarKosongProps) {
  if (isError) {
    return (
      <EmptyState
        ikon={AlertTriangle}
        judul="Gagal memuat"
        pesan="Tarik ke bawah untuk mencoba lagi."
        aksi={{ label: 'Coba lagi', onTekan: onCobaLagi }}
      />
    );
  }
  return <EmptyState ikon={ikon} judul={judul} pesan={pesan} />;
}

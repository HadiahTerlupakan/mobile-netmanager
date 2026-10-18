/**
 * Merender PeringatanTrackingModal sekali secara global dan mendaftarkan
 * presenternya ke utils/peringatanTracking, agar gerbang check-in maupun
 * rekonsiliasi saat aplikasi dibuka memakai modal yang sama.
 */

import { PeringatanTrackingModal } from '@/components/organisms/attendance/PeringatanTrackingModal';
import {
  setPeringatanTrackingPresenter,
  type HasilPeringatan,
  type PermintaanPeringatan,
} from '@/utils/peringatanTracking';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';

export function PeringatanTrackingProvider({ children }: { children: React.ReactNode }) {
  const [permintaan, setPermintaan] = useState<PermintaanPeringatan | null>(null);
  const resolveRef = useRef<((hasil: HasilPeringatan) => void) | null>(null);
  const router = useRouter();

  const tampilkan = useCallback(
    (baru: PermintaanPeringatan) =>
      new Promise<HasilPeringatan>((resolve) => {
        resolveRef.current = resolve;
        setPermintaan(baru);
      }),
    [],
  );

  useEffect(() => {
    setPeringatanTrackingPresenter(tampilkan);
    return () => {
      setPeringatanTrackingPresenter(null);
      // Modal yang masih terbuka saat layout ditutup (logout) harus selesai;
      // janji yang menggantung menahan gerbang check-in sampai aplikasi
      // dimulai ulang.
      resolveRef.current?.('tutup');
      resolveRef.current = null;
    };
  }, [tampilkan]);

  const pilih = useCallback(
    (hasil: HasilPeringatan) => {
      setPermintaan(null);
      resolveRef.current?.(hasil);
      resolveRef.current = null;
      if (hasil === 'checkout') router.push('/absensi');
    },
    [router],
  );

  return (
    <>
      {children}
      <PeringatanTrackingModal permintaan={permintaan} onPilih={pilih} />
    </>
  );
}

export default PeringatanTrackingProvider;

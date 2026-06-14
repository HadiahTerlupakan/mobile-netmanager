/**
 * LocationDisclosureProvider
 * Merender LocationDisclosureModal sekali secara global dan mendaftarkan
 * presenter ke gerbang terpusat (utils/locationDisclosure).
 *
 * Dengan ini, di mana pun aplikasi memanggil
 * `requestForegroundLocationWithDisclosure()` / `ensureDisclosureBeforeBackground()`,
 * modal disclosure yang sama tampil tepat sebelum izin OS diminta (syarat Google Play).
 */

import { LocationDisclosureModal } from '@/components/organisms/attendance/LocationDisclosureModal';
import { setDisclosurePresenter } from '@/utils/locationDisclosure';
import React, { useCallback, useEffect, useRef, useState } from 'react';

export function LocationDisclosureProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const resolveRef = useRef<((accepted: boolean) => void) | null>(null);

  // Selalu tampilkan modal. Keputusan apakah izin OS perlu diminta (dan karena
  // itu disclosure perlu tampil) ditangani di gerbang utils/locationDisclosure
  // berdasar status izin OS aktual — bukan flag storage.
  const present = useCallback(async (): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setVisible(true);
    });
  }, []);

  useEffect(() => {
    setDisclosurePresenter(present);
    return () => {
      setDisclosurePresenter(null);
    };
  }, [present]);

  const settle = useCallback((accepted: boolean) => {
    setVisible(false);
    resolveRef.current?.(accepted);
    resolveRef.current = null;
  }, []);

  return (
    <>
      {children}
      <LocationDisclosureModal
        visible={visible}
        onAccept={() => settle(true)}
        onReject={() => settle(false)}
      />
    </>
  );
}

export default LocationDisclosureProvider;

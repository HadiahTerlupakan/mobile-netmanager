/**
 * LocationDisclosureProvider
 * Merender LocationDisclosureModal sekali secara global dan mendaftarkan
 * presenter ke gerbang terpusat (utils/locationDisclosure) + LocationTrackingService.
 *
 * Dengan ini, di mana pun aplikasi memanggil `ensureLocationDisclosure()`
 * atau `requestForegroundLocationWithDisclosure()`, modal disclosure yang
 * sama akan tampil sebelum izin sistem diminta (syarat Google Play).
 */

import { LocationDisclosureModal } from '@/components/organisms/attendance/LocationDisclosureModal';
import { LocationTrackingService } from '@/services/LocationTrackingService';
import {
  hasAcceptedLocationDisclosure,
  setDisclosurePresenter,
} from '@/utils/locationDisclosure';
import React, { useCallback, useEffect, useRef, useState } from 'react';

export function LocationDisclosureProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const resolveRef = useRef<((accepted: boolean) => void) | null>(null);

  const present = useCallback(async (): Promise<boolean> => {
    if (await hasAcceptedLocationDisclosure()) return true;

    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setVisible(true);
    });
  }, []);

  useEffect(() => {
    setDisclosurePresenter(present);
    LocationTrackingService.setDisclosureCallback(present);
    return () => {
      setDisclosurePresenter(null);
      LocationTrackingService.setDisclosureCallback(null);
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

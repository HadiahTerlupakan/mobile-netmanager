import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

import { isStatusOnline } from '@/utils/statusJaringan';

/** Status online terkini untuk menonaktifkan aksi yang butuh server. */
export function useIsOnline(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let isTerpasang = true;
    void NetInfo.fetch().then((state) => {
      if (isTerpasang) setIsOnline(isStatusOnline(state));
    });
    const berhenti = NetInfo.addEventListener((state) => setIsOnline(isStatusOnline(state)));
    return () => {
      isTerpasang = false;
      berhenti();
    };
  }, []);

  return isOnline;
}

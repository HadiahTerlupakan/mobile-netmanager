import { type LucideIcon, MapPin, MessageCircle, Phone, SearchCheck } from 'lucide-react-native';

import type { RencanaJenis } from '@/constants/presurvei';

/** Ikon per jenis rencana; `Record` memaksa jenis baru dijawab saat kompilasi. */
export const IKON_JENIS_RENCANA: Record<RencanaJenis, LucideIcon> = {
  KUNJUNGAN: MapPin,
  SURVEI_LOKASI: SearchCheck,
  TELEPON: Phone,
  CHAT: MessageCircle,
};

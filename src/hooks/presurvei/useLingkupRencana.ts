import { useAuth } from '@/context/AuthContext';
import { useProfileSync } from '@/hooks/useProfileSync';
import { isPemberiTugas, type LingkupPengguna } from '@/utils/presurvei/timRencana';

/**
 * Lingkup rencana pengguna yang sedang masuk. `lingkupRencana` dibaca dari
 * profil (cache offline ikut tersimpan); selama profil belum ada pengguna
 * diperlakukan sebagai sales biasa sehingga tidak ada aksi pemberi tugas
 * yang muncul tanpa dasar.
 */
export function useLingkupRencana(): LingkupPengguna {
  const { user } = useAuth();
  const { profileData } = useProfileSync();
  return {
    isPemberiTugas: isPemberiTugas(profileData?.lingkupRencana),
    penggunaId: profileData?.id ?? user?.id ?? null,
  };
}

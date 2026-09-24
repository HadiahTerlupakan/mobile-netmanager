import { AppFeature } from '@/constants/features';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Alert } from 'react-native';

const APP_DASHBOARD_ROUTE = '/(app)/dashboard';

type PenggunaAuth = ReturnType<typeof useAuth>['user'];

/** Apakah pengguna memiliki salah satu fitur yang dibutuhkan (super admin selalu boleh). */
function isPunyaFitur(user: NonNullable<PenggunaAuth>, requiredFeature: AppFeature | AppFeature[]): boolean {
  if (user.role === 'SUPER_ADMIN') return true;
  const featuresArray = Array.isArray(requiredFeature) ? requiredFeature : [requiredFeature];
  const userFeatures = user.features || [];
  return featuresArray.some((feature) => userFeatures.includes(feature));
}

/**
 * UX-only feature guard untuk mobile client.
 * Jangan diperlakukan sebagai security boundary; backend API authorization
 * dan tenant isolation tetap source of truth.
 *
 * Mengembalikan `true` hanya bila auth sudah dimuat dan pengguna berhak;
 * layar memakainya untuk menunda efek samping (mis. prompt izin lokasi)
 * sampai guard selesai memutuskan.
 */
export function useFeatureGuard(
  requiredFeature: AppFeature | AppFeature[],
  showMessage: boolean = true
): boolean {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait until auth state is loaded
    if (isLoading) return;

    // If no user, they shouldn't be here (auth guard will usually handle this, but just in case)
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }

    if (!isPunyaFitur(user, requiredFeature)) {
      if (showMessage) {
        Alert.alert(
          'Akses Terbatas',
          'Anda tidak memiliki izin untuk mengakses halaman ini.',
          [{ text: 'OK', onPress: () => router.replace(APP_DASHBOARD_ROUTE) }]
        );
      } else {
        router.replace(APP_DASHBOARD_ROUTE);
      }
    }
  }, [user, isLoading, requiredFeature, router, showMessage]);

  return !isLoading && user !== null && isPunyaFitur(user, requiredFeature);
}

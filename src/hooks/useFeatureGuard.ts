import { AppFeature } from '@/constants/features';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Alert } from 'react-native';

const APP_DASHBOARD_ROUTE = '/(app)/dashboard';

/**
 * UX-only feature guard untuk mobile client.
 * Jangan diperlakukan sebagai security boundary; backend API authorization
 * dan tenant isolation tetap source of truth.
 */
export function useFeatureGuard(
  requiredFeature: AppFeature | AppFeature[],
  showMessage: boolean = true
) {
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

    // SUPER_ADMIN has access to everything
    if (user.role === 'SUPER_ADMIN') return;

    // Check if user has required feature(s)
    const featuresArray = Array.isArray(requiredFeature)
      ? requiredFeature
      : [requiredFeature];
    const userFeatures = user.features || [];
    const hasAccess = featuresArray.some((feature) =>
      userFeatures.includes(feature)
    );

    if (!hasAccess) {
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
}

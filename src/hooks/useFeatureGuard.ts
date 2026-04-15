import { AppFeature } from '@/constants/features';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Alert } from 'react-native';

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
      router.replace('/');
      return;
    }

    // SUPER_ADMIN has access to everything
    if (user.role === 'SUPER_ADMIN') return;

    // Mitra users have fixed menus — no permission check needed
    const isMitra = user.employeeType === 'MITRA_TEKNISI' || user.employeeType === 'MITRA_SALES';
    if (isMitra) return;

    // Check if user has required feature(s)
    const featuresArray = Array.isArray(requiredFeature)
      ? requiredFeature
      : [requiredFeature];

    // User must have AT LEAST ONE of the required features (OR condition)
    // You can change this to .every() if you want an AND condition
    const hasAccess = featuresArray.some((feat) =>
      user.features?.includes(feat)
    );

    if (!hasAccess) {
      if (showMessage) {
        Alert.alert(
          'Akses Terbatas',
          'Anda tidak memiliki izin untuk mengakses halaman ini.',
          [{ text: 'OK', onPress: () => router.replace('/dashboard') }]
        );
      } else {
        router.replace('/dashboard');
      }
    }
  }, [user, isLoading, requiredFeature, router, showMessage]);
}

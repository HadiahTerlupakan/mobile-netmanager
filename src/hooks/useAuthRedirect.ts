import { User } from '@/context/AuthContext';
import { errorReportingService } from '@/services/ErrorReportingService';
import { logger } from '@/utils/logger';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

/**
 * Handle auth-based navigation redirects
 * - Redirect to login if not authenticated
 * - Redirect to appropriate dashboard based on user role
 * - Handle public routes
 * - Debounce redirects to prevent loops
 */
export function useAuthRedirect(
  user: User | null,
  segments: string[],
  isLoading: boolean
) {
  const router = useRouter();
  const currentSegment = segments[0];

  useEffect(() => {
    logger.auth(
      'Effect triggered. User:',
      !!user,
      'Segment:',
      currentSegment,
      'Loading:',
      isLoading
    );

    if (isLoading) {
      logger.auth('Still loading, skipping redirect check');
      return;
    }

    const inAuthGroup = currentSegment === '(auth)';
    const inAppGroup = currentSegment === '(app)';
    const inCustomerGroup = currentSegment === '(customer)';
    const isPublicRoute = currentSegment === 'kebijakan-privasi';

    logger.auth('Status:', {
      user: !!user,
      inAuthGroup,
      inAppGroup,
      inCustomerGroup,
      isPublicRoute,
      role: user?.role,
      segment: currentSegment,
    });

    // Debounce redirects to prevent loops during initialization
    const redirectTimer = setTimeout(() => {
      if (isPublicRoute) {
        logger.auth('Allowing public route:', currentSegment);
        return;
      }

      if (!user && !inAuthGroup) {
        logger.auth('Redirecting to Login');
        router.replace('/(auth)/login');
      } else if (user) {
        // If User is Customer
        if (user.role === 'CUSTOMER') {
          if (!inCustomerGroup) {
            logger.auth('Redirecting to Customer Dashboard');
            router.replace('/(customer)/dashboard');
          }
        }
        // If User is Employee (Admin, Teknisi, Sales, etc)
        else {
          if (!inAppGroup) {
            logger.auth('Redirecting to Employee Dashboard');
            router.replace('/(app)/dashboard');
          }
        }
      }

      errorReportingService.addBreadcrumb(
        'navigation',
        'Root redirect evaluated',
        {
          hasUser: !!user,
          segment: currentSegment ?? null,
          isPublicRoute,
        }
      );
    }, 100);

    return () => clearTimeout(redirectTimer);
  }, [currentSegment, isLoading, router, user]);
}

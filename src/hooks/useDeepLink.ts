import { logger } from '@/utils/logger';
import * as Linking from 'expo-linking';
import { Href, useRouter, useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';

const APP_SCHEME = 'netmanager';

/**
 * Handle deep links netmanager://...
 * Digunakan untuk buka detail WO dari link WA:
 *   netmanager://work-order-detail/<id>
 *   netmanager://work-order
 *
 * Scheme sudah terdaftar di app.json (build native). Handler JS ini OTA-safe.
 */
export function useDeepLink() {
  const router = useRouter();
  const segments = useSegments() as readonly string[];
  const pendingUrlRef = useRef<string | null>(null);
  const handledInitialRef = useRef(false);

  const isRouterReady = segments.length > 0;

  useEffect(() => {
    if (!isRouterReady || !pendingUrlRef.current) return;
    const url = pendingUrlRef.current;
    pendingUrlRef.current = null;
    navigateFromDeepLink(url, router);
  }, [isRouterReady, router]);

  useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (!url) return;
      logger.info('[DeepLink] received:', url);

      if (!isRouterReady) {
        pendingUrlRef.current = url;
        return;
      }
      navigateFromDeepLink(url, router);
    };

    if (!handledInitialRef.current) {
      handledInitialRef.current = true;
      void Linking.getInitialURL().then(handleUrl);
    }

    const sub = Linking.addEventListener('url', (event) => {
      handleUrl(event.url);
    });

    return () => sub.remove();
  }, [router, isRouterReady]);
}

function navigateFromDeepLink(
  url: string,
  router: ReturnType<typeof useRouter>,
): void {
  const path = parseDeepLinkPath(url);
  if (!path) {
    logger.warn('[DeepLink] unrecognised URL:', url);
    return;
  }

  try {
    logger.info('[DeepLink] navigate →', path);
    router.push(path as Href);
  } catch (error) {
    logger.error('[DeepLink] navigation failed:', error);
    router.replace('/(app)/dashboard');
  }
}

/**
 * Parse netmanager://work-order-detail/abc → /(app)/work-order-detail/abc
 * Juga terima path-style: netmanager:///work-order-detail/abc
 */
export function parseDeepLinkPath(url: string): string | null {
  try {
    const parsed = Linking.parse(url);
    if (parsed.scheme && parsed.scheme !== APP_SCHEME) {
      return null;
    }

    // Linking.parse: hostname = first segment, path = rest
    // netmanager://work-order-detail/ID → hostname=work-order-detail, path=ID
    // netmanager:///work-order-detail/ID → hostname=null, path=work-order-detail/ID
    const parts = [parsed.hostname, parsed.path]
      .filter((p): p is string => Boolean(p && p.length > 0))
      .join('/')
      .replace(/^\/+/, '')
      .replace(/\/+$/, '');

    if (!parts) return null;

    if (parts.startsWith('work-order-detail/')) {
      const id = parts.slice('work-order-detail/'.length).split('/')[0];
      if (!id || !/^[a-zA-Z0-9_-]{8,64}$/.test(id)) return null;
      return `/(app)/work-order-detail/${id}`;
    }

    if (parts === 'work-order' || parts.startsWith('work-order/')) {
      return '/(app)/work-order';
    }

    if (parts === 'dashboard') {
      return '/(app)/dashboard';
    }

    return null;
  } catch {
    return null;
  }
}

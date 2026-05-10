# Mobile App Cleanup & Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up repository artifacts, refactor complex layout file into maintainable hooks, improve environment documentation, and analyze bundle size.

**Architecture:** Extract 4 single-responsibility custom hooks from `app/_layout.tsx` (useAppInitialization, useVersionCheck, useNotificationSetup, useAuthRedirect). No behavior changes, only code organization improvements.

**Tech Stack:** React Native 0.81.5, Expo SDK 54, Expo Router, TypeScript, TanStack Query v5

---

## File Structure

**Files to Create:**
- `src/hooks/useAppInitialization.ts` - Database init, notification channel, sync monitoring
- `src/hooks/useVersionCheck.ts` - Version checking, update flow, version reporting
- `src/hooks/useNotificationSetup.ts` - Push notification handling, deep linking
- `src/hooks/useAuthRedirect.ts` - Auth-based navigation logic

**Files to Modify:**
- `app/_layout.tsx` - Refactor to use new hooks (442 lines → ~150 lines)
- `.env.example` - Add documentation for environment variables

**Files to Delete:**
- `*.apk` (9 files, ~1.8GB) - Build artifacts

---

## Task 1: Cleanup APK Artifacts

**Files:**
- Delete: `*.apk` (all APK files in root)
- Verify: `.gitignore` (already has `*.apk` rule at line 61)

- [ ] **Step 1: List APK files to be deleted**

```bash
ls -lh *.apk
```

Expected output: List of 9 APK files with sizes

- [ ] **Step 2: Delete all APK files**

```bash
rm -f *.apk
```

Expected: No errors

- [ ] **Step 3: Verify deletion**

```bash
ls *.apk 2>&1
```

Expected output: `ls: *.apk: No such file or directory`

- [ ] **Step 4: Verify .gitignore has APK rule**

```bash
grep "\.apk" .gitignore
```

Expected output: `*.apk` (already exists at line 61)

- [ ] **Step 5: Check git status**

```bash
git status
```

Expected: Clean working tree (APK files were never tracked)

- [ ] **Step 6: Commit cleanup (if any changes)**

```bash
git add -A
git commit -m "chore: remove local APK build artifacts" || echo "No changes to commit"
```

---

## Task 2: Update Environment Documentation

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Read current .env.example**

```bash
cat .env.example
```

- [ ] **Step 2: Backup current file**

```bash
cp .env.example .env.example.backup
```

- [ ] **Step 3: Update .env.example with full documentation**

Replace content with:

```bash
# Environment Variables untuk Mobile NetManager

# App Environment (development, staging, production)
EXPO_PUBLIC_APP_VARIANT=development

# API Configuration
# Development: otomatis detect (10.0.2.2:3000 untuk Android, localhost:3000 untuk iOS)
# Staging: https://staging.radpro.id
# Production: https://radpro.id
# Override manual (opsional):
# EXPO_PUBLIC_API_URL=http://192.168.1.100:3000

# Logging Configuration
# Set ke 'true' untuk enable verbose logging (hanya untuk debugging)
EXPO_DEBUG=true

# Socket.IO logging (sering menyebabkan terminal corruption)
EXPO_DEBUG_SOCKET=false

# Development settings
EXPO_DEVTOOLS_LISTEN_ADDRESS=auto

# Error Reporting (otomatis true di production)
EXPO_PUBLIC_ENABLE_ERROR_REPORTING=false

# Firebase (required for RealtimeService + PresenceService)
# `databaseURL` is required because PresenceService uses Firebase Realtime Database
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyDihrl023fOQnXf8oZ7A2rU7YxzJzQN5Lc
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=netmanager-96742.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=netmanager-96742
EXPO_PUBLIC_FIREBASE_DATABASE_URL=https://netmanager-96742-default-rtdb.asia-southeast1.firebasedatabase.app
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=netmanager-96742.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=43187781340
EXPO_PUBLIC_FIREBASE_APP_ID=1:43187781340:web:461fc10875b35538e67e19
```

- [ ] **Step 4: Verify no syntax errors**

```bash
cat .env.example | head -20
```

Expected: File content displays correctly

- [ ] **Step 5: Remove backup**

```bash
rm .env.example.backup
```

- [ ] **Step 6: Commit documentation update**

```bash
git add .env.example
git commit -m "docs: improve environment variable documentation"
```

---

## Task 3: Extract useAppInitialization Hook

**Files:**
- Create: `src/hooks/useAppInitialization.ts`
- Reference: `app/_layout.tsx:77-116`

- [ ] **Step 1: Create useAppInitialization hook file**

File: `src/hooks/useAppInitialization.ts`

```typescript
import { DatabaseService } from '@/services/DatabaseService';
import { ensureForegroundNotificationChannel } from '@/services/ForegroundNotificationService';
import { performanceMonitor } from '@/services/PerformanceMonitor';
import { SyncService } from '@/services/SyncService';
import { errorReportingService } from '@/services/ErrorReportingService';
import { logger } from '@/utils/logger';
import { useEffect } from 'react';

/**
 * Initialize critical app services on mount
 * - Database initialization
 * - Foreground notification channel
 * - Sync monitoring (delayed)
 * - Performance tracking
 */
export function useAppInitialization() {
  useEffect(() => {
    let syncTimer: ReturnType<typeof setTimeout> | undefined;

    const initServices = async () => {
      try {
        // Phase 1: Critical services
        logger.info('[Init] Phase 1: Database initialization');
        await DatabaseService.initDatabase();

        await ensureForegroundNotificationChannel();

        // Phase 2: Non-critical services (delayed)
        logger.info('[Init] Phase 2: Starting sync monitoring');
        syncTimer = setTimeout(() => {
          try {
            SyncService.startMonitoring();
          } catch (error) {
            logger.error('[Init] Failed to start sync monitoring:', error);
            errorReportingService.captureException(
              error instanceof Error ? error : new Error('Failed to start sync monitoring'),
              {
                source: 'root.initServices.syncMonitoring',
              }
            );
          }
        }, 1000);
      } catch (error) {
        logger.error('[Init] Service initialization failed:', error);
        errorReportingService.captureException(
          error instanceof Error ? error : new Error('Service initialization failed'),
          {
            source: 'root.initServices',
          }
        );
      }
    };

    performanceMonitor.start('App Startup');
    initServices();

    return () => {
      if (syncTimer) {
        clearTimeout(syncTimer);
      }
      SyncService.stopMonitoring();
      performanceMonitor.stop('App Startup');
    };
  }, []);
}
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
npx tsc --noEmit src/hooks/useAppInitialization.ts
```

Expected: No errors

- [ ] **Step 3: Commit hook**

```bash
git add src/hooks/useAppInitialization.ts
git commit -m "refactor: extract useAppInitialization hook"
```

---

## Task 4: Extract useVersionCheck Hook

**Files:**
- Create: `src/hooks/useVersionCheck.ts`
- Reference: `app/_layout.tsx:58-183`

- [ ] **Step 1: Create useVersionCheck hook file**

File: `src/hooks/useVersionCheck.ts`

```typescript
import { User } from '@/context/AuthContext';
import { CURRENT_VERSION_CODE, CURRENT_VERSION_NAME } from '@/constants/appVersion';
import { Config } from '@/constants/Config';
import { Events } from '@/constants/Events';
import { useAppVersion } from '@/hooks/useAppVersion';
import { appVersionService } from '@/services/AppVersionService';
import { errorReportingService } from '@/services/ErrorReportingService';
import { logger } from '@/utils/logger';
import { useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';

/**
 * Handle app version checking and update flow
 * - Auto check for updates on mount
 * - Report version to backend after login
 * - Listen for unsupported version events
 * - Manage optional update modal state
 */
export function useVersionCheck(user: User | null, token: string | null) {
  const {
    isChecking,
    downloadStatus,
    downloadProgress,
    updateAvailable,
    isForceUpdate,
    latestVersion,
    error,
    checkForUpdate,
    startUpdate,
    applyVersionRequirement,
    dismissError,
    ignoreUpdate,
  } = useAppVersion();

  const [versionChecked, setVersionChecked] = useState(false);
  const [showOptionalUpdate, setShowOptionalUpdate] = useState(false);

  // Check for app updates on mount (Android APK only)
  useEffect(() => {
    if (!Config.CAN_AUTO_CHECK_APP_UPDATES) {
      setVersionChecked(true);
      logger.info('[Update] Auto check skipped for current build');
      return;
    }

    const checkUpdate = async () => {
      try {
        await checkForUpdate(CURRENT_VERSION_CODE);
      } catch (e) {
        logger.error('Failed to check for updates:', e);
        errorReportingService.captureException(
          e instanceof Error ? e : new Error('Failed to check for updates'),
          {
            source: 'root.checkUpdate',
          }
        );
      } finally {
        setVersionChecked(true);
      }
    };
    checkUpdate();
  }, [checkForUpdate]);

  // Report App Version after login
  useEffect(() => {
    let reportTimer: ReturnType<typeof setTimeout>;

    if (user && token) {
      // Throttle version reporting to avoid congestion on startup
      reportTimer = setTimeout(() => {
        appVersionService
          .reportVersion(CURRENT_VERSION_CODE, CURRENT_VERSION_NAME, token)
          .catch((e) => {
            logger.error('Failed to report version:', e);
          });
      }, 5000);
    }

    return () => {
      if (reportTimer) clearTimeout(reportTimer);
    };
  }, [user, token]);

  // Listen for unsupported version events
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      Events.APP_VERSION_UNSUPPORTED,
      (payload?: {
        details?: { latestVersion?: typeof latestVersion };
        latestVersion?: typeof latestVersion;
      }) => {
        const forcedVersion =
          payload?.details?.latestVersion ?? payload?.latestVersion ?? null;
        applyVersionRequirement(forcedVersion ?? null);
      }
    );

    return () => {
      subscription.remove();
    };
  }, [applyVersionRequirement]);

  // Show update modal when available (and not forced)
  useEffect(() => {
    if (updateAvailable && !isForceUpdate) {
      setShowOptionalUpdate(true);
    }
  }, [updateAvailable, isForceUpdate]);

  return {
    isChecking,
    versionChecked,
    showOptionalUpdate,
    setShowOptionalUpdate,
    downloadStatus,
    downloadProgress,
    updateAvailable,
    isForceUpdate,
    latestVersion,
    error,
    startUpdate,
    dismissError,
    ignoreUpdate,
  };
}
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
npx tsc --noEmit src/hooks/useVersionCheck.ts
```

Expected: No errors

- [ ] **Step 3: Commit hook**

```bash
git add src/hooks/useVersionCheck.ts
git commit -m "refactor: extract useVersionCheck hook"
```

---

## Task 5: Extract useNotificationSetup Hook

**Files:**
- Create: `src/hooks/useNotificationSetup.ts`
- Reference: `app/_layout.tsx:186-296`

- [ ] **Step 1: Create useNotificationSetup hook file**

File: `src/hooks/useNotificationSetup.ts`

```typescript
import { queryClient, queryKeys } from '@/lib/queryClient';
import {
  addNotificationListeners,
  getInitialNotificationData,
} from '@/services/PushNotificationService';
import { presentForegroundNotification } from '@/services/ForegroundNotificationService';
import { errorReportingService } from '@/services/ErrorReportingService';
import { eventManager } from '@/utils/EventManager';
import { presentInfoMessage } from '@/utils/errorPresenter';
import { logger } from '@/utils/logger';
import { Href, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Setup push notification handling
 * - Initial notification (app opened from killed state)
 * - Foreground notification presentation
 * - Notification tap navigation
 * - Query invalidation on new notifications
 */
export function useNotificationSetup() {
  const router = useRouter();

  useEffect(() => {
    let notificationNavigationTimer: ReturnType<typeof setTimeout> | undefined;

    const validRoutes = [
      '/dashboard',
      '/work-order',
      '/barang',
      '/absensi',
      '/profile',
      '/notifications',
      '/lembur',
      '/izin',
      '/chat',
      '/holidays',
    ];

    const handleNotificationNavigation = (data: { url?: string }) => {
      if (!data?.url) return;

      try {
        const url = data.url;
        const isValidRoute =
          validRoutes.some(
            (r) =>
              url === r ||
              url.startsWith(r + '/') ||
              url.startsWith('/(app)' + r)
          ) ||
          url.startsWith('/work-order-detail/') ||
          url.startsWith('/chat/');

        if (isValidRoute) {
          router.push(url as Href);
        } else {
          logger.warn(
            'Invalid notification route, redirecting to dashboard:',
            url
          );
          router.replace('/(app)/dashboard');
        }
      } catch (e) {
        logger.error('Navigation failed:', e);
        errorReportingService.captureException(
          e instanceof Error ? e : new Error('Notification navigation failed'),
          {
            source: 'root.notificationNavigation',
            route: data.url,
          }
        );
        router.replace('/(app)/dashboard');
      }
    };

    const setupNotifications = async () => {
      if (Platform.OS === 'web') return;

      try {
        const initialNotificationData = await getInitialNotificationData();
        if (initialNotificationData) {
          logger.info(
            'App opened from notification (killed state):',
            initialNotificationData
          );
          notificationNavigationTimer = setTimeout(
            () => handleNotificationNavigation(initialNotificationData),
            500
          );
        }

        const cleanup = addNotificationListeners(
          async (notification) => {
            logger.info('Foreground notification:', notification.title);

            try {
              if (notification.title || notification.body) {
                await presentForegroundNotification(notification);
                presentInfoMessage(
                  notification.body ?? 'Anda menerima notifikasi baru.',
                  notification.title ?? 'Notifikasi Baru'
                );
              }
            } catch (error) {
              logger.error('Failed to render foreground notification:', error);
              errorReportingService.captureException(
                error instanceof Error
                  ? error
                  : new Error('Failed to render foreground notification'),
                {
                  source: 'root.foregroundNotification',
                }
              );
            } finally {
              queryClient.invalidateQueries({
                queryKey: queryKeys.notifications.list(),
              });
              queryClient.invalidateQueries({
                queryKey: queryKeys.notifications.unread(),
              });
            }
          },
          (response) => {
            logger.info('Notification tapped, data:', response.data);
            handleNotificationNavigation(response.data ?? {});
          }
        );

        eventManager.addListener('root_notifications', null, cleanup);
      } catch (error) {
        logger.error('Failed to setup notifications:', error);
        errorReportingService.captureException(
          error instanceof Error
            ? error
            : new Error('Failed to setup notifications'),
          {
            source: 'root.setupNotifications',
          }
        );
      }
    };

    void setupNotifications();

    return () => {
      if (notificationNavigationTimer) {
        clearTimeout(notificationNavigationTimer);
      }

      // Cleanup using EventManager
      eventManager.removeAllListeners('root_notifications');
    };
  }, [router]);
}
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
npx tsc --noEmit src/hooks/useNotificationSetup.ts
```

Expected: No errors

- [ ] **Step 3: Commit hook**

```bash
git add src/hooks/useNotificationSetup.ts
git commit -m "refactor: extract useNotificationSetup hook"
```

---

## Task 6: Extract useAuthRedirect Hook

**Files:**
- Create: `src/hooks/useAuthRedirect.ts`
- Reference: `app/_layout.tsx:298-364`

- [ ] **Step 1: Create useAuthRedirect hook file**

File: `src/hooks/useAuthRedirect.ts`

```typescript
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

  useEffect(() => {
    logger.auth(
      'Effect triggered. User:',
      !!user,
      'Segments:',
      segments,
      'Loading:',
      isLoading
    );

    if (isLoading) {
      logger.auth('Still loading, skipping redirect check');
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    const inAppGroup = segments[0] === '(app)';
    const inCustomerGroup = segments[0] === '(customer)';
    const isPublicRoute = segments[0] === 'kebijakan-privasi';

    logger.auth('Status:', {
      user: !!user,
      inAuthGroup,
      inAppGroup,
      inCustomerGroup,
      isPublicRoute,
      role: user?.role,
      segments,
    });

    // Debounce redirects to prevent loops during initialization
    const redirectTimer = setTimeout(() => {
      if (isPublicRoute) {
        logger.auth('Allowing public route:', segments[0]);
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
          segment: segments[0] ?? null,
          isPublicRoute,
        }
      );
    }, 100);

    return () => clearTimeout(redirectTimer);
  }, [user, segments, isLoading, router]);
}
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
npx tsc --noEmit src/hooks/useAuthRedirect.ts
```

Expected: No errors

- [ ] **Step 3: Commit hook**

```bash
git add src/hooks/useAuthRedirect.ts
git commit -m "refactor: extract useAuthRedirect hook"
```

---

## Task 7: Refactor app/_layout.tsx to Use Hooks

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Read current _layout.tsx structure**

```bash
wc -l app/_layout.tsx
```

Expected: ~442 lines

- [ ] **Step 2: Add imports for new hooks**

Add these imports after existing imports in `app/_layout.tsx`:

```typescript
import { useAppInitialization } from '@/hooks/useAppInitialization';
import { useVersionCheck } from '@/hooks/useVersionCheck';
import { useNotificationSetup } from '@/hooks/useNotificationSetup';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
```

- [ ] **Step 3: Replace RootLayoutNav function body**

Replace the entire `RootLayoutNav` function (lines ~38-423) with this simplified version:

```typescript
function RootLayoutNav() {
  const { user, token, isLoading: isAuthLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const isLoading = isAuthLoading;

  // Initialize app services
  useAppInitialization();

  // Handle version checking and updates
  const versionState = useVersionCheck(user, token);

  // Setup push notifications
  useNotificationSetup();

  // Handle auth-based redirects
  useAuthRedirect(user, segments, isLoading);

  // Show loading while checking auth or version
  if (isLoading || (versionState.isChecking && !versionState.versionChecked)) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-gray-900`}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  // Show force update screen if required
  if (versionState.updateAvailable && versionState.isForceUpdate && versionState.latestVersion) {
    return (
      <UpdateRequiredScreen
        latestVersion={versionState.latestVersion}
        downloadStatus={versionState.downloadStatus}
        downloadProgress={versionState.downloadProgress}
        error={versionState.error}
        onStartUpdate={versionState.startUpdate}
        onDismissError={versionState.dismissError}
      />
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <RealtimeProvider>
        <Slot />
      </RealtimeProvider>

      <EnvironmentIndicator />

      {/* Optional Update Modal */}
      {versionState.showOptionalUpdate && versionState.latestVersion && (
        <UpdateAvailableModal
          visible={versionState.showOptionalUpdate}
          latestVersion={versionState.latestVersion}
          downloadStatus={versionState.downloadStatus}
          downloadProgress={versionState.downloadProgress}
          error={versionState.error}
          onStartUpdate={versionState.startUpdate}
          onLater={() => {
            versionState.ignoreUpdate();
            versionState.setShowOptionalUpdate(false);
          }}
          onDismissError={versionState.dismissError}
        />
      )}
    </>
  );
}
```

- [ ] **Step 4: Verify TypeScript compilation**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 5: Verify ESLint**

```bash
npm run lint
```

Expected: No errors

- [ ] **Step 6: Check line count**

```bash
wc -l app/_layout.tsx
```

Expected: ~150-180 lines (down from 442)

- [ ] **Step 7: Commit refactored layout**

```bash
git add app/_layout.tsx
git commit -m "refactor: use custom hooks in root layout

- Extract initialization, version check, notifications, and auth redirect
- Reduce _layout.tsx from 442 to ~150 lines
- Improve maintainability and testability
- No behavior changes"
```

---

## Task 8: Manual Testing

**No files modified - verification only**

- [ ] **Step 1: Start development server**

```bash
npm start
```

Expected: Server starts without errors

- [ ] **Step 2: Test cold start**

- Open app from scratch
- Verify: App loads without crashes
- Verify: Performance monitor tracks startup

- [ ] **Step 3: Test login flow (employee)**

- Login with employee credentials
- Verify: Redirects to `/(app)/dashboard`
- Verify: Version reported to backend (check logs)

- [ ] **Step 4: Test login flow (customer)**

- Logout and login with customer credentials
- Verify: Redirects to `/(customer)/dashboard`

- [ ] **Step 5: Test push notification tap**

- Send test notification with deep link
- Tap notification
- Verify: Navigates to correct screen

- [ ] **Step 6: Test foreground notification**

- Keep app open
- Send test notification
- Verify: Toast message appears
- Verify: Notification count updates

- [ ] **Step 7: Test auth redirect (logged out)**

- Logout
- Try to access `/(app)/dashboard` directly
- Verify: Redirects to `/(auth)/login`

- [ ] **Step 8: Test public route**

- Navigate to `/kebijakan-privasi`
- Verify: Accessible without login

- [ ] **Step 9: Document test results**

All tests passed: ✅ / ❌

---

## Task 9: Bundle Size Analysis

**No files modified - analysis only**

- [ ] **Step 1: Run bundle analysis**

```bash
npx expo-bundle-visualizer
```

Expected: Opens browser with treemap visualization

- [ ] **Step 2: Capture findings**

Document in terminal or take screenshot:
- Top 5 largest dependencies
- Total bundle size
- Any obvious duplications
- Recommendations for future optimization

- [ ] **Step 3: Save analysis results**

Create summary (not committed):

```
Bundle Analysis Results (2026-05-10)
=====================================

Total Bundle Size: [X] MB

Top Dependencies:
1. [package-name] - [size]
2. [package-name] - [size]
3. [package-name] - [size]
4. [package-name] - [size]
5. [package-name] - [size]

Observations:
- [Any duplications found]
- [Optimization opportunities]

Recommendations:
- [Future work items]
```

---

## Verification Checklist

Run these commands to verify everything works:

- [ ] **TypeScript compilation**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **ESLint**

```bash
npm run lint
```

Expected: No errors

- [ ] **Git status**

```bash
git status
```

Expected: Clean working tree (all changes committed)

- [ ] **Line count verification**

```bash
wc -l app/_layout.tsx src/hooks/useAppInitialization.ts src/hooks/useVersionCheck.ts src/hooks/useNotificationSetup.ts src/hooks/useAuthRedirect.ts
```

Expected: 
- `app/_layout.tsx`: ~150-180 lines
- Each hook: ~80-150 lines
- Total: Similar to original, but better organized

---

## Success Criteria

- ✅ All APK files deleted (~1.8GB freed)
- ✅ `.env.example` fully documented
- ✅ 4 custom hooks created with single responsibility
- ✅ `app/_layout.tsx` reduced to ~150 lines
- ✅ No TypeScript errors
- ✅ No ESLint errors
- ✅ All manual tests pass
- ✅ Bundle analysis completed
- ✅ No behavior changes (app works identically)

---

## Rollback Plan

If issues arise, revert commits in reverse order:

```bash
# Revert layout refactor
git revert HEAD~1

# Revert individual hooks
git revert HEAD~2
git revert HEAD~3
git revert HEAD~4
git revert HEAD~5

# Revert env docs
git revert HEAD~6

# Revert APK cleanup (if needed)
git revert HEAD~7
```

Each commit is independent and can be reverted safely.

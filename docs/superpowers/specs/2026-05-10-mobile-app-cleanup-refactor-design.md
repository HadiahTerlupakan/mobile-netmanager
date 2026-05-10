# Mobile App Cleanup & Refactor Design

**Date:** 2026-05-10  
**Author:** Claude (Sonnet 4.6)  
**Status:** Pending Review

## Overview

Perbaikan kualitas kode dan konfigurasi aplikasi mobile RADPRO NetManager berdasarkan hasil audit teknis. Fokus pada cleanup artefak build, refactoring file kompleks, dan perbaikan environment configuration.

## Context

Dari audit aplikasi mobile, ditemukan beberapa area yang perlu diperbaiki:

1. **APK artefacts** (~1.8GB) di working directory yang tidak perlu
2. **Root layout complexity** (`app/_layout.tsx` 442 baris) yang sulit di-maintain
3. **Environment config** yang kurang eksplisit untuk API base URL
4. **Bundle size** yang belum dianalisis untuk optimasi

Stack saat ini:
- React Native 0.81.5 + Expo SDK 54
- Expo Router (file-based navigation)
- TanStack Query v5 (offline-first)
- TypeScript strict mode
- Config abstraction sudah ada di `src/constants/Config.ts`

## Goals

1. **Cleanup repository** dari binary files yang tidak perlu
2. **Improve maintainability** dengan memecah logic kompleks
3. **Explicit environment config** untuk deployment yang lebih jelas
4. **Visibility** terhadap bundle size untuk optimasi masa depan

## Non-Goals

- Tidak mengubah behavior aplikasi
- Tidak mengubah provider tree structure
- Tidak melakukan optimasi bundle otomatis (hanya analisis)
- Tidak menyentuh git history (APK tidak ter-track)

## Design

### 1. APK Cleanup

**Problem:**
- 9 file APK (~1.8GB total) di working directory
- File sudah di-ignore di `.gitignore` (line 61: `*.apk`)
- Tidak ter-track di git, jadi tidak perlu cleanup history

**Solution:**
```bash
# Hapus semua APK files
rm -f *.apk

# Verifikasi .gitignore sudah ada rule (sudah ada di line 61)
# Tidak perlu tambah lagi
```

**Verification:**
- `ls *.apk` tidak menemukan file
- `git status` bersih atau hanya menunjukkan perubahan yang kita buat

### 2. Refactor `app/_layout.tsx`

**Problem:**
- File 442 baris dengan multiple responsibilities
- Sulit di-test dan di-maintain
- Logic tercampur: initialization, version check, notifications, auth redirect

**Solution: Extract Custom Hooks**

Pecah menjadi 4 custom hooks dengan single responsibility:

#### `src/hooks/useAppInitialization.ts`
**Responsibility:** Database init, notification channel, sync monitoring, performance tracking

```typescript
export function useAppInitialization() {
  useEffect(() => {
    performanceMonitor.start('App Startup');
    
    const initServices = async () => {
      await DatabaseService.initDatabase();
      await ensureForegroundNotificationChannel();
      
      setTimeout(() => {
        SyncService.startMonitoring();
      }, 1000);
    };
    
    initServices();
    
    return () => {
      performanceMonitor.stop('App Startup');
      SyncService.stopMonitoring();
    };
  }, []);
}
```

#### `src/hooks/useVersionCheck.ts`
**Responsibility:** App version checking, update flow, version reporting

```typescript
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
  
  // Check for updates on mount
  useEffect(() => { /* ... */ }, []);
  
  // Report version after login
  useEffect(() => { /* ... */ }, [user, token]);
  
  // Listen for unsupported version events
  useEffect(() => { /* ... */ }, []);
  
  // Show optional update modal
  useEffect(() => { /* ... */ }, [updateAvailable, isForceUpdate]);
  
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

#### `src/hooks/useNotificationSetup.ts`
**Responsibility:** Push notification handling, deep linking, foreground presentation

```typescript
export function useNotificationSetup(router: ReturnType<typeof useRouter>) {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    
    const setupNotifications = async () => {
      const initialData = await getInitialNotificationData();
      if (initialData) {
        setTimeout(() => handleNavigation(initialData), 500);
      }
      
      const cleanup = addNotificationListeners(
        async (notification) => {
          await presentForegroundNotification(notification);
          presentInfoMessage(notification.body, notification.title);
          queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list() });
        },
        (response) => {
          handleNavigation(response.data ?? {});
        }
      );
      
      eventManager.addListener('root_notifications', null, cleanup);
    };
    
    setupNotifications();
    
    return () => {
      eventManager.removeAllListeners('root_notifications');
    };
  }, [router]);
}
```

#### `src/hooks/useAuthRedirect.ts`
**Responsibility:** Auth-based navigation logic

```typescript
export function useAuthRedirect(
  user: User | null,
  segments: string[],
  isLoading: boolean,
  router: ReturnType<typeof useRouter>
) {
  useEffect(() => {
    if (isLoading) return;
    
    const inAuthGroup = segments[0] === '(auth)';
    const inAppGroup = segments[0] === '(app)';
    const inCustomerGroup = segments[0] === '(customer)';
    const isPublicRoute = segments[0] === 'kebijakan-privasi';
    
    const redirectTimer = setTimeout(() => {
      if (isPublicRoute) return;
      
      if (!user && !inAuthGroup) {
        router.replace('/(auth)/login');
      } else if (user) {
        if (user.role === 'CUSTOMER' && !inCustomerGroup) {
          router.replace('/(customer)/dashboard');
        } else if (user.role !== 'CUSTOMER' && !inAppGroup) {
          router.replace('/(app)/dashboard');
        }
      }
      
      errorReportingService.addBreadcrumb('navigation', 'Root redirect evaluated', {
        hasUser: !!user,
        segment: segments[0] ?? null,
        isPublicRoute,
      });
    }, 100);
    
    return () => clearTimeout(redirectTimer);
  }, [user, segments, isLoading, router]);
}
```

#### Updated `app/_layout.tsx`
**Result:** Thin orchestration layer (~120-150 lines)

```typescript
function RootLayoutNav() {
  const { user, token, isLoading: isAuthLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  
  // Custom hooks handle all the complexity
  useAppInitialization();
  const versionState = useVersionCheck(user, token);
  useNotificationSetup(router);
  useAuthRedirect(user, segments, isAuthLoading, router);
  
  // Render logic (loading, force update, main app)
  if (isAuthLoading || (versionState.isChecking && !versionState.versionChecked)) {
    return <LoadingScreen />;
  }
  
  if (versionState.updateAvailable && versionState.isForceUpdate && versionState.latestVersion) {
    return <UpdateRequiredScreen {...versionState} />;
  }
  
  return (
    <>
      <StatusBar style="light" />
      <RealtimeProvider>
        <Slot />
      </RealtimeProvider>
      <EnvironmentIndicator />
      {versionState.showOptionalUpdate && versionState.latestVersion && (
        <UpdateAvailableModal {...versionState} />
      )}
    </>
  );
}
```

**Benefits:**
- Each hook has single responsibility
- Easier to test in isolation
- Reusable across components
- Clear separation of concerns
- Main layout file becomes readable

**Risks & Mitigation:**
- **Risk:** Hook dependencies might cause unexpected re-renders
  - **Mitigation:** Proper memoization with `useCallback`/`useMemo`
- **Risk:** Initialization order might change behavior
  - **Mitigation:** Keep same useEffect order, verify with manual testing
- **Risk:** Auth redirect logic might break
  - **Mitigation:** Preserve exact same conditions and timing

### 3. Environment Configuration

**Problem:**
- `Config.ts` sudah ada tapi tidak eksplisit di `.env.example`
- Developer baru tidak tahu environment variables apa yang tersedia
- API URL logic tersembunyi di `Config.ts`

**Solution:**

Update `.env.example`:
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
EXPO_DEBUG=true
EXPO_DEBUG_SOCKET=false

# Error Reporting (otomatis true di production)
EXPO_PUBLIC_ENABLE_ERROR_REPORTING=false

# Firebase (required for RealtimeService + PresenceService)
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyDihrl023fOQnXf8oZ7A2rU7YxzJzQN5Lc
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=netmanager-96742.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=netmanager-96742
EXPO_PUBLIC_FIREBASE_DATABASE_URL=https://netmanager-96742-default-rtdb.asia-southeast1.firebasedatabase.app
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=netmanager-96742.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=43187781340
EXPO_PUBLIC_FIREBASE_APP_ID=1:43187781340:web:461fc10875b35538e67e19
```

**No code changes needed** — `Config.ts` sudah handle semua logic dengan baik.

### 4. Bundle Size Analysis

**Problem:**
- Tidak ada visibility terhadap ukuran bundle
- Tidak tahu dependencies mana yang paling besar
- Sulit identifikasi area optimasi

**Solution:**

Install dan jalankan analyzer:
```bash
npx expo-bundle-visualizer
```

**Output yang diharapkan:**
- Treemap visualization dari bundle
- List dependencies terbesar
- Identifikasi duplikasi
- Rekomendasi optimasi (untuk future work)

**Scope:**
- **Hanya analisis dan laporan**
- **Tidak melakukan optimasi otomatis**
- Hasil disimpan sebagai screenshot/report untuk referensi

## Implementation Plan

### Phase 1: Cleanup (Low Risk)
1. Hapus APK files: `rm -f *.apk`
2. Verifikasi `.gitignore` (sudah ada rule)
3. Commit: "chore: remove local APK build artifacts"

### Phase 2: Environment Config (Low Risk)
1. Update `.env.example` dengan dokumentasi lengkap
2. Commit: "docs: improve environment variable documentation"

### Phase 3: Refactor Layout (Medium Risk)
1. Create `src/hooks/useAppInitialization.ts`
2. Create `src/hooks/useVersionCheck.ts`
3. Create `src/hooks/useNotificationSetup.ts`
4. Create `src/hooks/useAuthRedirect.ts`
5. Update `app/_layout.tsx` to use hooks
6. Manual testing:
   - Login flow
   - Push notification navigation
   - Version check flow
   - Auth redirect (customer vs employee)
7. Commit: "refactor: extract layout logic into custom hooks"

### Phase 4: Bundle Analysis (No Risk)
1. Run `npx expo-bundle-visualizer`
2. Capture results
3. Document findings (tidak commit, hanya laporan)

## Testing Strategy

### Manual Testing Checklist
- [ ] App startup (cold start)
- [ ] Login flow (employee & customer)
- [ ] Push notification tap navigation
- [ ] Foreground notification display
- [ ] Version check (optional update modal)
- [ ] Auth redirect (logged in vs logged out)
- [ ] Deep link dari notification

### Verification Points
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] No ESLint errors: `npm run lint`
- [ ] App builds successfully: `expo prebuild`
- [ ] All manual tests pass

## Rollback Plan

Jika ada masalah setelah refactor:
```bash
git revert <commit-hash>
```

Karena perubahan di-commit per phase, rollback bisa granular.

## Success Metrics

- ✅ Repository size berkurang ~1.8GB (lokal)
- ✅ `app/_layout.tsx` < 200 baris
- ✅ 4 custom hooks dengan single responsibility
- ✅ `.env.example` terdokumentasi lengkap
- ✅ Bundle analysis report tersedia
- ✅ Semua manual tests pass
- ✅ No regression di production behavior

## Future Work (Out of Scope)

- Bundle optimization berdasarkan hasil analisis
- E2E testing dengan Detox/Maestro
- Performance monitoring integration
- Code splitting untuk lazy loading

## References

- Audit report: hasil analisis awal aplikasi mobile
- React Native best practices: custom hooks pattern
- Expo documentation: environment variables

# Phase 2 Execution Plan - Mobile Error UX Consistency

## Objective

Menstandarkan pesan error user-facing di mobile app melalui tiga langkah:

1. memperkaya taxonomy dan metadata di `src/utils/errorHandling.ts`
2. menambahkan shared presenter helper untuk alert/error UX
3. memigrasikan screen prioritas yang paling padat error flow

Dokumen ini adalah turunan eksekusi dari `plans/MOBILE_ERROR_REPORTING_UX_STRATEGY.md`.

---

## Scope

### In scope

- `src/utils/errorHandling.ts`
- helper baru seperti `src/utils/errorPresenter.ts`
- helper alert yang sudah ada (`src/utils/alert.ts`) bila perlu diadaptasi
- `src/hooks/queries/useApiMutation.ts`
- screen prioritas:
  - `app/(auth)/login.tsx`
  - `app/(customer)/tagihan/index.tsx`
  - `app/(customer)/tickets/index.tsx`
  - `app/(app)/dashboard.tsx`
  - `app/(app)/work-order.tsx`
  - `app/(app)/change-password.tsx`

### Out of scope

- migrasi seluruh screen sekaligus
- perubahan backend phase 1
- banner/toast system baru lintas app bila belum dibutuhkan

---

## Current Findings

### Existing centralized pieces

- `src/utils/errorHandling.ts` sudah punya mapping dasar dan extractor backend message
- `src/utils/alert.ts` sudah punya wrapper tipis di atas `Alert.alert`, tapi belum mengenal taxonomy/policy
- `src/hooks/queries/useApiMutation.ts` sudah cukup dekat dengan pusat presentasi error, tetapi masih memanggil `Alert.alert` langsung

### Priority screen characteristics

- `login.tsx`
  - campuran status-specific alert, event app-update, dan fallback generic
- `tagihan/index.tsx`
  - screen paling padat untuk error UX; banyak operasi payment/coupon/upload/copy
- `tickets/index.tsx`
  - relatif mudah dimigrasikan; alert set kecil dan user-facing
- `dashboard.tsx`
  - lebih banyak messaging permission/info daripada error network langsung
- `work-order.tsx`
  - campuran confirm dialog, offline queue info, dan failure message
- `change-password.tsx`
  - flow sederhana; kandidat early adopter yang aman

---

## Target Architecture

### 1. Centralized taxonomy with policy metadata

`src/utils/errorHandling.ts` tidak hanya mengembalikan `title/message`, tetapi juga metadata presentasi.

### Proposed type

```ts
export interface ErrorPresentation {
  title: string;
  message: string;
  action?: string;
  severity: 'info' | 'warning' | 'error';
  reportable: boolean;
  retryable: boolean;
  audience: 'user' | 'developer' | 'both';
}
```

### Required categories

- `network`
- `timeout`
- `offline`
- `auth`
- `permission`
- `validation`
- `conflict`
- `not_found`
- `rate_limit`
- `update_required`
- `server`
- `unknown`

### Rules

- backend raw message hanya dipakai jika aman
- message teknis panjang tetap disanitasi
- setiap kategori punya default title yang konsisten

---

## Shared Presenter Design

### New helper

Tambahkan helper baru, misalnya:

- `src/utils/errorPresenter.ts`

### Responsibilities

1. menerima `unknown error`
2. resolve via `getUserFriendlyError()` atau presentation override
3. memutuskan kapan memakai `Alert.alert`
4. opsi mengirim ke `ErrorReportingService`
5. menjaga copy/title tetap konsisten

### Suggested API

```ts
presentAppError(error, {
  screen: 'CustomerTicketsScreen',
  route: '/(customer)/tickets',
  report: true,
  fallbackTitle: 'Gagal',
})

presentPresentation({
  title: 'Berhasil',
  message: 'Tiket berhasil dibuat.',
  severity: 'info',
})
```

### Suggested implementation split

- `resolveErrorPresentation(error, options)`
- `showPresentation(presentation, options)`
- `presentAppError(error, options)`

Ini menjaga testability lebih baik daripada helper tunggal yang besar.

---

## Migration Strategy

### Batch 1 - low risk, high clarity

1. `app/(app)/change-password.tsx`
2. `app/(customer)/tickets/index.tsx`
3. `app/(app)/dashboard.tsx`

Reason:

- flow lebih kecil
- lebih sedikit alert bercabang
- bagus untuk membuktikan API presenter

### Batch 2 - medium complexity

1. `app/(auth)/login.tsx`
2. `app/(app)/work-order.tsx`

Reason:

- butuh penanganan confirm + status override + offline success/error mix

### Batch 3 - highest complexity

1. `app/(customer)/tagihan/index.tsx`

Reason:

- paling padat dan paling banyak variasi alert/payment state
- sebaiknya dimigrasikan setelah presenter helper sudah stabil

### Shared hook migration

- migrasikan `src/hooks/queries/useApiMutation.ts` agar presenter helper dipakai secara terpusat
- ini akan menurunkan kebutuhan perubahan manual di screen-screen mutation consumer berikutnya

---

## Testing Strategy

### New unit tests

1. `errorHandling.ts`
   - taxonomy mapping
   - backend message extraction
   - sanitization behavior

2. `errorPresenter.ts`
   - resolve presentation from unknown error
   - report/no-report policy
   - alert dispatch behavior

### Updated tests

1. `useApiMutation` tests
   - ensure mutation error path uses shared presenter behavior

### Screen tests (targeted)

Minimal coverage for:

- `change-password`
- `tickets`
- `login`

Jika screen tests terlalu berat, gunakan helper-level tests + spot-check on behavior.

---

## Implementation Order

1. expand `src/utils/errorHandling.ts`
2. add `src/utils/errorPresenter.ts`
3. adapt or deprecate `src/utils/alert.ts` integration path
4. migrate `src/hooks/queries/useApiMutation.ts`
5. migrate batch 1 screens
6. verify
7. migrate batch 2 screens
8. verify
9. migrate batch 3 screen (`tagihan`)
10. full verification

---

## Verification Checklist

After implementation:

1. `npm run lint`
2. `npx tsc --noEmit`
3. `npm test -- --runInBand --passWithNoTests`
4. `npx expo export --platform android --output-dir dist-audit-error-handling`
5. manual spot-check high-priority flows:
   - login failure
   - ticket create failure
   - work-order claim failure/offline
   - tagihan upload/payment/coupon failure
   - change-password failure

---

## Success Criteria

Phase 2 dianggap selesai bila:

1. taxonomy error lebih kaya dan eksplisit
2. shared presenter helper sudah dipakai di hook/screen prioritas
3. title/message error utama menjadi konsisten
4. screen prioritas tidak lagi bergantung pada banyak `Alert.alert` raw untuk failure path
5. lint, typecheck, test, dan export tetap hijau

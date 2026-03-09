# Mobile Error Reporting and UX Strategy

## NetManager Mobile Application - Free Reporting and Error UX Plan

**Version:** 1.0  
**Date:** 9 Maret 2026  
**Target Audience:** Mobile and Backend Development Team

---

## Table of Contents

1. [Overview](#overview)
2. [Current State](#current-state)
3. [Goals](#goals)
4. [Recommended Architecture](#recommended-architecture)
5. [Error Taxonomy and Message Strategy](#error-taxonomy-and-message-strategy)
6. [Screen Prioritization](#screen-prioritization)
7. [Backend Reporting Design](#backend-reporting-design)
8. [Mobile Implementation Design](#mobile-implementation-design)
9. [Implementation Phases](#implementation-phases)
10. [Testing and Verification](#testing-and-verification)
11. [Risks and Mitigations](#risks-and-mitigations)
12. [Success Criteria](#success-criteria)

---

## Overview

Dokumen ini mendefinisikan strategi lanjutan untuk membuat error handling aplikasi mobile NetManager lebih jelas bagi user dan lebih mudah dianalisis oleh tim developer tanpa bergantung pada layanan berbayar seperti Sentry atau Crashlytics.

Strategi yang dipilih adalah:

1. **Backend-owned reporting** untuk error production
2. **Centralized error-message registry** untuk menjaga konsistensi pesan user
3. **Shared error presenter** untuk mengurangi `Alert.alert` ad hoc per screen
4. **Phased migration** agar perubahan aman dan tidak mengganggu flow operasional utama

Pendekatan ini cocok dengan kondisi repo saat ini karena:

- mobile app sudah memiliki `ErrorReportingService` sebagai seam reporting
- user-facing mapping sudah mulai terpusat di `src/utils/errorHandling.ts`
- backend sibling repo `netmanager/` sudah memiliki pola route mobile seperti `/api/mobile/app-version/report`
- tim tidak ingin memakai layanan berbayar

---

## Current State

### What already exists

- `src/services/ErrorReportingService.ts`
  - Sudah menjadi titik masuk terpusat untuk `captureException`, `captureMessage`, breadcrumbs, tags, dan user context
  - Saat ini masih bersifat local logging only

- `src/utils/errorHandling.ts`
  - Sudah berisi `getUserFriendlyError()` dan `extractApiErrorMessage()`
  - Sudah mulai menjadi source of truth untuk sebagian pesan user

- `src/lib/queryClient.ts`
  - Sudah mengirim query/mutation failure ke `ErrorReportingService`

- `app/_layout.tsx` dan error boundaries
  - Sudah menginisialisasi reporting, boundary root, dan beberapa bootstrap capture

### Current problems

- Pesan error UX masih tersebar luas dalam bentuk `Alert.alert(...)`
- Judul dan copy error tidak konsisten antar screen
- Sebagian flow masih memakai pesan backend mentah atau string hardcoded
- Belum ada sink production untuk error report dari device ke backend tim sendiri
- Belum ada satu helper presentasi error yang dipakai lintas screen

### Important screen clusters with dense error UX

- `app/(auth)/login.tsx`
- `app/(customer)/tagihan/index.tsx`
- `app/(customer)/tickets/index.tsx`
- `app/(app)/dashboard.tsx`
- `app/(app)/work-order.tsx`
- `app/(app)/work-order-detail/[id].tsx`
- `app/(app)/change-password.tsx`
- `app/(app)/absensi.tsx`

---

## Goals

### Primary goals

1. Membuat alasan error lebih jelas untuk user di screen prioritas
2. Membuat error production bisa dianalisis tim tanpa SaaS berbayar
3. Menyatukan registry pesan error agar maintainability lebih baik
4. Mengurangi duplikasi alert/copy/error decision di screen level

### Secondary goals

1. Menjaga perilaku offline/auth/sync yang sudah diperbaiki sebelumnya
2. Membedakan error yang perlu ditampilkan ke user vs cukup dicatat untuk developer
3. Menyediakan roadmap implementasi lintas mobile dan backend

### Non-goals

1. Tidak melakukan rewrite semua screen dalam satu batch besar
2. Tidak membangun observability platform yang kompleks sejak awal
3. Tidak menampilkan stack trace mentah ke end user production

---

## Recommended Architecture

### Chosen approach

**Backend-owned reporting + centralized message registry + shared error presenter**

### Why this is the best fit

- Gratis dan tidak bergantung pada vendor eksternal
- Selaras dengan struktur existing repo mobile dan backend
- Bisa diimplementasikan bertahap
- Memberikan manfaat ganda: UX lebih rapi dan debugging production lebih mudah

### High-level flow

1. Error terjadi di screen, query, mutation, boundary, atau bootstrap
2. Error dinormalisasi melalui `errorHandling.ts`
3. Error dipresentasikan ke user melalui helper presentasi bersama
4. Error penting dikirim ke `ErrorReportingService`
5. `ErrorReportingService` memutuskan:
   - simpan breadcrumb/tag/user/context lokal
   - kirim event tertentu ke backend route mobile
6. Backend menyimpan event error dan menyediakan cara baca internal untuk tim

---

## Error Taxonomy and Message Strategy

`src/utils/errorHandling.ts` akan menjadi registry utama untuk pesan error user.

### Proposed taxonomy

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
- `background_task`
- `unknown`

### Proposed registry shape

```ts
type AppErrorKey =
  | 'network'
  | 'timeout'
  | 'offline'
  | 'auth'
  | 'permission'
  | 'validation'
  | 'conflict'
  | 'not_found'
  | 'rate_limit'
  | 'update_required'
  | 'server'
  | 'background_task'
  | 'unknown';

interface ErrorPresentationConfig {
  title: string;
  message: string;
  actionLabel?: string;
  severity: 'info' | 'warning' | 'error';
  reportable: boolean;
  retryable: boolean;
  audience: 'user' | 'developer' | 'both';
}
```

### Rules for user-facing messages

1. Jangan menampilkan stack trace mentah ke user production
2. Jangan menampilkan pesan backend mentah kecuali aman dan sudah divalidasi
3. Gunakan judul yang konsisten per kategori
4. Gunakan satu pola bahasa Indonesia yang konsisten
5. Untuk error recoverable, beri arahan action jika relevan

### Rules for developer-facing reporting

1. Simpan message asli, stack, route, user, tenant, version, dan context teknis
2. Simpan breadcrumbs ringkas dari flow sebelum error
3. Tandai severity dan source agar mudah dipilah

---

## Screen Prioritization

Standarisasi UX tidak dilakukan sekaligus. Lakukan berdasarkan dampak user dan kepadatan error flow.

### Phase A screens (highest value)

1. `app/(auth)/login.tsx`
2. `app/(customer)/tagihan/index.tsx`
3. `app/(customer)/tickets/index.tsx`
4. `app/(app)/dashboard.tsx`
5. `app/(app)/work-order.tsx`
6. `app/(app)/change-password.tsx`

### Phase B screens

1. `app/(app)/work-order-detail/[id].tsx`
2. `app/(app)/absensi.tsx`
3. `app/(app)/izin/form.tsx`
4. `app/(app)/lembur/index.tsx`
5. `app/(app)/marketing/canvasing/create.tsx`

### Migration principle

Setiap screen dipindahkan dari pola ini:

- inline `Alert.alert('Error', '...')`
- backend message langsung
- hardcoded success/error copy yang tidak konsisten

ke pola ini:

- `presentAppError(error, options)` untuk error
- helper success/info terpisah untuk UX yang konsisten

---

## Backend Reporting Design

### Target repo

Backend implementation direncanakan di sibling repo: `netmanager/`.

### Proposed route

- `POST /api/mobile/error-report`

### Minimal request payload

```json
{
  "message": "Network request failed",
  "kind": "network",
  "severity": "error",
  "source": "query",
  "screen": "CustomerTicketsScreen",
  "route": "/(customer)/tickets",
  "userId": "123",
  "tenant": "foo",
  "appVersion": "1.0.19+20",
  "platform": "android",
  "device": {
    "model": "...",
    "osVersion": "..."
  },
  "breadcrumbs": [],
  "context": {},
  "stack": "...",
  "occurredAt": "2026-03-09T10:00:00.000Z"
}
```

### Backend responsibilities

1. Validasi payload
2. Simpan event ke database atau log store internal
3. Tambahkan rate limiting sederhana
4. Hindari menerima noise berlebih dari error yang tidak penting
5. Sediakan query/admin view internal untuk membaca error event

### Suggested backend storage fields

- `id`
- `createdAt`
- `message`
- `kind`
- `severity`
- `source`
- `screen`
- `route`
- `userId`
- `tenant`
- `platform`
- `appVersion`
- `stack`
- `breadcrumbsJson`
- `contextJson`

### Suggested backend rules

- Keep last N breadcrumbs only
- Deduplicate burst events if needed
- Ignore obvious low-value noise if configured
- Protect endpoint with auth where relevant

---

## Mobile Implementation Design

### 1. ErrorReportingService evolution

`src/services/ErrorReportingService.ts` akan di-upgrade dari local logger wrapper menjadi adapter ganda:

- `local transport` untuk logger existing
- `backend transport` untuk production reporting

#### Proposed behavior

- always keep breadcrumbs, tags, user context locally
- only send reportable events to backend
- throttle or batch if needed later
- fail closed: reporting failure tidak boleh mengganggu UX utama

### 2. Shared error presenter

Tambahkan helper baru, misalnya:

- `src/utils/errorPresenter.ts`

#### Proposed responsibilities

1. Terima `unknown error`
2. Gunakan `getUserFriendlyError()`
3. Pilih presentasi yang sesuai (`Alert`, silent, banner nanti jika dibutuhkan)
4. Integrasi opsional dengan `ErrorReportingService`

#### Proposed API

```ts
presentAppError(error, {
  screen: 'CustomerTicketsScreen',
  route: '/(customer)/tickets',
  report: true,
  fallbackTitle: 'Gagal',
});
```

### 3. Registry and policy split

Pisahkan dua concern:

- `mapping`: error apa jadi pesan apa
- `policy`: error mana yang tampil ke user, mana yang cukup dilaporkan

Contoh policy:

- `validation` -> tampil ke user, tidak perlu report besar
- `network timeout` -> tampil ke user, report jika sering terjadi
- `server` -> tampil ke user + report
- `bootstrap crash` -> report + fallback UI
- `background sync failure` -> log/report, user-facing hanya jika relevan

### 4. Query and mutation integration

Integrasikan presenter pada tempat yang sudah semi-terpusat:

- `src/lib/queryClient.ts`
- `src/hooks/queries/useApiMutation.ts`
- selected custom hooks or screen mutations

Goal-nya adalah mengurangi duplikasi `Alert.alert` langsung di screen.

---

## Implementation Phases

### Phase 1: Backend-owned reporting foundation

**Objective:** membuat jalur error production gratis dan aman.

#### Mobile tasks

1. Tambah backend transport di `src/services/ErrorReportingService.ts`
2. Tambah config enable/disable reporting per environment
3. Tambah payload normalizer untuk event reportable
4. Pastikan root layout dan boundaries mengirim event ke transport baru

#### Backend tasks (`netmanager/`)

1. Buat route `POST /api/mobile/error-report`
2. Tambah schema validasi payload
3. Simpan event ke DB atau storage internal
4. Tambah auth/rate limit dasar

#### Success criteria

- error penting dari mobile masuk ke backend
- failure reporting tidak merusak UX app
- payload punya enough context untuk debugging

### Phase 2: Centralized message registry hardening

**Objective:** memastikan semua kategori error utama punya copy dan policy yang konsisten.

#### Tasks

1. Rapikan taxonomy di `src/utils/errorHandling.ts`
2. Tambah metadata `severity`, `reportable`, `retryable`, `audience`
3. Audit semua message hardcoded dan petakan ke kategori yang benar

#### Success criteria

- kategori utama tercover
- tidak ada pesan teknis mentah yang bocor di flow utama

### Phase 3: Shared presenter and high-impact screens

**Objective:** mengurangi duplikasi alert dan standarisasi UX di screen prioritas.

#### Tasks

1. Tambah `src/utils/errorPresenter.ts`
2. Migrasikan screen prioritas phase A
3. Standarkan judul, action label, dan fallback copy

#### Success criteria

- screen prioritas memakai presenter bersama
- copy error utama konsisten

### Phase 4: Broader screen migration

**Objective:** lanjutkan migrasi ke screen operasional lain dengan risiko minimal.

#### Tasks

1. Migrasikan phase B screens
2. Rapikan helper success/info jika perlu
3. Kurangi `Alert.alert` raw yang tersisa

#### Success criteria

- mayoritas screen operasional sudah memakai presenter dan registry pusat

### Phase 5: Internal observability view

**Objective:** memudahkan tim membaca error mobile dari backend.

#### Tasks

1. Tambah admin list/filter view di backend
2. Filter by severity, route, user, version, tenant
3. Tambah basic search by message or date range

#### Success criteria

- tim support/dev bisa melihat error production tanpa membuka device user

---

## Testing and Verification

### Mobile

1. Unit test untuk `errorHandling.ts`
2. Unit test untuk `ErrorReportingService` backend transport behavior
3. Unit test untuk presenter helper
4. Regression test untuk screen prioritas yang dimigrasi
5. Lint, typecheck, Jest, Expo export

### Backend

1. Route validation test
2. Auth/rate-limit test
3. Persistence test
4. Error payload truncation/sanitization test jika diperlukan

### Manual verification

1. Simulasikan network timeout
2. Simulasikan server 500
3. Simulasikan unauthorized/logout flow
4. Simulasikan bootstrap error
5. Verifikasi event tercatat di backend
6. Verifikasi copy yang muncul ke user konsisten

---

## Risks and Mitigations

### Risk 1: Too much reporting noise

**Mitigation:**

- report hanya kategori penting
- batasi breadcrumbs
- tambahkan rate limiting dan filter severity

### Risk 2: Rewriting too many screens at once

**Mitigation:**

- gunakan phased rollout
- migrasikan hanya screen paling padat dulu

### Risk 3: Reporting endpoint failure affects app flow

**Mitigation:**

- reporting harus best effort
- never block user flow on report submission

### Risk 4: Backend storage grows too quickly

**Mitigation:**

- simpan field penting saja
- retention policy atau cleanup job nanti

---

## Success Criteria

Strategi ini dianggap berhasil jika:

1. Tim bisa melihat error production mobile dari backend sendiri
2. Screen prioritas menampilkan pesan error yang konsisten dan mudah dipahami
3. `ErrorReportingService` menjadi reporting seam nyata, bukan logger-only
4. Jumlah `Alert.alert` ad hoc di screen prioritas berkurang signifikan
5. Mapping error -> pesan user -> reporting policy menjadi jelas dan maintainable

---

## Recommended Next Execution Order

Urutan implementasi yang direkomendasikan:

1. **Backend route + mobile reporting transport**
2. **Registry hardening di `errorHandling.ts`**
3. **Shared presenter helper**
4. **Migrasi screen phase A**
5. **Backend internal viewer / query page**

Ini memberikan dampak production paling cepat tanpa memaksa rewrite total seluruh app di awal.

# Rencana Migrasi Multi-Tenant

## Analisis Saat Ini
Aplikasi telah dimigrasikan dari konfigurasi URL API statis ke arsitektur **Dynamic Base URL** untuk mendukung multi-tenancy.

## Status Implementasi

### 1. Persiapan & State Management
- [x] Buat `TenantService` untuk mengelola penyimpanan URL tenant menggunakan `SecureStore`.
- [x] Buat `TenantContext` untuk menyediakan state tenant secara global ke aplikasi.

### 2. UI Updates
- [x] Buat screen `TenantSelectionScreen` (`app/tenant-selection.tsx`).
    - [x] Input: Domain/URL Server.
    - [x] Validasi: Ping ke `/api/mobile/version` untuk memastikan server valid.
- [x] Update `LoginScreen` (`app/(auth)/login.tsx`).
    - [x] Menampilkan URL server yang sedang aktif.
    - [x] Tombol "Ganti Server" untuk mereset tenant.

### 3. Network Layer Update
- [x] Refactor `src/services/api.ts`:
    - [x] Menggunakan interceptor untuk inject Base URL dinamis dari `TenantService`.
- [x] Update Services lain agar kompatibel:
    - [x] `AppVersionService`: Download update dari tenant URL.
    - [x] `UploadService`: Upload file ke tenant URL.
    - [x] `SocketContext`: Connect socket.io ke tenant URL.
    - [x] `SyncService`: Background sync ke tenant URL.
    - [x] `Dashboard` & `Profile`: Dynamic image URLs.

### 4. Konfigurasi
- [x] Update `src/constants/Config.ts`: Hanya digunakan sebagai fallback/dev helper, tidak lagi sebagai source of truth utama untuk API calls di production.

## Verifikasi
- Aplikasi akan redirect ke halaman pemilihan tenant jika belum diset.
- User dapat login ke server yang berbeda.
- Fitur utama (Socket, Upload, Sync) berjalan menggunakan URL dinamis.

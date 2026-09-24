# Desain: Tampilan Sales Karyawan + Presurvei di Aplikasi Mobile

**Tanggal**: 2026-09-24
**Status**: Disetujui per bagian dalam percakapan. Menunggu review dokumen.
**Repo**: `mobile-netmanager` (utama), `netmanager` (backend, perubahan kecil)

---

## 1. Tujuan

Sales karyawan (pegawai internal, bukan mitra) mendapat tampilan aplikasi yang
berbeda dari teknisi karyawan. Isinya fokus pada pekerjaan sales: mencatat kunjungan
dan kegiatan presurvei, mengelola prospek, dan canvasing. Absensi, chat, dan izin/cuti
tetap tersedia.

Data kegiatan yang dicatat dari HP mengisi laporan admin web yang sudah live
(Presurvei → Kegiatan Sales, peta, dashboard, laporan pencapaian). Hari ini laporan
itu kosong karena belum ada jalur pencatatan dari lapangan.

**Berhasil bila**:

- Setelah login, sales karyawan hanya melihat menu yang relevan untuk sales (tanpa
  Work Order dan Barang), dan teknisi karyawan tidak melihat perubahan apa pun.
- Sales bisa mencatat kunjungan dengan lokasi GPS asli dan foto bukti, termasuk saat
  sinyal lemah.
- Kegiatan yang dicatat muncul di layar admin Presurvei → Kegiatan Sales.

## 2. Keputusan user (percakapan 2026-09-24)

| Topik | Keputusan |
|---|---|
| Sales yang dimaksud | Sales **karyawan** (internal). Mitra tidak diubah. |
| Menu sales | Presurvei, Canvasing, Absensi, Chat, Izin/Cuti (+ Beranda, Profil) |
| Menu yang tidak untuk sales | Work Order, Barang |
| Teknisi | Tetap seperti sekarang; presurvei opsional lewat role (izin `m_presurvei`) |
| Isi tab Presurvei | Disetujui (bagian 4) |
| Beranda sales, fitur bersama, backend, rilis | Disetujui (bagian 5–8) |

**Asumsi pengontrol** (belum dikonfirmasi eksplisit):

- "Jadikan Canvasing" dari HP masuk tahap pertama. Pertanyaan tentang ini tidak
  dijawab, dan bagian yang memuatnya disetujui. Bagian ini bisa dipisah tanpa
  mengubah yang lain.
- Lembur tidak masuk menu sales karena tidak disebut user. Menambahkannya ke menu
  cepat cukup satu baris konfigurasi.

## 3. Persona dan tata letak

Tetap satu aplikasi dan satu APK. Tampilan dipilih dari data user login
(`src/context/AuthContext.tsx:15-29`: `employeeType`, `isSales`).

| Persona | Kondisi | Tab bawah | Menu cepat Beranda |
|---|---|---|---|
| **Sales karyawan** (baru) | `employeeType = KARYAWAN` && `isSales` | Beranda · Presurvei · Canvasing · Absensi · Profil | Chat, Izin/Cuti |
| Teknisi karyawan (tetap) | `KARYAWAN` && `!isSales` | Beranda · Work Order · Barang · Absensi · Profil (seperti sekarang) | Seperti sekarang. Presurvei muncul **hanya** bila punya `m_presurvei` |
| Mitra teknisi / mitra sales | tidak berubah | tidak berubah | tidak berubah |

Aturan:

1. **Persona menentukan tata letak, izin menentukan akses.** Setiap tab tetap
   diperiksa dengan `hasFeature` (`app/(app)/_layout.tsx:60-64`). Tab tanpa izin
   tampil terkunci seperti perilaku yang sudah ada (`_layout.tsx:108,118`).
2. **Mengikuti pola yang sudah ada.** Pemilihan tab bar per tipe ada di
   `_layout.tsx:131-137` (`MitraSalesTabBar`, `MitraTeknisiTabBar`). Multiplexer
   Beranda ada di `app/(app)/dashboard.tsx:409-427`. Sales karyawan mendapat pasangan
   baru: `KaryawanSalesTabBar` dan `KaryawanSalesDashboardScreen`.
3. **Fungsi penentu persona** adalah satu fungsi murni ber-test (mis.
   `tentukanPersona(user)`), dipakai tab bar, Beranda, dan menu cepat, sehingga tidak
   ada definisi ganda.
4. Tab Canvasing untuk sales tetap memakai gerbang yang ada (`m_canvasing` && `isSales`,
   `_layout.tsx:176`).

## 4. Tab Presurvei

Dua sub-tab di atas: **Kegiatan** dan **Prospek**. Semua data milik sales sendiri.
Server sudah mengikat pemanggil tanpa izin web ke `userId` / `pemilikId` sesinya
(`netmanager: app/api/presurvei/akses-presurvei.ts`).

### 4.1 Kegiatan

- **Daftar** kegiatan per tanggal (default hari ini): jenis, jam, alamat, hasil.
  Kegiatan yang masih di antrian offline diberi label "Menunggu kirim". Tombol utama
  **"Catat Kegiatan"**.
- **Form catat**, langkah 1: pilih jenis, yaitu Kunjungan, Survei Lokasi, Telepon,
  atau Chat. Jenis **Iklan tidak ditawarkan** (pekerjaan marketing kantor).
- **Kunjungan & Survei Lokasi**:
  - **Lokasi dari GPS otomatis saat form dibuka, tidak bisa diketik atau dipilih
    manual.** Alasannya: laporan "ke mana sales pergi" harus jujur. Tampilkan peta
    kecil dan akurasi (mis. "±12 m"). Bila GPS gagal: tombol "Coba lagi"; simpan
    diblokir sampai ada lokasi. Pakai `src/hooks/useLocationWithTimeout.ts`, bukan
    `LocationPickerModal`.
  - **Foto bukti minimal 1**, langsung dari kamera belakang (pola canvasing:
    `expo-camera`, resize 1024 JPEG q0.7 lewat `expo-image-manipulator`).
  - Isian: yang ditemui, alamat (prefill dari reverse-geocode bila tersedia, boleh
    dikoreksi), hasil, dan catatan.
  - **Survei Lokasi** menambah: ODP terdekat, estimasi kabel (meter), dan catatan
    teknis.
- **Telepon & Chat**: tanpa GPS/foto. Isian: yang dihubungi, hasil, catatan.
- **Tautan prospek**: pilih prospek yang ada (follow-up) **atau** buat prospek baru
  dari form yang sama bila hasilnya berminat. Backend sudah mendukung `prospekBaru`
  pada `POST /api/presurvei/kegiatan`.
- `waktuMulai` = jam HP saat dicatat. Server menoleransi skew jam
  (`TOLERANSI_SKEW_JAM_MENIT`).
- Validasi klien meniru aturan server (`kegiatan.validator.ts`): lokasi wajib untuk
  Kunjungan/Survei, kolom teknis hanya untuk Survei. Validasi klien hanya untuk UX;
  server tetap penentu.

### 4.2 Prospek

- **Daftar** prospek milik sendiri per status (Baru, Dihubungi, Tertarik, Negosiasi,
  Deal, Tidak Minat, Tidak Layak), dengan pencarian nama/no. HP.
- **Rincian**: kontak, status, dan riwayat kegiatan yang tertaut. Ada tombol:
  - **"Catat Follow-up"**: membuka form kegiatan dengan prospek terpilih.
  - **"Ubah Status"**: hanya menawarkan transisi sah menurut
    `isTransisiStatusSah` / `resolveAksiKanban` (netmanager
    `modules/presurvei/domain/prospek-kanban.ts`). Aturan disalin ke mobile sebagai
    fungsi murni ber-test, dengan satu test yang membandingkan tabel transisinya dengan
    fixture dari backend. Server tetap penentu (`PATCH` ditolak bila tidak sah).
  - **"Jadikan Canvasing"** (status Deal): melengkapi No. KTP, paket, dan foto KTP,
    lalu memanggil `POST /api/presurvei/prospek/[id]/jadikan-canvasing` (menerima
    `m_presurvei:update`). Data survei (ODP, kabel, foto) diisi server dari survei
    terakhir.

### 4.3 Offline

Kegiatan yang dicatat tanpa sinyal disimpan di antrian SQLite bersama titik GPS dan
fotonya, lalu dikirim otomatis saat sinyal kembali. Pakai `useApiMutation` dengan
`meta.photoMap` (`src/hooks/queries/useApiMutation.ts:38-49, 226-238, 289-323`), sama
seperti canvasing dan absensi.

Ubah status dan Jadikan Canvasing **butuh online** (tombol nonaktif + pesan saat
offline). Keduanya bergantung pada keadaan server terkini, dan mengantrekannya bisa
menghasilkan transisi yang sudah tidak sah.

## 5. Beranda sales (`KaryawanSalesDashboardScreen`)

Urutan dari atas:

1. **Kartu absen hari ini**: status check-in/out dan tombol ke Absensi (pakai ulang
   `StatusCard` di `src/components/organisms/attendance/`).
2. **Hari ini**: jumlah kegiatan (kunjungan, survei, telepon/chat) dan jumlah
   "Menunggu kirim".
3. **Target bulan ini**: kunjungan, prospek, dan konversi vs target. Bila target belum
   ditetapkan, tampil "Target belum ditetapkan", bukan 0%.
4. **Perlu di-follow-up**: prospek aktif yang paling lama tidak disentuh (maks. 5).
5. **Menu cepat**: Chat, Izin/Cuti.

## 6. Fitur bersama

Absensi (`app/(app)/absensi.tsx`: selfie + deteksi wajah + geofence + pelacakan lokasi
setelah check-in), Chat, Izin/Cuti, dan Profil **dipakai apa adanya**, tanpa salinan.
Kondisi tab Absensi untuk karyawan (`_layout.tsx:211-215`) sudah berlaku untuk sales
karyawan.

## 7. Perubahan backend (`netmanager`)

1. **Endpoint ringkasan Beranda sales**: `GET /api/mobile/presurvei/ringkasan`.
   - Izin `m_presurvei:read`; hanya data milik pemanggil; tenant dari sesi.
   - Isi: jumlah kegiatan hari ini per jenis, target vs realisasi bulan berjalan milik
     sendiri (dari `TargetService`, dibatasi ke user sesi), dan hingga 5 prospek aktif
     paling lama tak disentuh.
   - Logika di service modul presurvei; route tipis.
   - Batas "hari ini" = UTC, konsisten dengan laporan (keterbatasan yang sama sudah
     tercatat di CHANGELOG).
2. **Jenis unggahan `presurvei`** di `app/api/mobile/upload/route-handlers-impl.ts`
   (pola `employee-attendance`, `marketing`).
3. **Izin role SALES produksi**: migration data idempoten yang memasang
   `m_presurvei:{read,create,update}` ke role `SALES`. Pakai pola
   `20260923211611_grant_presurvei_permissions_to_admin_roles` dengan `NOT EXISTS`,
   karena unique `Permission` produksi = `(resource, action)`.

Tidak ada perubahan skema.

## 8. Pengujian

- **Mobile (Jest, `__tests__/`)**:
  - `tentukanPersona`: semua kombinasi `employeeType` × `isSales`.
  - Tab bar sales: urutan tab, dan Work Order/Barang tidak ada.
  - Teknisi karyawan tidak berubah: test regresi atas tab yang ada.
  - Form catat: GPS wajib dan foto wajib untuk Kunjungan/Survei, kolom teknis hanya
    untuk Survei, Iklan tidak ditawarkan.
  - Antrian offline: kegiatan beserta foto dan lokasi masuk antrian dengan
    `photoMap` yang benar.
  - Ubah status: hanya transisi sah yang ditawarkan, dan tabelnya sama dengan backend.
  - Jadikan Canvasing: nonaktif saat offline, dan badan request benar.
  - Setiap test dibuktikan bergigi dengan mutasi yang merah lalu dikembalikan.
- **Backend (Vitest)**:
  - Endpoint ringkasan: hanya milik sendiri, tenant sesi, dan target belum ada → null
    (bukan 0).
  - Jenis unggahan baru.
  - Migration diuji di DB lokal dengan unique ala produksi, di dalam transaksi yang
    di-rollback, dua kali.
  - Review keamanan tenant seperti task-task sebelumnya.

## 9. Rilis

1. **Backend dulu** (endpoint ringkasan + jenis unggahan). Aplikasi lama tidak
   terpengaruh.
2. **Aplikasi mobile via OTA.** Semua perubahan JS/TS; kamera, GPS, peta, dan SQLite
   sudah terpasang (`package.json`), dan `runtimeVersion.policy = fingerprint`
   (`app.json:10-12`). Cek dengan `npx expo-fingerprint diff` sebelum rilis. Bila
   ternyata ada perubahan native, jalur berubah ke rebuild APK.
3. **Terakhir: migration izin `m_presurvei` untuk role SALES.** Tab Presurvei baru
   aktif setelah backend dan aplikasi siap. Sebelum itu tab tampil terkunci.

## 10. Di luar cakupan

- Tampilan mitra teknisi / mitra sales (tidak berubah; mitra tetap tanpa absensi).
- Pencatatan jenis Iklan dari HP.
- Rute harian di peta, ekspor Excel, dan rekap per hari di web (usulan terpisah).
- Pemilihan lokasi manual untuk kunjungan.

# Attendance Face Tuning Guide

Panduan ini dipakai untuk men-tuning deteksi wajah pada flow selfie absensi agar:

- tetap aman (foto tidak bisa diambil kalau wajah tidak terdeteksi),
- tapi tetap ramah untuk device lapangan (kamera low-end, pencahayaan kurang bagus).

Referensi implementasi utama: `app/(app)/absensi.tsx`.

## Baseline Saat Ini

Bagian penting yang aktif sekarang:

1. Face dianggap valid jika:
   - posisi wajah cukup tengah,
   - ukuran wajah cukup besar.
2. Tombol shutter disable saat wajah belum valid.
3. Handler capture juga ada guard, jadi tidak bisa bypass walau tombol ditekan paksa.
4. Haptic feedback aktif saat status wajah berubah (invalid -> valid, valid -> invalid).

## Parameter yang Bisa Dituning

Semua parameter ada di `onFaceDetected` dalam `app/(app)/absensi.tsx`.

### 1) Area Tengah Wajah (Center Window)

Current:

```ts
const isCentered = normX > 0.25 && normX < 0.75 && normY > 0.25 && normY < 0.75;
```

Arti:

- Makin sempit rentang -> makin ketat (susah lolos).
- Makin lebar rentang -> makin longgar (lebih gampang lolos).

Rekomendasi tuning aman:

- Ketat: `0.30 - 0.70`
- Seimbang: `0.25 - 0.75` (default sekarang)
- Longgar lapangan: `0.22 - 0.78`

Jangan terlalu longgar (contoh `0.15 - 0.85`) karena risiko wajah di pinggir frame tetap lolos.

### 2) Minimum Ukuran Wajah

Current:

```ts
const faceWidthRatio = bounds.width / frameWidth;
const faceHeightRatio = bounds.height / frameHeight;
const isLargeEnough = Math.max(faceWidthRatio, faceHeightRatio) > 0.16;
```

Arti:

- Nilai lebih tinggi -> user harus lebih dekat kamera.
- Nilai lebih rendah -> lebih toleran kamera buram / resolusi rendah.

Rekomendasi tuning aman:

- Ketat: `0.18`
- Seimbang: `0.16` (default sekarang)
- Longgar lapangan: `0.14`

Jangan di bawah `0.12`, karena risiko false positive naik.

### 3) Feedback Haptic

Current behavior:

- Valid: `notificationAsync(Success)`
- Invalid: `impactAsync(Light)`
- Trigger hanya saat status berubah (anti spam) lewat `lastFaceReadyRef`.

Jika user merasa terlalu sering bergetar:

- boleh hilangkan haptic untuk status invalid,
- tapi tetap pertahankan haptic success agar user tahu momen bisa foto.

## Rule yang Tidak Boleh Dihapus

Untuk keamanan dan kualitas data absensi, jangan hapus 2 rule ini:

1. `disabled={!faceInFrame}` pada tombol capture.
2. Guard di handler capture:

```ts
if (!faceInFrame) {
  Alert.alert("Wajah Belum Terdeteksi", "Pastikan wajah terlihat jelas dan berada di dalam frame.");
  return;
}
```

Kalau salah satu dihapus, user bisa ambil foto saat wajah tidak valid.

## Strategi Tuning Bertahap (Disarankan)

Lakukan tuning bertahap, satu parameter per rilis kecil:

1. Ubah center window dulu (misal `0.25-0.75` -> `0.22-0.78`).
2. Uji lapangan 1-2 hari.
3. Jika masih ketat, baru turunkan size threshold (`0.16` -> `0.14`).
4. Jangan ubah banyak parameter sekaligus, supaya dampak mudah dibaca.

## Checklist Uji Lapangan

Minimal test matrix setelah tuning:

- Device low-end Android (kamera depan biasa).
- Pencahayaan indoor cukup.
- Pencahayaan backlight (agak melawan cahaya).
- User pakai masker/topi.
- Wajah setengah keluar frame (harus gagal).
- Frame kosong tanpa wajah (harus gagal).
- Wajah valid di tengah (harus bisa capture cepat).

## Troubleshooting Cepat

- Keluhan: "Susah capture walau wajah jelas"
  - longgarkan center window atau turunkan size threshold sedikit.
- Keluhan: "Wajah di pinggir masih bisa"
  - sempitkan center window.
- Keluhan: "Foto tanpa wajah lolos"
  - cek guard `faceInFrame` dan jangan turunkan threshold terlalu ekstrem.

## Catatan Implementasi

Setelah tuning, lakukan verifikasi minimal:

```bash
npx tsc --noEmit
npm run lint
```

Jika behavior kamera berubah signifikan, lakukan smoke test manual pada flow `Absensi` end-to-end.

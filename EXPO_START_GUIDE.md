# 🚀 Mobile RADPRO - Expo Start Guide

## Masalah QR Code & Terminal Tidak Rapi ✅ SOLVED

Masalah QR code tidak muncul dan terminal berantakan telah diperbaiki dengan:
1. Menambahkan file `metro.config.js` untuk konfigurasi Metro bundler yang proper
2. Menginstall ngrok untuk tunnel support
3. Menambahkan script npm yang lebih lengkap

## Cara Menjalankan Expo Development Server

### Opsi 1: Start Normal (LAN) - RECOMMENDED
```bash
npm start
# atau
npm run start
```
Ini akan menampilkan QR code yang bisa discan di jaringan lokal yang sama.

### Opsi 2: Start dengan Cache Bersih
```bash
npm run start:clean
```
Gunakan ini jika mengalami masalah dengan bundling atau caching.

### Opsi 3: Start dengan Tunnel (Internet)
```bash
npm run start:tunnel
```
Gunakan ini jika perlu mengakses dari jaringan berbeda (memerlukan internet).
QR code akan bisa discan dari mana saja.

### Opsi 4: Localhost Only
```bash
npx expo start --localhost
```
Gunakan ini hanya untuk testing di emulator/simulator di komputer yang sama.

## Troubleshooting

### QR Code tidak muncul:
1. Pastikan tidak ada process Expo lain yang berjalan:
   ```bash
   # Cari dan kill process expo
   ps aux | grep expo
   kill -9 <PID>
   ```

2. Clear cache dan restart:
   ```bash
   npm run start:clean
   ```

3. Jika masih tidak muncul, coba tunnel mode:
   ```bash
   npm run start:tunnel
   ```

### Terminal berantakan:
- Masalah ini sudah diperbaiki dengan file `metro.config.js`
- Pastikan terminal support ANSI colors (bawaan macOS/Linux sudah support)

### Port 8081 sudah digunakan:
```bash
# Gunakan port lain
npx expo start --port 8082
```

## File yang Ditambahkan/Diubah:
- ✅ `metro.config.js` - Konfigurasi Metro bundler
- ✅ `package.json` - Script tambahan (`start:clean`, `start:tunnel`, `start:lan`)
- ✅ `start.sh` - Script bash untuk start dengan environment yang proper
- ✅ `@expo/ngrok` - Package untuk tunnel support (global install)

## Tips:
- Gunakan **LAN mode** untuk development sehari-hari (lebih cepat)
- Gunakan **Tunnel mode** hanya saat perlu test dari device di jaringan berbeda
- **Cache Clear** dilakukan secara otomatis jika terjadi error bundling

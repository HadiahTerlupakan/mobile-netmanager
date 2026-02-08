# Rencana Migrasi & Peningkatan Topology Map Mobile

## Tujuan
Menyelaraskan fitur dan tampilan Topology Map di aplikasi mobile dengan versi Admin Portal.

## Analisis Perbedaan
| Fitur | Admin Portal | Mobile App (Saat Ini) |
| :--- | :--- | :--- |
| **Engine** | Leaflet (Web) | MapLibre (Native) |
| **Layer** | Google Maps (Satellite/Hybrid) | OpenStreetMap (Standard) |
| **Jalur Kabel** | Fisik (Polyline berbelok/waypoints) | Logikal (Garis lurus antar titik) |
| **Ikon/Warna** | OLT(Ungu), ODC(Biru), ODP(Cyan), ONT(Oranye) | Perlu disesuaikan |

## Strategi Teknis: Google Maps pada Mobile
Karena **Leaflet adalah library khusus Web** (DOM-based) dan tidak bisa berjalan di React Native secara native, kita akan menggunakan pendekatan **Hybrid Visual**:
1.  Tetap menggunakan **MapLibre** (yang sudah terpasang) agar performa tetap cepat (native 60fps).
2.  Mengganti sumber peta (Tile Source) dari OSM ke **Google Maps Tiles** (sama persis dengan Admin).
3.  Hasilnya: Tampilan peta akan 100% sama dengan Admin (Google Satellite), tapi engine-nya tetap native mobile.

## Langkah Implementasi (Todo List)

- [x] **Analisis API & Data**: Periksa apakah endpoint mobile bisa mendukung data `waypoints` untuk jalur kabel fisik. Jika tidak, perlu penyesuaian di backend atau mobile fetch ke endpoint yang lebih detail.
- [x] **Implementasi Google Maps Layer**: Ubah `styleURL` atau `RasterSource` di `topology-map.tsx` agar menggunakan tiles Google Maps (Satellite & Road).
- [x] **Harmonisasi Visual**: Update konstanta warna dan ikon di `app/(app)/topology-map.tsx` agar sesuai standar Admin (Ungu, Biru, Cyan, Oranye).
- [x] **Implementasi Physical Path**: Ubah rendering `LineLayer` untuk mendukung Geometri `LineString` kompleks (belok-belok) berdasarkan data `waypoints`.
- [x] **Penyamaan Detail Info**: Update `DeviceDetailModal` untuk menampilkan data teknis: Splitter, Kapasitas, Slot Terpakai.
- [x] **Filter & Layering**: Tambahkan opsi filter untuk "Fiber Lines" dan "ONT/Pelanggan" agar peta tidak terlalu padat.

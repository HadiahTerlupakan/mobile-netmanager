# Fitur Mitra System — Master Plan (Mobile App)

> **Dibuat**: 27 Feb 2026
> **Status**: BELUM DIMULAI — Plan sudah disetujui, siap implementasi
> **Full Plan**: Lihat `/Users/rohadimraja/Documents/projek/netmanager/plans/fitur-mitra-system.md`

## Ringkasan untuk Mobile

### Perubahan di Mobile App:
1. **AuthContext** — tambah `employeeType` ke type User
2. **features.ts** — tambah feature mitra (m_mitra_dashboard, m_mitra_earnings, m_mitra_withdraw)
3. **_layout.tsx** — tab visibility berbeda per tipe user:
   - Mitra Teknisi: Dashboard Mitra, Work Order, Profile
   - Mitra Sales: Dashboard Mitra, Canvasing, Profile
   - Karyawan: tetap seperti sekarang
4. **Screen baru:**
   - `mitra-dashboard.tsx` — dashboard khusus mitra
   - `mitra/earnings.tsx` — riwayat pendapatan
   - `mitra/withdraw.tsx` — form request penarikan
   - `mitra/withdrawals.tsx` — riwayat penarikan

### API Baru yang Akan Digunakan:
- `GET /api/mobile/mitra/dashboard`
- `GET /api/mobile/mitra/earnings`
- `GET /api/mobile/mitra/balance`
- `POST /api/mobile/mitra/withdraw`
- `GET /api/mobile/mitra/withdrawals`

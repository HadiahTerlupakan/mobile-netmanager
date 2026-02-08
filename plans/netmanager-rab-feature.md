# Rencana Implementasi Fitur RAB (Budget Plan) pada Admin Panel

Fitur ini bertujuan untuk menambahkan manajemen **RAB (Rencana Anggaran Biaya)** pada menu Pengeluaran Site. RAB digunakan untuk merencanakan CAPEX per site dengan perhitungan **BEP (Break Even Point)** otomatis.

## 1. Perubahan Database (Prisma Schema)

Kita perlu menambahkan tabel baru untuk menyimpan data proyek RAB dan item-itemnya.

**File:** `../netmanager/prisma/schema.prisma`

Tambahkan model berikut:

```prisma
model RabProject {
  id               String               @id @default(cuid())
  name             String
  description      String?
  siteId           String?
  mixRadiusGroupId String?
  
  // Financial Projections (Monthly)
  projectedRevenue BigInt   @default(0) 
  projectedOpex    BigInt   @default(0) 
  
  status           RabStatus            @default(DRAFT)
  
  items            RabItem[]
  
  createdBy        String?
  createdAt        DateTime             @default(now())
  updatedAt        DateTime             @updatedAt
  
  site             Sites?               @relation(fields: [siteId], references: [id])
  mixRadiusGroup   MixRadiusOwnerGroup? @relation(fields: [mixRadiusGroupId], references: [id])
  creator          User?                @relation(fields: [createdBy], references: [id])

  @@index([siteId])
  @@index([status])
  @@map("rab_projects")
}

model RabItem {
  id           String          @id @default(cuid())
  rabProjectId String
  name         String
  description  String?
  quantity     Int             @default(1)
  unitPrice    BigInt
  totalPrice   BigInt
  category     RabItemCategory @default(HARDWARE)
  
  rabProject   RabProject      @relation(fields: [rabProjectId], references: [id], onDelete: Cascade)

  @@index([rabProjectId])
  @@map("rab_items")
}

enum RabStatus {
  DRAFT
  PENDING_APPROVAL
  APPROVED
  REJECTED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum RabItemCategory {
  HARDWARE
  LICENSE
  INSTALLATION
  OTHER
}
```

> **Catatan:** Setelah mengubah schema, jalankan `npx prisma generate` dan migrasi database.

## 2. Backend API Routes

Buat endpoint API untuk mengelola data RAB.

### A. List & Create RAB
**File:** `../netmanager/app/api/finance/rab-projects/route.ts`
- **GET**: Mengambil daftar RAB (support filter by `siteId`).
- **POST**: Membuat RAB baru beserta item-itemnya.

### B. Detail, Update & Delete RAB
**File:** `../netmanager/app/api/finance/rab-projects/[id]/route.ts`
- **GET**: Mengambil detail RAB termasuk items dan perhitungan total.
- **PATCH**: Mengupdate status atau data RAB.
- **DELETE**: Menghapus RAB (hanya jika status DRAFT).

## 3. Frontend Implementation

Modifikasi halaman Pengeluaran Site yang sudah ada.

**File:** `../netmanager/app/admin/integrations/mixradius/expenses/ExpensesClient.tsx`

### A. Tambahkan Tab Navigation
Ubah layout utama menjadi menggunakan Tab:
1.  **Pengeluaran Harian** (Tampilan eksisting)
2.  **RAB (Proyek)** (Fitur baru)

### B. Buat Komponen RAB
Dalam file yang sama (atau dipisah jika memungkinkan), buat:
1.  **RABList**: Tabel daftar proyek RAB.
    - Columns: Nama Proyek, Site, Total CAPEX, Estimasi BEP, Status, Actions.
2.  **RABForm**: Form untuk membuat/edit RAB.
    - Input: Nama Proyek, Site.
    - Dynamic List: Item RAB (Nama, Qty, Harga Satuan -> Auto Total).
    - Input: Proyeksi Pendapatan Bulanan & OPEX Bulanan.
    - **Display Live BEP**: `Total CAPEX / (Revenue - OPEX)`.

### C. Logika BEP
Tampilkan perhitungan BEP dengan format yang mudah dibaca, misal: "12.5 Bulan".
Jika `(Revenue - OPEX) <= 0`, tampilkan peringatan "Tidak akan BEP (Minus/Nol Margin)".

## 4. Integrasi

1.  Pastikan data `Site` atau `MixRadiusOwnerGroup` diambil dari API yang sesuai untuk dropdown.
2.  Hubungkan tombol "Simpan" pada form ke API POST.
3.  Hubungkan list ke API GET.

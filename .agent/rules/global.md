---
trigger: always_on
---

# AI Agent Mandatory Rules

## 1. Language

- Selalu gunakan **Bahasa Indonesia** untuk semua komunikasi dan respons.
- Gunakan **Bahasa Inggris hanya untuk:**
  - Code

---

# 2. MCP Verification

Sebelum memberikan jawaban atau solusi, **WAJIB memverifikasi menggunakan MCP servers.**

Gunakan MCP sesuai kebutuhan:

### Filesystem
Digunakan untuk:

- Membaca struktur project
- Melihat source code
- Memahami module yang ada
- Mengecek implementasi yang sudah ada

### Memory
Digunakan untuk:

- Menyimpan context penting dari percakapan
- Mengingat keputusan arsitektur
- Menyimpan preferensi user
- Menyimpan informasi project

### Postgres / Prisma
Digunakan untuk:

- Operasi database
- Membaca schema database
- Validasi struktur data
- Analisis relasi tabel

---

# 3. Documentation & Reference

- **Context7 adalah sumber dokumentasi utama.**
- Selalu **cek Context7 terlebih dahulu** sebelum memberikan:
  - solusi teknis
  - rekomendasi library
  - implementasi code
  - best practice

Jika informasi **tidak ditemukan di Context7**, maka lakukan pencarian berikut:

1. Cari di **filesystem project**
2. Cari di **MCP server lain yang relevan**

---

# 4. Code Architecture

Semua implementasi **WAJIB mengikuti arsitektur yang sudah ada.**

Arsitektur yang digunakan:

**Modular Monolith**

Struktur standar:

# CLAUDE.md

## Agent Behavior

### Language Output
Always respond in Bahasa Indonesia unless explicitly asked otherwise.

### Role
You are strategic orchestrator and senior software engineer for this project.
Communicate in Bahasa Indonesia. Break down complex tasks, process them modularly,
synthesize results efficiently. Be direct, concise, and action-oriented.

### Stack Detection (Mobile)
Saat membuka project mobile, otomatis:
1. Baca: `package.json`, `app.json`, `app.config.ts`, `.env.example`
2. Konfirmasi singkat: `"Stack terdeteksi: Expo [version], Expo Router, TanStack Query, twrnc"`
3. Terapkan aturan mobile-specific di bawah secara otomatis

### Autonomy
- Never ask for confirmation before proceeding
- Do not ask "apakah saya boleh...?", "apakah Anda setuju...?", "lanjutkan?"
- Just execute. State what you're doing, then do it
- If multiple approaches exist, pick the best one and explain why after

### Decision Making
When facing any yes/no or choice-based decision:
- Make the most logical and optimal choice autonomously
- Write [Asumsi: ...] briefly, then proceed immediately
- Only ask if critical information is completely missing

### Clarification Rule
Only stop and ask when:
1. Critical information is completely missing
2. Two interpretations lead to completely opposite results
Otherwise → assume, state assumption, execute end-to-end.

### Thinking Approach
Before responding, internally:
1. Identify if task can be broken into sub-tasks
2. Determine independent vs sequential sub-tasks
3. Process each with a specific goal
4. Synthesize into one coherent final answer

### Output Style
- Lead with action, not questions
- If assumption needed: [Asumsi: ...] → langsung kerjakan
- Deliver complete end-to-end results in one response
- Never end with a question unless absolutely critical
- Match response length to task complexity

---

## Project Overview

**ISP Management System** — platform manajemen ISP skala besar di Indonesia.
- 10+ POP, 50k+ pengguna PPPoE
- Integrasi MikroTik RouterOS & FreeRADIUS

### Struktur Repo

```
/
├── backend/     ← Next.js 14 (API + Admin + Customer portal)
└── mobile/      ← React Native via Expo (aplikasi pelanggan & teknisi)
```

---

## Tech Stack

### Backend (`backend/`)
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (via Prisma ORM)
- **Cache/Queue**: Redis (via ioredis)
- **Real-time**: Firebase Realtime Database / Firestore
- **Validation**: Zod
- **Testing**: Vitest (unit/integration), Playwright (E2E)
- **External**: MikroTik RouterOS (node-routeros-v2), FreeRADIUS (1812/1813 UDP)

### Mobile (`mobile/`)
- **Framework**: React Native via Expo (managed workflow)
- **Language**: TypeScript
- **Navigation**: Expo Router (file-based)
- **Data Fetching**: TanStack Query (React Query v5)
- **Styling**: twrnc (Tailwind React Native Classnames)
- **State**: Zustand (client/UI state only)
- **Validation**: Zod

---

## Commands

### Backend
```bash
npm run dev              # Start dev server (http://localhost:3000)
npm run db:up            # Start Database/Redis
npm run db:down          # Stop Database/Redis
npm run build            # Build production
npm run lint             # Lint code
npm run typecheck        # Type checking
npm run check            # Full check (Lint + Typecheck + Build)
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations (dev)
npm run prisma:setup     # Generate + Migrate + Seed
npm run prisma:seed      # Seed data
npm run prisma:reset     # Reset database
./scripts/setup-test-db.sh  # Setup test DB (REQUIRED sebelum test)
npm test                 # Run tests (Vitest watch)
npm run test:coverage    # With coverage
npm run test:e2e         # E2E tests (Playwright)
```

### Mobile
```bash
npx expo start           # Start dev server
npx expo start --ios     # iOS simulator
npx expo start --android # Android emulator
npx expo build           # Production build (EAS)
npx expo lint            # Lint
npm test                 # Run tests
npm run test:coverage    # With coverage
```

---

## Architecture

### Backend — Modular Monolith + Layered + Clean Architecture

Sedang dalam proses migrasi bertahap menuju Clean Architecture penuh.

**📖 Detail lengkap:** `backend/docs/architecture/clean-architecture.md`

**Dependency Rule:**
```
app/ (UI)  →  api/ (Controller)  →  services/  →  repositories/  →  database
```

**Module Structure (Target):**
```
modules/<domain>/
├── domain/         # Pure domain entities & interfaces
├── dto/            # Data Transfer Objects
├── repositories/   # Data access layer
├── services/       # Business logic
├── validators/     # Input validation (Zod)
└── index.ts        # Public API
```

**Available Modules:**
`admin`, `app-version`, `attendance`, `chat`, `coupons`, `finance`, `integrations`,
`inventory`, `map`, `marketing`, `mitra`, `network`, `notification`, `overtime`,
`pelanggan`, `procurement`, `registration`, `roles`, `salary`, `settings`, `shift`,
`users`, `work-order`

**App Layer:**
- `app/api/` — Thin controllers: parse request, panggil service, return DTO
- `app/(auth)/` — Auth pages
- `app/(customer)/` — Customer portal
- `app/admin/` — Admin portal
- `app/karyawan/` — Employee portal
- **API route tidak boleh mengandung business logic** — semua logika ada di `services/`

**Shared Infrastructure:**
- `lib/` — Auth, Prisma client, global types
- `components/` — Reusable React components
- `prisma/` — Schema dan migrations
- `server.ts` — Custom Express/Node server dengan Socket.IO
- `modules/database/` — Shared database module
- `modules/events/` — Domain events & dispatchers

### Mobile — Feature-based Architecture

**Dependency Rule:**
```
app/ (screens)  →  features/<domain>/api/  →  lib/api-client  →  backend REST API
```

**Structure:**
```
mobile/
├── app/                    # Expo Router — file-based routing
│   ├── (auth)/             # Auth screens
│   ├── (customer)/         # Customer portal screens
│   └── (teknisi)/          # Teknisi portal screens
├── components/             # Reusable UI components
├── features/               # Feature modules
│   └── <domain>/
│       ├── api/            # TanStack Query hooks + API calls
│       ├── components/     # Feature-specific components
│       ├── types/          # TypeScript types/DTOs
│       └── utils/
├── lib/                    # Shared utilities (auth, axios, storage)
├── hooks/                  # Shared custom hooks
└── constants/              # App-wide constants
```

---

## API Contract — Cross-Platform

Backend dikonsumsi mobile via REST API. Kontrak yang disepakati:
- **Base URL**: `NEXT_PUBLIC_API_URL` (web) / `EXPO_PUBLIC_API_URL` (mobile)
- **Auth**: Session cookie (web) — JWT Bearer token (mobile, disimpan di `expo-secure-store`)
- **Response format**: `{ data, error, meta }` — konsisten di semua endpoint
- **Error format**: `{ code, message, details }` — jangan expose internal error
- **Pagination**: semua list endpoint wajib support `?page=&limit=`

---

## Code Quality — Anti Smell

### Shared Rules (berlaku di backend & mobile)

**NAMING:**
- Nama variabel, fungsi, class harus self-explanatory
- Tidak ada nama seperti: `data`, `temp`, `x`, `foo`, `handler2`, `myFunction`
- Fungsi harus verb: `getUser()`, `validateInput()`, `calculateTotal()`
- Boolean harus prefix `is/has/can`: `isValid`, `hasPermission`, `canDelete`

**DRY & CLEAN:**
- Jangan duplikasi logika → extract ke fungsi/helper
- Hapus dead code, commented-out code, console.log debug
- Tidak ada deep nesting → gunakan early return / guard clause
- Setiap fungsi publik wajib ada brief comment tujuannya
- Tidak ada magic number → gunakan named constants

**GOD CLASS / GOD FUNCTION — STRICTLY FORBIDDEN:**
- Tidak ada class yang melakukan lebih dari 1 tanggung jawab
- Tidak ada fungsi yang tahu terlalu banyak tentang objek lain

**SOLID PRINCIPLES:**
- S: Single responsibility per module
- O: Terbuka untuk ekstensi, tertutup untuk modifikasi
- L: Subclass bisa menggantikan parent tanpa breaking behavior
- I: Interface kecil dan spesifik
- D: Depend on abstraction, bukan konkret implementation

### Backend — Nuanced (heuristic-based)
- Panjang fungsi adalah **heuristic**, bukan aturan mutlak — pecah hanya jika cohesion
  menurun, intent tidak jelas, atau reuse/testability memburuk
- Parameter > 3 adalah **sinyal review**, bukan pelanggaran otomatis
- File besar boleh jika isinya masih satu bounded responsibility

### Mobile — Strict
- Max fungsi: **20 baris** — jika lebih, pecah
- Max parameter: **3** — jika lebih, gunakan object/props interface
- Nested logic > 2 level → extract ke fungsi terpisah
- File > **300 baris** → pecah jadi modul terpisah
- 1 component per file
- Props interface wajib didefinisikan eksplisit (bukan `any`)
- Tidak ada logic bisnis di layer component — pindahkan ke custom hook atau `features/`

---

## Mobile-Specific Rules

### Navigation
- Gunakan **Expo Router** untuk semua navigasi — bukan `react-navigation` manual
- Route params via `useLocalSearchParams()` / `useGlobalSearchParams()`
- Protected routes menggunakan layout `(auth)` dengan redirect guard

### Data Fetching
- **TanStack Query untuk semua server state** — `useState` DILARANG untuk data dari API
- Query key convention: `[domain, action, ...params]` → `['pelanggan', 'list', { page }]`
- Gunakan `useMutation` untuk semua write operations
- `staleTime` default: 5 menit

### Styling
- **twrnc untuk semua styling** — `StyleSheet.create()` DILARANG
- Class names Tailwind: `tw('flex-1 bg-white p-4')`
- Style dinamis: `tw('text-base', isActive && 'text-blue-500')`

### State Management
- Server state → TanStack Query
- Client/UI state → Zustand
- Form state → React Hook Form + Zod resolver

---

## Code Review Mode

Jika diminta review kode:
1. Identifikasi semua code smell yang ada
2. Jelaskan kenapa itu bermasalah
3. Berikan versi refactored langsung

### Review Policy (Backend)
1. Baca seluruh isi module terlebih dahulu
2. Tentukan apakah masih pola lama atau sudah pola baru
3. Jika masih pola lama → langsung migrasi tanpa konfirmasi
4. Deteksi misplaced code:
   - Business logic di `app/api/` → pindahkan ke service
   - Query Prisma di `app/api/` → pindahkan ke repository
   - Logic duplikat → konsolidasi ke module yang tepat

### Review Checklist (Mobile)
- [ ] Ada `useState` yang seharusnya TanStack Query?
- [ ] Ada `StyleSheet.create()` yang seharusnya `twrnc`?
- [ ] Navigation sudah pakai Expo Router dengan benar?
- [ ] Ada logic bisnis di `app/` yang seharusnya di `features/`?
- [ ] Props interface didefinisikan eksplisit?

---

## Standards & Best Practices (Backend)

**📖 Dokumentasi lengkap** di `backend/docs/`:
- Architecture: `docs/architecture/clean-architecture.md`
- Error Handling: `docs/standards/error-handling.md`
- Authorization: `docs/standards/authorization.md`
- Caching: `docs/standards/caching.md`
- Testing: `docs/standards/testing.md`
- Events: `docs/standards/events.md`
- Transactions: `docs/standards/transactions.md`
- Security & Performance: `docs/standards/security-performance.md`

**Quick Reference:**

Error Handling:
- Gunakan `Result<T, E>` pattern untuk service layer
- API routes gunakan `ApiErrors.*` dari `@/lib/api`
- Never expose internal error details ke client

Authorization:
- Authorization logic HANYA di `lib/rbac.ts` dan `modules/roles`
- Service layer TIDAK boleh ada authorization logic
- API route call `hasPermission()` sebelum call service
- Repository layer handle data isolation via `tenantId` filter

Events:
- Event naming: `<domain>.<entity>.<action>` (e.g., `users.user.created`)
- Handlers wajib idempotent (at-least-once delivery)

Module Boundary:
- ❌ FORBIDDEN: Direct module-to-module import
- ✅ ALLOWED: Import via public API (`index.ts`)
- ✅ PREFERRED: Communication via events

Testing:
- Business logic (services): minimum 70% coverage
- Critical path: minimum 90% coverage
- Mock external API, gunakan real DB untuk integration test

Performance:
- API response time: p95 < 200ms, p99 < 500ms
- Database query: simple < 10ms, complex < 100ms
- Pagination wajib untuk list endpoint
- Cache reference data (TTL: 1 hour), expensive queries (TTL: 5–15 min)

---

## Self-Check

Verify setiap beberapa langkah:
- Still aligned with main objective?
- Does the code follow clean code principles?

**Tambahan untuk backend:**
- Apakah arsitektur Modular Monolith + Layered + Clean Architecture terpenuhi?
- Apakah module ini pola lama atau baru?
- Apakah refactor benar-benar menyelesaikan smell, atau hanya memecah kode cohesive?
- Apakah ada kode salah tempat yang perlu dipindahkan?
- Apakah `docs/CHANGELOG.md` sudah diupdate sebelum task ditutup?

**Tambahan untuk mobile:**
- Data fetching pakai TanStack Query?
- Styling pakai twrnc?
- Navigation pakai Expo Router?
- Ada server state yang salah pakai useState?

---

## Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md`
- Review lessons at session start

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Ask yourself: "Would a staff engineer approve this?"

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- Skip for simple, obvious fixes — don't over-engineer

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. No hand-holding needed.

---

## Task Management
1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Track Progress**: Mark items complete as you go
3. **Explain Changes**: High-level summary at each step
4. **Capture Lessons**: Update `tasks/lessons.md` after corrections
5. **Update Changelog**: Update `docs/CHANGELOG.md` sebelum task ditutup (backend)

---

## Documentation & Reports Policy
- **NEVER** create documentation in root directory
- Semua docs ke `docs/` dengan subfolder yang sesuai:
  - `docs/architecture/`, `docs/standards/`, `docs/guides/`, `docs/reports/`, `docs/api/`
- Report files wajib include tanggal: `REPORT_NAME_YYYY-MM-DD.md`

---

## SOT & Changelog Policy (Backend)

> **Source of Truth** untuk seluruh perubahan backend ada di `backend/docs/CHANGELOG.md`.

### Kapan Harus Update

| Kondisi | Label |
|---------|-------|
| Fitur/endpoint/module baru | `[ADDED]` |
| Refactor, migrasi pola, update logika | `[CHANGED]` |
| Fix bug atau code smell | `[FIXED]` |
| Hapus fitur/modul/file | `[REMOVED]` |
| Deprecated | `[DEPRECATED]` |
| Patch keamanan | `[SECURITY]` |
| Infra / CI / Docker / K8s | `[INFRA]` |
| Dokumentasi saja | `[DOCS]` |
| Migration Prisma | `[MIGRATION]` |

### Format Entry

```markdown
### [YYYY-MM-DD] — Judul singkat perubahan

- **Tipe**: [LABEL]
- **Scope**: `modules/<nama>` | `app/api/<path>` | `lib/` | `infra/`
- **Author**: agent | @<github-username>
- **Deskripsi**: Penjelasan singkat apa yang berubah dan mengapa.
- **Files**: (opsional)
- **Migration**: (opsional) nama file migration Prisma
- **Breaking**: ✅ Ya / ❌ Tidak
```

Aturan: selalu tulis di bagian `[Unreleased]`, satu entry per task logis,
tulis SETELAH task selesai.

### Git Commit Format
```
<type>(<scope>): <judul singkat>

feat(coupons): add coupon management module
fix(pelanggan): move business logic from api route to service
refactor(pelanggan): migrate to clean architecture pattern
chore(infra): update docker compose for redis sentinel
```
Tipe valid: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `perf`, `security`

---

## Worktree Policy — STRICTLY FORBIDDEN
- **DILARANG KERAS** menggunakan `git worktree` dalam kondisi apapun
- **DILARANG** membuat branch baru atau berpindah branch tanpa instruksi eksplisit
- Semua perubahan dikerjakan **langsung di working directory dan branch aktif**
- **Alasan**: project solo developer; worktree menyebabkan kebingungan

---

## Module Ownership Map (Backend)

| Module | Tanggung Jawab | Dependencies |
|--------|---------------|--------------|
| users, roles | User management, RBAC | — |
| attendance | Attendance tracking | users, events |
| finance | Invoicing, payment | pelanggan, events |
| work-order, inventory | Work order lifecycle | users, events |
| network, integrations | MikroTik, FreeRADIUS | pelanggan, events |
| pelanggan | Customer management | — |
| salary, overtime | Payroll | users, attendance |

---

## Core Principles
- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Only touch what's necessary. No side effects with new bugs.

---

*Last Updated: 2026-05-14*
*Version: 4.0 — Unified backend + mobile*
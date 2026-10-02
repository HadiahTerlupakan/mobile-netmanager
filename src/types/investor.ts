/** Ringkasan pelanggan di proyek investor. */
export interface PelangganProyekInvestor {
  total: number;
  active: number;
  paying: number;
  paymentRatio: number;
}

/** Saldo modal investor (`InvestorBalanceService`). */
export interface SaldoInvestor {
  totalDeposit: number;
  totalPayout: number;
  activeBalance: number;
  ownershipPercent: number;
}

/** `GET /api/mobile/investor/dashboard`. Nominal proyek dikirim string (BigInt). */
export interface RingkasanInvestor {
  totalInvestment: string;
  totalProjectedRevenue: string;
  /** Bagi hasil milik saya dari bulan-bulan aktual semua proyek (hitungan RAB). */
  totalActualRevenue: string;
  /** Modal yang sudah kembali ke saya dari bulan-bulan aktual (hitungan RAB). */
  totalCapitalReturned: string;
  activeProjectsCount: number;
  projects: { id: string; name: string; status: string; siteName: string }[];
  subscribers: PelangganProyekInvestor;
  balance: SaldoInvestor;
  /** Bagi hasil disetujui + pengembalian modalnya yang belum dibayar. */
  amountAwaitingPayment: number;
}

/** Satu proyek di daftar proyek investor. */
export interface ProyekInvestor {
  id: string;
  name: string;
  description: string | null;
  status: string;
  siteName?: string | null;
  investmentAmount: string;
  profitSharePercent: number;
  projectedRevenue: string;
  totalActualRevenue: string;
  createdAt: string;
}

/** Capaian bulanan proyek. `month` = bulan ke-n sejak proyek mulai (bukan bulan kalender). */
export interface CapaianBulananProyek {
  id: string;
  month: number;
  year: number;
  achievedRevenue: string;
  opex: string;
  /** Biaya operasional yang dipakai hitungan RAB bulan ini. */
  opexUsed: number;
  /** Bagi hasil milik saya bulan ini. */
  myProfitShare: number;
  /** Pengembalian modal milik saya bulan ini. */
  myCapitalReturn: number;
}

/** `GET /api/mobile/investor/projects/:id`. */
export interface RincianProyekInvestor extends ProyekInvestor {
  /** Awal bulan ke-1 proyek; null bila RAB belum diberi tanggal mulai. */
  startDate: string | null;
  targetSubscribers: number | null;
  estimatedCurrentRevenue: string;
  actualAchievements: CapaianBulananProyek[];
  myTotalProfitShare: number;
  myTotalCapitalReturn: number;
  subscribers: PelangganProyekInvestor;
}

/** Setoran modal investor. */
export interface SetoranModalInvestor {
  id: string;
  amount: number;
  depositType: string;
  date: string;
  status: string;
  reference: string | null;
  rejectedReason: string | null;
}

/** Bagi hasil satu periode. */
export interface BagiHasilInvestor {
  id: string;
  /** Proyek sumber; null untuk bagi hasil lama berbasis setoran. */
  projectName: string | null;
  periodStart: string;
  periodEnd: string;
  netProfit: number;
  sharePercent: number;
  shareAmount: number;
  /** Pengembalian modal yang dibayar bersama bagi hasil ini. */
  capitalReturnAmount: number;
  status: string;
  paidAt: string | null;
}

/** Uang yang sudah dikirim ke rekening investor. */
export interface PencairanInvestor {
  id: string;
  amount: string;
  date: string;
  bankName: string | null;
  accountNumber: string | null;
  reference: string | null;
  notes: string | null;
  status: string;
}

/** Satu halaman riwayat uang diterima. */
export interface HalamanPencairanInvestor {
  data: PencairanInvestor[];
  meta: { total: number; page: number; lastPage: number };
}

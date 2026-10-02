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
  totalActualRevenue: string;
  activeProjectsCount: number;
  projects: { id: string; name: string; status: string; siteName: string }[];
  subscribers: PelangganProyekInvestor;
  balance: SaldoInvestor;
  profitShareAwaitingPayment: number;
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

/** Capaian bulanan proyek. */
export interface CapaianBulananProyek {
  id: string;
  month: number;
  year: number;
  achievedRevenue: string;
  opex: string;
}

/** `GET /api/mobile/investor/projects/:id`. */
export interface RincianProyekInvestor extends ProyekInvestor {
  targetSubscribers: number | null;
  estimatedCurrentRevenue: string;
  actualAchievements: CapaianBulananProyek[];
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
  periodStart: string;
  periodEnd: string;
  netProfit: number;
  sharePercent: number;
  shareAmount: number;
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

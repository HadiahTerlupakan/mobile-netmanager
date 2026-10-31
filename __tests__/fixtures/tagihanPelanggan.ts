/**
 * Data dan jawaban server tiruan untuk tes layar Tagihan pelanggan. Mock
 * modul (`jest.mock`) tetap ditulis di tiap berkas tes; berkas ini hanya
 * berisi data supaya tes tidak bergantung pada urutan impor.
 */

export const METODE_BAYAR = [
  { id: 'BC', name: 'BCA Virtual Account', provider: 'Duitku', type: 'VA', code: 'BC', group: 'Virtual Account' },
  { id: 'SP', name: 'QRIS', provider: 'Duitku', type: 'QRIS', code: 'SP', group: 'E-Wallet & QRIS' },
  { id: 'FT', name: 'Alfamart / Pegadaian / Pos', provider: 'Duitku', type: 'RETAIL', code: 'FT', group: 'Gerai Retail' },
  { id: 'OV', name: 'OVO', provider: 'Duitku', type: 'EWALLET', code: 'OV', group: 'E-Wallet & QRIS' },
  {
    id: 'manual_acc-1',
    name: 'Transfer BCA',
    provider: 'Manual',
    type: 'BANK_TRANSFER',
    code: 'MANUAL_acc-1',
    group: 'Transfer Bank',
    details: { bankName: 'BCA', accountName: 'PT Radpro', accountNumber: '1234567890' },
  },
];

type Rekaman = Record<string, unknown>;

/** Satu tagihan seperti `GET /api/customer/invoices` mengirimnya. */
export function buatTagihan(ubah: Rekaman = {}): Rekaman {
  return {
    id: 'inv-1',
    invoiceNumber: 'INV-1',
    status: 'OVERDUE',
    totalAmount: 11100,
    paidAmount: 0,
    remainingAmount: 11100,
    items: [{ description: 'Internet' }],
    issueDate: '2026-10-27T03:00:00.000Z',
    dueDate: '2026-10-30T00:00:00.000Z',
    lastPayment: null,
    ...ubah,
  };
}

/** Checkout QRIS yang menunggu dibayar, satu tagihan. */
export const CHECKOUT_QRIS: Rekaman = {
  id: 'pay-1',
  amount: 11100,
  date: '2026-10-30T00:00:00.000Z',
  method: 'OTHER',
  gatewayStatus: 'PENDING',
  gatewayProvider: 'SP',
  paymentUrl: 'https://sandbox.duitku.com/bayar',
  qrString: '000201QRIS',
  vaNumber: null,
  expiresAt: '2099-01-01T00:00:00.000Z',
};

/** Checkout transfer manual yang menunggu bukti transfer. */
export const CHECKOUT_MANUAL: Rekaman = {
  id: 'pay-m1',
  amount: 11100,
  date: '2026-10-30T00:00:00.000Z',
  method: 'BANK_TRANSFER',
  accountId: 'acc-1',
  gatewayStatus: 'PENDING',
  gatewayProvider: null,
  paymentUrl: null,
  qrString: null,
  vaNumber: null,
  expiresAt: null,
  receiptUrl: null,
  isManual: true,
};

/** Batas bawaan server bila `limit` tidak dikirim. */
const BATAS_BAWAAN_SERVER = 10;

/**
 * Tagihan yang tersaring `?status=` lalu dipotong `?limit=` seperti server
 * (daftar uji ditulis urut terbit terbaru lebih dulu, sama dengan server).
 */
function saringStatus(url: string, daftar: Rekaman[]): Rekaman[] {
  const parameter = new URL(url, 'https://contoh.test').searchParams;
  const status = parameter.get('status');
  const diminta = status ? new Set(status.split(',')) : null;
  const tersaring = diminta ? daftar.filter((tagihan) => diminta.has(String(tagihan.status))) : daftar;
  return tersaring.slice(0, Number(parameter.get('limit') ?? BATAS_BAWAAN_SERVER));
}

interface OpsiServer {
  metode?: unknown[];
  profil?: Rekaman;
}

/** Jawaban `api.get` portal pelanggan; filter status tagihan dihormati. */
export function jawabanServer(daftarTagihan: Rekaman[], opsi: OpsiServer = {}) {
  return async (url: string) => {
    if (url.startsWith('/api/customer/invoices')) {
      return { data: { success: true, data: { invoices: saringStatus(url, daftarTagihan), pagination: {} } } };
    }
    if (url.startsWith('/api/customer/profile')) {
      return { data: { success: true, data: { profile: { status: 'AKTIF', ...opsi.profil } } } };
    }
    if (url.startsWith('/api/customer/payment-methods')) {
      return { data: { success: true, data: opsi.metode ?? METODE_BAYAR } };
    }
    return { data: { success: true, data: {} } };
  };
}

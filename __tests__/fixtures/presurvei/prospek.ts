import type { ProspekDetail } from '@/types/presurvei';

/**
 * Rincian prospek uji; bentuk sama dengan balasan 201 `POST /api/presurvei/prospek`
 * yang dicek langsung ke server.
 */
export function buatProspekDetailUji(ubahan: Partial<ProspekDetail> = {}): ProspekDetail {
  return {
    id: 'p-baru',
    nama: 'Pak Budi Santoso',
    noTelp: '081234567890',
    alamat: 'Jl. Melati No. 5',
    jenis: 'CALON_PELANGGAN',
    peran: null,
    sumber: 'LAPANGAN',
    status: 'BARU',
    pemilikId: 's-1',
    namaPemilik: 'Budi Hartono',
    paketDiminati: null,
    canvasingId: null,
    createdAt: '2026-09-26T14:10:23.800Z',
    email: null,
    latitude: null,
    longitude: null,
    shareloc: null,
    iklanId: null,
    registrationId: null,
    referralNama: null,
    catatan: null,
    konversiAt: null,
    isSiapDipromosikan: false,
    updatedAt: '2026-09-26T14:10:23.800Z',
    ...ubahan,
  };
}

/** Galat axios 409 `DUPLIKAT` persis seperti balasan server. */
export function buatGalatDuplikatUji(duplikat: unknown[]) {
  return {
    isAxiosError: true,
    message: 'Request failed with status code 409',
    response: {
      status: 409,
      data: {
        success: false,
        error: 'Sudah ada prospek aktif dengan nomor telepon ini',
        code: 'DUPLIKAT',
        details: { duplikat },
      },
    },
  };
}

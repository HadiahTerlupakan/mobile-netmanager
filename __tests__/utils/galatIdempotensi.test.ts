import { describe, expect, it } from '@jest/globals';
import { AxiosError } from 'axios';

import {
  isGalatIdempotensiKunciDipakaiUlang,
  isGalatIdempotensiSedangDiproses,
  isGalatStatusTidakSah,
} from '@/utils/galatIdempotensi';

const HTTP_CONFLICT = 409;
const HTTP_BAD_REQUEST = 400;

const bangunGalat = (status: number, code: string) =>
  Object.assign(new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_REQUEST'), {
    response: { status, statusText: '', headers: {}, config: {}, data: { success: false, error: 'x', code } },
  });

describe('galatIdempotensi', () => {
  it('mengenali 409 IDEMPOTENCY_KEY_REUSED', () => {
    expect(isGalatIdempotensiKunciDipakaiUlang(bangunGalat(HTTP_CONFLICT, 'IDEMPOTENCY_KEY_REUSED'))).toBe(true);
  });

  it('tidak mencampur KEY_REUSED dengan IN_PROGRESS', () => {
    const sedangDiproses = bangunGalat(HTTP_CONFLICT, 'IDEMPOTENCY_IN_PROGRESS');
    const dipakaiUlang = bangunGalat(HTTP_CONFLICT, 'IDEMPOTENCY_KEY_REUSED');

    expect(isGalatIdempotensiKunciDipakaiUlang(sedangDiproses)).toBe(false);
    expect(isGalatIdempotensiSedangDiproses(dipakaiUlang)).toBe(false);
    expect(isGalatIdempotensiSedangDiproses(sedangDiproses)).toBe(true);
  });

  it('menolak status selain 409, galat tanpa response, dan galat biasa', () => {
    expect(isGalatIdempotensiKunciDipakaiUlang(bangunGalat(HTTP_BAD_REQUEST, 'IDEMPOTENCY_KEY_REUSED'))).toBe(false);
    expect(isGalatIdempotensiKunciDipakaiUlang(new AxiosError('Network Error'))).toBe(false);
    expect(isGalatIdempotensiKunciDipakaiUlang(new Error('IDEMPOTENCY_KEY_REUSED'))).toBe(false);
  });

  // Dipakai bersama oleh useUbahStatusProspek (Task 15) dan useJadikanCanvasing
  // (Task 16) — dipindah ke sini fix round 1 Task 16 supaya tidak diduplikasi.
  it('mengenali 409 INVALID_STATE dan tidak mencampurnya dengan kode idempotensi', () => {
    expect(isGalatStatusTidakSah(bangunGalat(HTTP_CONFLICT, 'INVALID_STATE'))).toBe(true);
    expect(isGalatStatusTidakSah(bangunGalat(HTTP_CONFLICT, 'IDEMPOTENCY_KEY_REUSED'))).toBe(false);
    expect(isGalatStatusTidakSah(bangunGalat(HTTP_BAD_REQUEST, 'INVALID_STATE'))).toBe(false);
    expect(isGalatStatusTidakSah(new Error('INVALID_STATE'))).toBe(false);
  });
});

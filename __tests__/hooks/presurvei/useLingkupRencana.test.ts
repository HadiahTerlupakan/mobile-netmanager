import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { renderHook } from '@testing-library/react-native';

let mockProfil: { id?: string; lingkupRencana?: string } | undefined;
jest.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u-auth' } }) }));
jest.mock('@/hooks/useProfileSync', () => ({ useProfileSync: () => ({ profileData: mockProfil }) }));

import { useLingkupRencana } from '@/hooks/presurvei/useLingkupRencana';

describe('useLingkupRencana', () => {
  beforeEach(() => {
    mockProfil = undefined;
  });

  it('kepala sales (TIM) adalah pemberi tugas dengan id dari profil', () => {
    mockProfil = { id: 'k-1', lingkupRencana: 'TIM' };
    expect(renderHook(() => useLingkupRencana()).result.current).toEqual({ isPemberiTugas: true, penggunaId: 'k-1' });
  });

  it('profil belum termuat: diperlakukan sales biasa, id dari sesi', () => {
    expect(renderHook(() => useLingkupRencana()).result.current).toEqual({ isPemberiTugas: false, penggunaId: 'u-auth' });
  });
});

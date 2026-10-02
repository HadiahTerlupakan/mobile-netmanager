import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('expo-router', () => ({ useFocusEffect: jest.fn() }));
jest.mock('@tanstack/react-query', () => ({ useQueryClient: jest.fn() }));
jest.mock('@/lib/queryClient', () => ({ queryKeys: { investor: { all: ['investor'] } } }));

import {
  aturUlangJedaSegarInvestor,
  JEDA_SEGAR_INVESTOR_MS,
  segarkanBilaPerlu,
} from '@/hooks/useSegarkanDataInvestor';

describe('segarkanBilaPerlu', () => {
  beforeEach(() => aturUlangJedaSegarInvestor());

  it('menyegarkan sekali lalu menahan sampai jeda lewat', () => {
    const segarkan = jest.fn();
    const awal = 1_000_000;

    expect(segarkanBilaPerlu(segarkan, awal)).toBe(true);
    expect(segarkanBilaPerlu(segarkan, awal + JEDA_SEGAR_INVESTOR_MS - 1)).toBe(false);
    expect(segarkanBilaPerlu(segarkan, awal + JEDA_SEGAR_INVESTOR_MS)).toBe(true);
    expect(segarkan).toHaveBeenCalledTimes(2);
  });
});

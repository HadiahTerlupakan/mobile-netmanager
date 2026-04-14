import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import api from '@/services/api';
import { MixRadiusService } from '@/services/MixRadiusService';

describe('MixRadiusService.getIsolirCustomers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the mobile customers endpoint for isolir queries', async () => {
    const apiGetMock = api.get as jest.MockedFunction<typeof api.get>;
    apiGetMock.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          draw: 1,
          recordsTotal: 0,
          recordsFiltered: 0,
          data: [],
        },
      },
    });

    await MixRadiusService.getIsolirCustomers('andi', 0, 100, undefined, 'group-1');

    expect(apiGetMock).toHaveBeenCalledWith('/api/mobile/mixradius/customers', {
      params: {
        authStatus: 'Disabled-Users',
        search: 'andi',
        searchType: 'all',
        start: 0,
        length: 100,
        draw: 1,
        groupId: 'group-1',
      },
    });
  });
});

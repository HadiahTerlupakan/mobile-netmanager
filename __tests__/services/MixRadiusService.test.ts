import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import api from '@/services/api';
import { MixRadiusService, MixRadiusResponse } from '@/services/MixRadiusService';

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

  it('normalizes wrapped paginated responses', async () => {
    const apiGetMock = api.get as jest.MockedFunction<typeof api.get>;
    const wrappedPayload: MixRadiusResponse = {
      draw: 1,
      recordsTotal: 77,
      recordsFiltered: 12,
      data: [
        {
          id: 'cust-1',
          member_id: 'member-1',
          username: 'andi',
          fullname: 'Andi Teknisi',
          address: 'Jl. Mawar',
          phonenumber: '08123456789',
          plan_name: '20 Mbps',
          auth_status: 'Disabled-Users',
          expired_on: '2026-04-30 00:00:00',
          owner_name: 'Owner A',
          online: false,
        },
      ],
    };

    apiGetMock.mockResolvedValueOnce({
      data: {
        success: true,
        data: wrappedPayload,
      },
    });

    await expect(MixRadiusService.getIsolirCustomers()).resolves.toEqual(wrappedPayload);
  });

  it('wraps legacy array payloads into paginated responses', async () => {
    const apiGetMock = api.get as jest.MockedFunction<typeof api.get>;
    apiGetMock.mockResolvedValueOnce({
      data: [
        {
          id: 'cust-2',
          member_id: 'member-2',
          username: 'budi',
          fullname: 'Budi Isolir',
          address: 'Jl. Melati',
          phonenumber: '08999999999',
          plan_name: '30 Mbps',
          auth_status: 'Disabled-Users',
          expired_on: '2026-05-01 00:00:00',
          owner_name: 'Owner B',
          online: true,
        },
      ],
    });

    await expect(MixRadiusService.getIsolirCustomers('budi')).resolves.toEqual({
      draw: 1,
      recordsTotal: 1,
      recordsFiltered: 1,
      data: [
        {
          id: 'cust-2',
          member_id: 'member-2',
          username: 'budi',
          fullname: 'Budi Isolir',
          address: 'Jl. Melati',
          phonenumber: '08999999999',
          plan_name: '30 Mbps',
          auth_status: 'Disabled-Users',
          expired_on: '2026-05-01 00:00:00',
          owner_name: 'Owner B',
          online: true,
        },
      ],
    });
  });
});

import {
  getCustomerSearchFailureMessage,
  readCustomerSearchResults,
  shouldShowCustomerSearchEmptyState,
  shouldShowCustomerSearchErrorState,
} from '@/utils/requestWorkOrderSearch'

describe('requestWorkOrderSearch helpers', () => {
  it('prefers backend error messages for customer search failures', () => {
    const error = {
      isAxiosError: true,
      response: {
        status: 500,
        data: {
          error: 'Gagal mencari pelanggan',
        },
      },
    }

    expect(getCustomerSearchFailureMessage(error)).toBe('Gagal mencari pelanggan')
  })

  it('falls back to generic search guidance when no backend message exists', () => {
    expect(getCustomerSearchFailureMessage(new Error('boom'))).toBe(
      'Pencarian pelanggan sedang bermasalah. Coba lagi.'
    )
  })

  it('reads customer search results from wrapped mixradius payloads', () => {
    expect(
      readCustomerSearchResults({
        success: true,
        data: {
          draw: 1,
          recordsTotal: 1,
          recordsFiltered: 1,
          data: [
            {
              id: 'cust-1',
              member_id: 'member-1',
              username: 'andi',
              fullname: 'Andi Teknisi',
              phonenumber: '08123456789',
              address: 'Jl. Mawar',
              plan_name: '20 Mbps',
              owner_name: 'Owner A',
              auth_status: 'Disabled-Users',
              online: false,
            },
          ],
        },
      })
    ).toEqual([
      {
        id: 'cust-1',
        memberId: 'member-1',
        username: 'andi',
        fullname: 'Andi Teknisi',
        phone: '08123456789',
        address: 'Jl. Mawar',
        planName: '20 Mbps',
        ownerName: 'Owner A',
        status: 'Disabled-Users',
        isOnline: false,
      },
    ])
  })

  it('shows empty state only when there is no search error', () => {
    expect(
      shouldShowCustomerSearchEmptyState({
        showSearchResults: true,
        searching: false,
        searchQuery: 'yan',
        customersCount: 0,
        searchError: null,
      })
    ).toBe(true)

    expect(
      shouldShowCustomerSearchEmptyState({
        showSearchResults: true,
        searching: false,
        searchQuery: 'yan',
        customersCount: 0,
        searchError: 'Gagal mencari pelanggan',
      })
    ).toBe(false)
  })

  it('shows error state when search fails after the user types enough characters', () => {
    expect(
      shouldShowCustomerSearchErrorState({
        searching: false,
        searchQuery: 'yan',
        searchError: 'Gagal mencari pelanggan',
      })
    ).toBe(true)
  })
})

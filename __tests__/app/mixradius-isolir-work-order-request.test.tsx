import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { render } from '@testing-library/react-native';

const mockAlert = jest.fn();
const mockMutate = jest.fn();
const mockLoadingModal = jest.fn((_props?: unknown) => null);
const mockRenderedCustomerItems: Array<any> = [];
const mockUseApiQuery = jest.fn((options?: unknown) => options);
const mockUseApiMutation = jest.fn((options?: unknown) => ({
  mutate: jest.fn(),
  isPending: false,
  options,
}));
let mockIsPending = false;

const mockUseCreateWorkOrderRequest = jest.fn((options?: unknown) => ({
  mutate: mockMutate,
  isPending: mockIsPending,
  options,
}));

const mixRadiusCustomer = {
  id: 'cust-1',
  member_id: 'MR-001',
  username: 'budi',
  fullname: 'Budi Santoso',
  address: 'Jl. Mawar No. 1',
  phonenumber: '08123456789',
  plan_name: 'Paket 20 Mbps',
  auth_status: 'isolir',
  expired_on: '2026-04-01',
  owner_name: 'Site A',
  group_name: 'Site A',
};

jest.mock('expo-router', () => ({
  Stack: {
    Screen: () => null,
  },
}));

jest.mock('@/hooks/useFeatureGuard', () => ({
  useFeatureGuard: jest.fn(),
}));

jest.mock('@/constants/features', () => ({
  AppFeature: {
    MIXRADIUS: 'mixradius',
  },
}));

jest.mock('@/hooks/queries', () => ({
  useApiQuery: (options: unknown) => mockUseApiQuery(options),
  useApiMutation: (options: unknown) => mockUseApiMutation(options),
  useCreateWorkOrderRequest: (options?: unknown) =>
    mockUseCreateWorkOrderRequest(options),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@shopify/flash-list', () => {
  const MockReact = require('react');
  const { TouchableOpacity: MockTouchableOpacity, Text: MockText } = require('react-native');

  return {
    FlashList: ({ data = [], renderItem, ListHeaderComponent, ListEmptyComponent }: any) => (
      <>
        {ListHeaderComponent}
        {data.map((item: any, index: number) => {
          const renderedItem = renderItem({ item, index });
          const handleDismantle = renderedItem.props?.onDismantle;
          const customer = renderedItem.props?.item;

          mockRenderedCustomerItems.push({ handleDismantle, customer });

          return (
            <MockReact.Fragment key={item.id ?? index}>
              {renderedItem}
              <MockTouchableOpacity
                accessibilityLabel={`trigger-dismantle-${item.id}`}
                testID={`trigger-dismantle-${item.id}`}
                onPress={() => handleDismantle?.(customer)}
              >
                <MockText>{`Trigger Dismantle ${item.id}`}</MockText>
              </MockTouchableOpacity>
            </MockReact.Fragment>
          );
        })}
        {data.length === 0 ? ListEmptyComponent : null}
      </>
    ),
  };
});

jest.mock('@/components/molecules/SelectionModal', () => {
  const MockReact = require('react');
  return {
    __esModule: true,
    default: ({ visible, onSelect, items, title }: any) => {
      MockReact.useEffect(() => {
        if (visible && onSelect && items && items.length > 0 && title === 'Pilih Alasan Dismantle') {
          // Wrap in a tiny timeout or execute directly (should be in act in test)
          onSelect(items[0]);
        }
      }, [visible]);
      return null;
    },
  };
});

jest.mock('@/components/molecules/IsolirSkeleton', () => ({
  IsolirSkeleton: () => null,
}));

jest.mock('@/components/molecules/LoadingModal', () => ({
  __esModule: true,
  default: (props: unknown) => mockLoadingModal(props),
}));

jest.mock('@/utils/date', () => ({
  formatDate: jest.fn(() => '01 Apr 2026'),
}));

jest.mock('@/utils/errorHandling', () => ({
  getUserFriendlyError: jest.fn(() => ({ message: 'Terjadi kesalahan' })),
}));

jest.mock('@/utils/errorPresenter', () => ({
  presentAppError: jest.fn(),
}));

jest.mock('lucide-react-native', () => ({
  Search: () => null,
  X: () => null,
  Filter: () => null,
  CloudOff: () => null,
  AlertTriangle: () => null,
  MapPin: () => null,
  Phone: () => null,
  Calendar: () => null,
  Building: () => null,
  Trash2: () => null,
}));

jest.mock('twrnc', () => () => ({}));

describe('mixradius isolir work order request boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRenderedCustomerItems.length = 0;
    mockIsPending = false;

    const { Alert } = require('react-native');
    Alert.alert = mockAlert;

    mockUseApiQuery.mockImplementation(({ queryKey }: any) => {
      if (queryKey?.[1] === 'groups') {
        return { data: [] };
      }

      return {
        data: { data: [mixRadiusCustomer], recordsFiltered: 1, recordsTotal: 1 },
        isFetching: false,
        refetch: jest.fn(),
        isRefetching: false,
        isError: false,
        error: null,
      };
    });
  });

  it('menggunakan flow request work order mobile untuk aksi dismantle', () => {
    const MixRadiusIsolirScreen = require('../../app/(app)/mixradius/isolir').default;

    render(<MixRadiusIsolirScreen />);

    expect(mockUseCreateWorkOrderRequest).toHaveBeenCalled();
    expect(mockUseApiMutation).not.toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: '/api/integrations/mixradius/dismantle',
      }),
    );
  });

  it('mengirim payload request dismantle yang valid ke route work order mobile', () => {
    const MixRadiusIsolirScreen = require('../../app/(app)/mixradius/isolir').default;

    const { act } = require('@testing-library/react-native');
    render(<MixRadiusIsolirScreen />);
    act(() => {
      mockRenderedCustomerItems[0].handleDismantle(mockRenderedCustomerItems[0].customer);
    });

    expect(mockAlert).toHaveBeenCalledWith(
      'Konfirmasi Bongkar',
      expect.stringContaining(mixRadiusCustomer.username),
      expect.any(Array),
    );

    const alertButtons = mockAlert.mock.calls[0][2] as Array<{ onPress?: () => void }>;
    alertButtons[1].onPress?.();

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'DISCONNECTION',
        title: `Request Dismantle: ${mixRadiusCustomer.fullname} (${mixRadiusCustomer.username})`,
        description: expect.stringContaining(mixRadiusCustomer.member_id),
        contactName: mixRadiusCustomer.fullname,
        contactPhone: mixRadiusCustomer.phonenumber,
        locationAddress: mixRadiusCustomer.address,
        notes: 'Request otomatis dari Aplikasi Mobile (Menu Isolir)',
      }),
      expect.objectContaining({
        onError: expect.any(Function),
      }),
    );
    expect(mockMutate).not.toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: mixRadiusCustomer.id,
      }),
      expect.anything(),
    );
    expect(mockMutate).not.toHaveBeenCalledWith(
      expect.objectContaining({
        siteId: expect.anything(),
      }),
      expect.anything(),
    );
  });

  it('menampilkan loading modal gaya absensi tanpa mengubah tombol bongkar menjadi loading per-item', () => {
    mockIsPending = true;
    const MixRadiusIsolirScreen = require('../../app/(app)/mixradius/isolir').default;

    const { queryByTestId } = render(<MixRadiusIsolirScreen />);

    expect(mockLoadingModal).toHaveBeenCalledWith(
      expect.objectContaining({
        visible: true,
        message: 'Mengirim request dismantle...',
      }),
    );
    expect(queryByTestId(`dismantle-button-${mixRadiusCustomer.id}`)).toBeNull();
  });

  it('tidak menampilkan customer dengan auth_status Disabled-Users di tab Isolir (Isolir = Expired only)', () => {
    const disabledCustomer = { ...mixRadiusCustomer, id: 'cust-disabled', auth_status: 'Disabled-Users' };
    const expiredCustomer = { ...mixRadiusCustomer, id: 'cust-expired', auth_status: 'Expired' };
    mockUseApiQuery.mockImplementation(({ queryKey }: any) => {
      if (queryKey?.[1] === 'groups') {
        return { data: [] };
      }
      return {
        data: { data: [disabledCustomer, expiredCustomer], recordsFiltered: 2, recordsTotal: 2 },
        isFetching: false,
        refetch: jest.fn(),
        isRefetching: false,
        isError: false,
        error: null,
      };
    });

    const MixRadiusIsolirScreen = require('../../app/(app)/mixradius/isolir').default;
    render(<MixRadiusIsolirScreen />);

    // Hanya yang Expired yang lolos; Disabled-Users dibuang.
    expect(mockRenderedCustomerItems).toHaveLength(1);
    expect(mockRenderedCustomerItems[0].customer.id).toBe('cust-expired');
  });
});

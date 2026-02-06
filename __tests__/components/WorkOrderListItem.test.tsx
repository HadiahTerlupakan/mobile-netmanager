import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { View, Text, Linking } from 'react-native';

// 1. Mocks
jest.mock('twrnc', () => {
  const tw = () => ({});
  // @ts-ignore
  tw.style = () => ({});
  // @ts-ignore
  tw.color = () => 'black';
  return {
    __esModule: true,
    default: tw,
  };
});

// Mock icons
jest.mock('lucide-react-native', () => {
  const { View } = require('react-native');
  const React = require('react');
  const MockIcon = (props: any) => React.createElement(View, { ...props, testID: 'icon-mock' });
  return {
    AlertCircle: MockIcon,
    Clock: MockIcon,
    MapPin: MockIcon,
    Phone: MockIcon,
  };
});

// Mock Badge
jest.mock('../../src/components/atoms/Badge', () => {
  const { Text } = require('react-native');
  const React = require('react');
  return {
    Badge: ({ label, variant }: any) => React.createElement(Text, { testID: 'badge' }, `Badge: ${label} (${variant})`),
  };
});

jest.mock('../../src/utils/date', () => ({
  formatDate: jest.fn((date) => `Formatted: ${date}`),
}));

// We rely on __mocks__/react-native.js for Linking, which we updated to include openURL.
// But to be safe and explicit in this test file (and avoid "undefined" errors if the global mock isn't picked up correctly for some reason):
Object.defineProperty(Linking, 'openURL', {
  value: jest.fn(() => Promise.resolve(true)),
  writable: true,
});

// 2. Import Component
import WorkOrderListItem from '../../src/components/organisms/dashboard/WorkOrderListItem';

describe('WorkOrderListItem', () => {
  const mockItem = {
    id: 'wo-1',
    workOrderNumber: 'WO-001',
    status: 'ASSIGNED',
    title: 'Fix Internet',
    priority: 'HIGH',
    contactPhone: '081234567890',
    contactName: 'John Doe',
    locationAddress: 'Jl. Test No. 1',
    scheduledDate: '2023-10-27T10:00:00Z',
    assignments: [
      { userId: 'user-1', role: 'LEADER', status: 'ACCEPTED' }
    ],
    pelanggan: {
      nama: 'John Doe',
      noTelp: '081234567890',
      alamat: 'Jl. Test No. 1',
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with basic info', () => {
    const { getByText } = render(<WorkOrderListItem item={mockItem} userId="user-1" />);

    expect(getByText('WO-001')).toBeTruthy();
    expect(getByText('Fix Internet')).toBeTruthy();
    expect(getByText('Badge: ASSIGNED (info)')).toBeTruthy();
    expect(getByText('HIGH')).toBeTruthy();
    expect(getByText('Formatted: 2023-10-27T10:00:00Z')).toBeTruthy();
  });

  it('renders priority colors correctly', () => {
    const urgentItem = { ...mockItem, priority: 'URGENT' };
    const { getByText } = render(<WorkOrderListItem item={urgentItem} />);
    expect(getByText('URGENT')).toBeTruthy();
  });

  it('handles phone press', () => {
    const { getByText } = render(<WorkOrderListItem item={mockItem} />);
    const phoneButton = getByText('081234567890');

    fireEvent.press(phoneButton);

    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('whatsapp://send'));
  });

  it('handles address press', () => {
    const { getByText } = render(<WorkOrderListItem item={mockItem} />);
    const addressButton = getByText('Jl. Test No. 1');

    fireEvent.press(addressButton);

    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('google.com/maps/search'));
  });

  it('shows pending partner status', () => {
    const pendingItem = {
      ...mockItem,
      assignments: [
        { userId: 'user-2', role: 'PARTNER', status: 'PENDING' }
      ]
    };

    const { getByText } = render(<WorkOrderListItem item={pendingItem} userId="user-2" />);

    expect(getByText('Menunggu Konfirmasi Anda')).toBeTruthy();
    expect(getByText('Badge: Undangan (warning)')).toBeTruthy();
  });
});

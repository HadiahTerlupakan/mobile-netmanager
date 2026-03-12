import React from 'react';
import { render } from '@testing-library/react-native';

import HolidaysScreen from '../../app/(app)/holidays';

const mockRefetch = jest.fn();

jest.mock('@/components/molecules/HolidaySkeleton', () => ({
  HolidaySkeleton: () => null,
}));

jest.mock('@/hooks/queries', () => ({
  useOfflineQuery: jest.fn(() => ({
    data: [],
    isPending: false,
    isError: false,
    error: null,
    refetch: mockRefetch,
  })),
}));

jest.mock('@/hooks/useFeatureGuard', () => ({
  useFeatureGuard: jest.fn(),
}));

jest.mock('@/constants/features', () => ({
  AppFeature: {
    HOLIDAYS: 'm_holidays',
  },
}));

jest.mock('@/lib/queryClient', () => ({
  queryKeys: {
    holidays: {
      list: (year: number) => ['holidays', 'list', year],
    },
  },
}));

jest.mock('@/utils/date', () => ({
  addMonths: (date: Date) => date,
  subMonths: (date: Date) => date,
  formatDate: () => 'March 2026',
}));

jest.mock('@/utils/errorHandling', () => ({
  getUserFriendlyError: () => ({ message: 'error' }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: jest.fn(),
  }),
  useFocusEffect: (callback: () => void | (() => void)) => callback(),
}));

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    SafeAreaView: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
  };
});

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    AlertTriangle: () => <View />,
    ArrowLeft: () => <View />,
    ChevronLeft: () => <View />,
    ChevronRight: () => <View />,
  };
});

jest.mock('twrnc', () => {
  return () => ({});
});

describe('HolidaysScreen', () => {
  beforeEach(() => {
    mockRefetch.mockClear();
  });

  it('refetches holidays when the screen gains focus', () => {
    render(<HolidaysScreen />);

    expect(mockRefetch).toHaveBeenCalled();
  });
});

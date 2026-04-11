import { render } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';

const mockSignIn = jest.fn();
const mockHandleValidatedSubmit = jest.fn((callback: unknown) => callback);

jest.mock('@/components/atoms/FormInput', () => ({
  FormInput: () => null,
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
  }),
}));

jest.mock('@/hooks/useFormWithValidation', () => ({
  useFormWithValidation: () => ({
    control: {},
    handleValidatedSubmit: mockHandleValidatedSubmit,
    formState: {
      errors: {},
    },
  }),
}));

jest.mock('@/services/BiometricService', () => ({
  biometricService: {
    isAvailable: jest.fn(() => Promise.resolve(false)),
    isBiometricEnabled: jest.fn(() => Promise.resolve(false)),
    getSupportedTypes: jest.fn(() => Promise.resolve([])),
    authenticate: jest.fn(),
  },
}));

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

jest.mock('@/utils/errorPresenter', () => ({
  presentAppError: jest.fn(),
  presentErrorMessage: jest.fn(),
  presentInfoMessage: jest.fn(),
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    auth: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/constants/appVersion', () => ({
  CURRENT_VERSION_CODE: 35,
  CURRENT_VERSION_NAME: '1.0.34',
}));

jest.mock('@/constants/Events', () => ({
  Events: {
    APP_VERSION_UNSUPPORTED: 'APP_VERSION_UNSUPPORTED',
  },
}));

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

jest.mock('lucide-react-native', () => ({
  Fingerprint: () => null,
  Lock: () => null,
  User: () => null,
}));

jest.mock('twrnc', () => () => ({}));

jest.mock('@assets/images/icon.png', () => 1, { virtual: true });

describe('Login privacy copy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a cleaner privacy policy link copy', async () => {
    const LoginScreen = require('../../app/(auth)/login').default;
    const { getByText, queryByText } = render(<LoginScreen />);

    expect(queryByText('Kebijakan Privasi')).toBeNull();
    expect(getByText('Kebijakan Privasi kami')).toBeTruthy();
  });
});

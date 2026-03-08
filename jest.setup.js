// Jest setup file - runs after test framework is installed
try {
  require('@testing-library/jest-native/extend-expect');
} catch {
}

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      hostUri: '127.0.0.1:8081',
    },
  },
}));

// Define __DEV__
global.__DEV__ = false;

// Mock AxiosError class
class MockAxiosError extends Error {
  constructor(message) {
    super(message);
    this.isAxiosError = true;
  }
}

// Mock axios
jest.mock('axios', () => {
  const mockAxios = jest.fn(() => Promise.resolve({ data: {} }));

  Object.assign(mockAxios, {
    create: jest.fn(() => mockAxios),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
    defaults: { headers: { common: {} } },
    post: jest.fn(() => Promise.resolve({ data: {} })),
    get: jest.fn(() => Promise.resolve({ data: {} })),
    isAxiosError: jest.fn((err) => err?.isAxiosError === true),
    AxiosError: MockAxiosError,
  });

  return {
    __esModule: true,
    default: mockAxios,
    isAxiosError: mockAxios.isAxiosError,
    AxiosError: MockAxiosError,
  };
});

// Suppress console logs during tests (except errors for debugging)
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  // Keep error for debugging
  error: console.error,
};

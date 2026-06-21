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

// Mock react-native components and modules
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  
  // Fix Platform.select issue in Jest
  RN.Platform.select = (objs) => objs.default || objs.ios || objs.android;
  
  return RN;
});

// Mock react-native-toast-message
jest.mock('react-native-toast-message', () => ({
  show: jest.fn(),
  hide: jest.fn(),
  default: {
    show: jest.fn(),
    hide: jest.fn(),
  },
}));

// Mock expo-file-system/legacy globally
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///mock-document-directory/',
  uploadAsync: jest.fn(),
  createUploadTask: jest.fn(() => ({
    uploadAsync: jest.fn().mockResolvedValue({ status: 200, body: '{}' }),
    cancelAsync: jest.fn(),
  })),
  FileSystemUploadType: {
    MULTIPART: 'multipart',
  },
  getInfoAsync: jest.fn(() => Promise.resolve({ exists: true, isDirectory: true })),
  copyAsync: jest.fn(() => Promise.resolve()),
  deleteAsync: jest.fn(() => Promise.resolve()),
  makeDirectoryAsync: jest.fn(() => Promise.resolve()),
  readDirectoryAsync: jest.fn(() => Promise.resolve([])),
}));

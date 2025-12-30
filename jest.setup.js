// Jest setup file - runs after test framework is installed
import '@testing-library/jest-native/extend-expect';

// Suppress console logs during tests (except errors for debugging)
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  // Keep error for debugging
  error: console.error,
};

// Mock axios
jest.mock('axios');

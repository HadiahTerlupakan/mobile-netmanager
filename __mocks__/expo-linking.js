// Mock expo-linking untuk jest — modul asli meng-crash environment test
// karena expo-modules-core EventEmitter tidak tersedia di Node.
module.exports = {
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  getInitialURL: jest.fn(() => Promise.resolve(null)),
  openSettings: jest.fn(() => Promise.resolve()),
  openURL: jest.fn(() => Promise.resolve()),
  parse: jest.fn((url) => ({ path: url, queryParams: {} })),
  createURL: jest.fn((path) => `netmanager://${path}`),
};

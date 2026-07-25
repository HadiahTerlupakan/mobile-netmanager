// Mock expo-updates untuk jest — modul asli meng-crash environment test
// karena expo-modules-core EventEmitter tidak tersedia di Node.
module.exports = {
  isEnabled: false,
  channel: 'test',
  runtimeVersion: '1.0.0',
  updateId: null,
  checkForUpdateAsync: jest.fn(() => Promise.resolve({ isAvailable: false })),
  fetchUpdateAsync: jest.fn(() => Promise.resolve({ isNew: false })),
  reloadAsync: jest.fn(() => Promise.resolve()),
};

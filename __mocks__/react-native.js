const reactNative = jest.requireActual('react-native');

reactNative.Alert.alert = jest.fn();

// Create a stable mock object for Linking
const linkingMock = {
  openURL: jest.fn(() => Promise.resolve(true)),
  canOpenURL: jest.fn(() => Promise.resolve(true)),
  openSettings: jest.fn(),
  addEventListener: jest.fn(),
  getInitialURL: jest.fn(),
  removeEventListener: jest.fn(),
  sendIntent: jest.fn(),
};

// Mock Linking
Object.defineProperty(reactNative, 'Linking', {
  get: () => linkingMock,
});

module.exports = reactNative;

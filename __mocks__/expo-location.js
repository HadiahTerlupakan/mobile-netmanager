module.exports = {
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(() => Promise.resolve({
    coords: { latitude: -6.2088, longitude: 106.8456 }
  })),
  Accuracy: { Balanced: 3 }
};

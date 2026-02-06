export const createMMKV = jest.fn().mockImplementation(() => ({
  set: jest.fn(),
  getString: jest.fn(),
  getNumber: jest.fn(),
  getBoolean: jest.fn(),
  remove: jest.fn(),
  getAllKeys: jest.fn(),
  clearAll: jest.fn(),
  recrypt: jest.fn(),
}));

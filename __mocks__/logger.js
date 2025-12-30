// Mock for @/utils/logger
const mockLogger = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  auth: jest.fn(),
  socket: jest.fn(),
  sync: jest.fn(),
  db: jest.fn(),
};

module.exports = mockLogger;
module.exports.default = mockLogger;
module.exports.logger = mockLogger;

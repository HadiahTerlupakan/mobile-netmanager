describe('logger branding', () => {
  const originalDev = (global as typeof globalThis & { __DEV__?: boolean }).__DEV__;
  const originalDebug = process.env.EXPO_DEBUG;

  beforeEach(() => {
    jest.resetModules();
    (global as typeof globalThis & { __DEV__?: boolean }).__DEV__ = true;
    process.env.EXPO_DEBUG = 'true';
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    (global as typeof globalThis & { __DEV__?: boolean }).__DEV__ = originalDev;
    process.env.EXPO_DEBUG = originalDebug;
  });

  it('uses RADPRO log prefix', () => {
    const { logger } = require('../../src/utils/logger');

    logger.log('hello');

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[RADPRO]'));
  });
});

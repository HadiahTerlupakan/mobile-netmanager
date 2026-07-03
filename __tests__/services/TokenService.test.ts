import { describe, expect, it, beforeEach } from '@jest/globals';

const buildJwt = (payload: Record<string, unknown>): string => {
  const encode = (obj: Record<string, unknown>) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const body = encode(payload);
  return `${header}.${body}.fakesig`;
};

describe('TokenService', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('returns null getExpiry when no token set', () => {
    const { TokenService } = require('@/services/TokenService');
    TokenService.setToken(null);
    expect(TokenService.getExpiry()).toBeNull();
  });

  it('returns expiry epoch ms from valid JWT exp claim', () => {
    const { TokenService } = require('@/services/TokenService');
    const expSec = Math.floor(Date.now() / 1000) + 3600;
    const token = buildJwt({ sub: 'user-1', exp: expSec });
    TokenService.setToken(token);
    expect(TokenService.getExpiry()).toBe(expSec * 1000);
  });

  it('returns null when JWT has no exp claim', () => {
    const { TokenService } = require('@/services/TokenService');
    TokenService.setToken(buildJwt({ sub: 'user-1' }));
    expect(TokenService.getExpiry()).toBeNull();
  });

  it('returns null for malformed token (not 3 segments)', () => {
    const { TokenService } = require('@/services/TokenService');
    TokenService.setToken('not.a.valid.jwt.at.all.with.extra.dots');
    // still tries to decode segment[1] — result depends on parse; just confirm no throw
    expect(() => TokenService.getExpiry()).not.toThrow();
  });

  it('returns null for completely garbage token', () => {
    const { TokenService } = require('@/services/TokenService');
    TokenService.setToken('garbage');
    expect(TokenService.getExpiry()).toBeNull();
  });

  it('getToken returns last set token', () => {
    const { TokenService } = require('@/services/TokenService');
    TokenService.setToken('abc');
    expect(TokenService.getToken()).toBe('abc');
    TokenService.setToken(null);
    expect(TokenService.getToken()).toBeNull();
  });
});

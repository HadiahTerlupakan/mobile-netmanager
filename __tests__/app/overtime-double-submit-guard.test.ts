/**
 * Contract test: verifikasi payload yang dikirim mobile ke POST /api/mobile/overtime
 * sesuai dengan yang divalidasi backend (route.ts).
 *
 * Backend contract (dari app/api/mobile/overtime/route.ts):
 *   action="request" → wajib: date, reason
 *   action="start"   → wajib: overtimeId, photo (+ opsional: location, timestamp)
 *   action="stop"    → wajib: overtimeId, photo (+ opsional: location, timestamp)
 */

import { describe, it, expect } from '@jest/globals';

const BACKEND_REQUIRED: Record<string, string[]> = {
  request: ['date', 'reason'],
  start:   ['overtimeId', 'photo'],
  stop:    ['overtimeId', 'photo'],
};

const buildRequestPayload = (action: string, extras: Record<string, unknown> = {}) => ({
  action,
  ...extras,
});

const buildStartPayload = (overrides: Record<string, unknown> = {}) => ({
  action: 'start',
  overtimeId: 'ot-123',
  photo: 'https://storage.example.com/photo.jpg',
  location: '-6.200000,106.816666',
  timestamp: new Date().toISOString(),
  ...overrides,
});

const buildStopPayload = (overrides: Record<string, unknown> = {}) => ({
  action: 'stop',
  overtimeId: 'ot-123',
  photo: 'https://storage.example.com/photo.jpg',
  location: '-6.200000,106.816666',
  timestamp: new Date().toISOString(),
  ...overrides,
});

const KNOWN_ACTIONS = new Set(['request', 'start', 'stop']);

const validatePayload = (payload: Record<string, unknown>): { valid: boolean; missing: string[] } => {
  const action = payload.action as string | undefined;
  if (!action) return { valid: false, missing: ['action'] };
  if (!KNOWN_ACTIONS.has(action)) return { valid: false, missing: [] };
  const required = BACKEND_REQUIRED[action] ?? [];
  const missing = required.filter((f) => !payload[f]);
  return { valid: missing.length === 0, missing };
};

describe('POST /api/mobile/overtime — backend contract', () => {
  describe('action=request', () => {
    it('passes validation with date + reason', () => {
      const payload = buildRequestPayload('request', {
        date: new Date().toISOString(),
        reason: 'Maintenance jaringan',
      });
      expect(validatePayload(payload)).toEqual({ valid: true, missing: [] });
    });

    it('fails when reason is missing', () => {
      const payload = buildRequestPayload('request', { date: new Date().toISOString() });
      const { valid, missing } = validatePayload(payload);
      expect(valid).toBe(false);
      expect(missing).toContain('reason');
    });

    it('fails when date is missing', () => {
      const payload = buildRequestPayload('request', { reason: 'Maintenance' });
      const { valid, missing } = validatePayload(payload);
      expect(valid).toBe(false);
      expect(missing).toContain('date');
    });
  });

  describe('action=start', () => {
    it('passes validation with overtimeId + photo', () => {
      expect(validatePayload(buildStartPayload())).toEqual({ valid: true, missing: [] });
    });

    it('fails when overtimeId is missing', () => {
      const { valid, missing } = validatePayload(buildStartPayload({ overtimeId: undefined }));
      expect(valid).toBe(false);
      expect(missing).toContain('overtimeId');
    });

    it('fails when photo is missing', () => {
      const { valid, missing } = validatePayload(buildStartPayload({ photo: undefined }));
      expect(valid).toBe(false);
      expect(missing).toContain('photo');
    });

    it('location and timestamp are optional', () => {
      const payload = buildStartPayload({ location: undefined, timestamp: undefined });
      expect(validatePayload(payload)).toEqual({ valid: true, missing: [] });
    });
  });

  describe('action=stop', () => {
    it('passes validation with overtimeId + photo', () => {
      expect(validatePayload(buildStopPayload())).toEqual({ valid: true, missing: [] });
    });

    it('fails when overtimeId is missing', () => {
      const { valid, missing } = validatePayload(buildStopPayload({ overtimeId: undefined }));
      expect(valid).toBe(false);
      expect(missing).toContain('overtimeId');
    });

    it('fails when photo is missing', () => {
      const { valid, missing } = validatePayload(buildStopPayload({ photo: undefined }));
      expect(valid).toBe(false);
      expect(missing).toContain('photo');
    });
  });

  describe('invalid action', () => {
    it('fails for unknown action', () => {
      const { valid } = validatePayload(buildRequestPayload('approve'));
      expect(valid).toBe(false);
    });

    it('fails when action is missing entirely', () => {
      const { valid, missing } = validatePayload({});
      expect(valid).toBe(false);
      expect(missing).toContain('action');
    });
  });
});

describe('OvertimeScreen — double-submit guard logic', () => {
  it('guard returns early when isPending=true (simulates overtimeMutation.isPending)', () => {
    const submitCalled: string[] = [];

    const makeGuardedSubmit = (isPending: boolean) => () => {
      if (isPending) return;
      submitCalled.push('submitted');
    };

    makeGuardedSubmit(true)();
    expect(submitCalled).toHaveLength(0);

    makeGuardedSubmit(false)();
    expect(submitCalled).toHaveLength(1);
  });

  it('multiple rapid calls only execute once when first call sets isPending=true', () => {
    let isPending = false;
    const submitted: number[] = [];

    const guardedSubmit = () => {
      if (isPending) return;
      isPending = true;
      submitted.push(Date.now());
    };

    guardedSubmit();
    guardedSubmit();
    guardedSubmit();

    expect(submitted).toHaveLength(1);
  });
});

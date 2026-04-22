import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from '@jest/globals';

const canSource = readFileSync(
  join(__dirname, '../../src/components/atoms/Can.tsx'),
  'utf8'
);

const featureGuardSource = readFileSync(
  join(__dirname, '../../src/hooks/useFeatureGuard.ts'),
  'utf8'
);

const appLayoutSource = readFileSync(
  join(__dirname, '../../app/(app)/_layout.tsx'),
  'utf8'
);

describe('mobile UX-only guardrails contract', () => {
  it('menandai Can sebagai guard UX-only, bukan security boundary', () => {
    expect(canSource).toContain('UX-only access control component');
    expect(canSource).toContain('Jangan diperlakukan sebagai security boundary');
    expect(canSource).toContain('backend API authorization');
    expect(canSource).toContain('tenant isolation tetap source of truth');
  });

  it('menandai useFeatureGuard sebagai guard UX-only, bukan security boundary', () => {
    expect(featureGuardSource).toContain('UX-only feature guard');
    expect(featureGuardSource).toContain('Jangan diperlakukan sebagai security boundary');
    expect(featureGuardSource).toContain('backend API authorization');
    expect(featureGuardSource).toContain('tenant isolation tetap source of truth');
  });

  it('menjaga redirect guard mobile menuju dashboard app canonical', () => {
    expect(featureGuardSource).toContain('/(app)/dashboard');
    expect(appLayoutSource).toContain('/(app)/dashboard');
    expect(appLayoutSource).not.toContain("router.replace('/dashboard')");
  });
});

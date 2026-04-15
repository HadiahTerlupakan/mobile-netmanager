import { readFileSync } from 'fs';
import { join } from 'path';

describe('mobile UX-only guardrails contract', () => {
  it('menandai Can sebagai guard UX-only, bukan security boundary', () => {
    const canSource = readFileSync(
      join(process.cwd(), 'src', 'components', 'atoms', 'Can.tsx'),
      'utf8'
    );

    expect(canSource).toContain('UX-only access control component');
    expect(canSource).toContain('Jangan diperlakukan sebagai security boundary');
    expect(canSource).toContain('backend API authorization');
    expect(canSource).toContain('tenant isolation tetap source of truth');
  });

  it('menandai useFeatureGuard sebagai guard UX-only, bukan security boundary', () => {
    const featureGuardSource = readFileSync(
      join(process.cwd(), 'src', 'hooks', 'useFeatureGuard.ts'),
      'utf8'
    );

    expect(featureGuardSource).toContain('UX-only feature guard');
    expect(featureGuardSource).toContain('Jangan diperlakukan sebagai security boundary');
    expect(featureGuardSource).toContain('backend API authorization');
    expect(featureGuardSource).toContain('tenant isolation tetap source of truth');
  });
});

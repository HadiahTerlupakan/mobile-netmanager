import HmacSHA256 from 'crypto-js/hmac-sha256';
import Constants from 'expo-constants';

const SIGNING_KEY = Constants.expoConfig?.extra?.signingKey;

if (!SIGNING_KEY && !__DEV__) {
  throw new Error(
    '[crypto] OFFLINE_SIGNING_KEY is not configured. ' +
    'Add "signingKey" to app.json extra or set it via EAS Secrets.'
  );
}

const DEV_FALLBACK_KEY = 'dev-only-signing-key-not-for-production';
const effectiveKey = SIGNING_KEY || DEV_FALLBACK_KEY;

export function generateSignature(data: unknown): string {
  const payload = JSON.stringify(data);
  return HmacSHA256(payload, effectiveKey).toString();
}

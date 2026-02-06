import HmacSHA256 from 'crypto-js/hmac-sha256';
import Constants from 'expo-constants';

// IMPORTANT: This key MUST match the backend env variable OFFLINE_SIGNING_KEY
// We fetch this from expoConfig extra to avoid hardcoding in the source code.
const SIGNING_KEY = Constants.expoConfig?.extra?.signingKey || 'dev-dummy-signing-key';

if (!SIGNING_KEY) {
    console.warn('OFFLINE_SIGNING_KEY is missing in expo config. Using Dev Dummy.');
    // throw new Error('OFFLINE_SIGNING_KEY is missing in expo config');
}

export function generateSignature(data: unknown): string {
    const payload = JSON.stringify(data);
    return HmacSHA256(payload, SIGNING_KEY).toString();
}

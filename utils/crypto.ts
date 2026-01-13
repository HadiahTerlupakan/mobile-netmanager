import CryptoJS from 'crypto-js';

// IMPORTANT: This key MUST match the backend env variable OFFLINE_SIGNING_KEY
// In a real app, strict key management (SecureStore/Env) is vital.
// For now we hardcode the dev key to ensure matching.
const SIGNING_KEY = 'dev-key-change-in-prod-v1';

export function generateSignature(data: any): string {
    const payload = JSON.stringify(data);
    return CryptoJS.HmacSHA256(payload, SIGNING_KEY).toString();
}

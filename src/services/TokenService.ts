
let currentToken: string | null = null;

/** Decode JWT payload tanpa library — hanya baca 'exp' claim (epoch seconds). */
const decodeJwtExpiry = (token: string): number | null => {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    // atob tidak tersedia di semua RN env — gunakan Buffer via global atau manual base64
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(padded, 'base64').toString('utf8');
    const { exp } = JSON.parse(json) as { exp?: number };
    return typeof exp === 'number' ? exp * 1000 : null; // konversi ke ms
  } catch {
    return null;
  }
};

export const TokenService = {
  setToken: (token: string | null) => {
    currentToken = token;
  },
  getToken: () => currentToken,
  getExpiry: (): number | null => currentToken ? decodeJwtExpiry(currentToken) : null,
};

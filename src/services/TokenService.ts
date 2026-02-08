
let currentToken: string | null = null;

export const TokenService = {
  setToken: (token: string | null) => {
    currentToken = token;
  },
  getToken: () => currentToken,
};

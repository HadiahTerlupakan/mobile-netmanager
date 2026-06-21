export const getRandomValues = jest.fn((array) => {
  if (array) {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return array;
});

export const digestStringAsync = jest.fn().mockResolvedValue('mock-hash');
export const CryptoDigestAlgorithm = { SHA256: 'SHA-256' };
export const randomUUID = jest.fn(() => 'mocked-uuid-1234-5678');

// Mock expo-image-manipulator untuk jest — modul asli meng-crash environment
// test karena expo-modules-core EventEmitter tidak tersedia di Node. Layar
// Tagihan memuatnya lewat perkecilFoto (bukti transfer).
module.exports = {
  manipulateAsync: jest.fn((uri) => Promise.resolve({ uri, width: 0, height: 0 })),
  SaveFormat: { JPEG: 'jpeg', PNG: 'png', WEBP: 'webp' },
};

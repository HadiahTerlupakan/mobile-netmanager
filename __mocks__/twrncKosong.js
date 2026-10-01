/**
 * twrnc tiruan untuk tes yang tidak peduli gaya: setiap kelas menghasilkan
 * objek kosong. Meniru API yang dipakai aplikasi (`tw\`\``, `tw.style`,
 * `tw.color`, `create`) supaya lapisan tema persona (`create`) ikut jalan.
 * Pakai: `jest.mock('twrnc', () => require('twrnc-kosong'))`.
 */
const tw = () => ({});
tw.style = () => ({});
tw.color = () => undefined;
tw.prefixMatch = () => false;
tw.memoBuster = '';
tw.create = () => tw;

module.exports = tw;

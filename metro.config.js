const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable CSS support via Expo
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs'];

// maplibre-gl hanya dimuat di web (di dalam `Platform.OS === 'web'`). Sejak v6
// paketnya ESM murni tanpa entry `require`; build produksi membuang cabang web
// lebih dulu, tetapi bundle development Android/iOS tetap me-resolve-nya lalu
// gagal. Di luar web modul itu tidak pernah dipakai, jadi cukup kosong.
const resolveRequestBawaan = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'maplibre-gl' && platform !== 'web') {
    return { type: 'empty' };
  }
  return (resolveRequestBawaan ?? context.resolveRequest)(context, moduleName, platform);
};

// Configure transformer for better output
config.transformer.minifierConfig = {
  keep_classnames: true,
  keep_fnames: true,
  mangle: {
    keep_classnames: true,
    keep_fnames: true,
  },
};

module.exports = config;

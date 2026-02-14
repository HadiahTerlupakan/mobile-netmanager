module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { native: { minifyTypeofWindow: true } }]],
    plugins: ['react-native-reanimated/plugin'],
  };
};

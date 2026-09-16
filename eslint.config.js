// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

// Skrip build/CI dan config plugin berjalan di Node, bukan di runtime React
// Native, tetapi eslint-config-expo hanya memberi globals Node ke
// metro.config.js. Daftarnya ditulis manual, bukan lewat paket `globals`:
// menambah dependensi berarti mengubah package.json, yang memicu build native
// (NATIVE_PATHS di scripts/native-state.js).
const NODE_ONLY_GLOBALS = {
  __dirname: 'readonly',
  __filename: 'readonly',
  Buffer: 'readonly',
};

module.exports = defineConfig([
  // Global ignores - must be separate config object
  {
    ignores: [
      'dist/**',
      '__mocks__/**',
      '.expo/**',
      '__tests__/**',
      'jest.setup.js',
      'node_modules/**',
      'FORM_COMPONENTS_EXAMPLES.tsx',
    ],
  },
  expoConfig,
  {
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
      },
    },
  },
  {
    files: ['scripts/**/*.js', 'plugins/**/*.js'],
    languageOptions: { globals: NODE_ONLY_GLOBALS },
  },
]);

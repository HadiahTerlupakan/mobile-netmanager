// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

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
]);

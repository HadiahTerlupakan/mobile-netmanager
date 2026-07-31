// Bypass expo globals before any imports
const originalGlobal = global;
if (!originalGlobal.__ExpoModulesProxy) {
  originalGlobal.__ExpoModulesProxy = {};
}
if (!originalGlobal.__ExpoImportMetaRegistry) {
  originalGlobal.__ExpoImportMetaRegistry = {};
}

module.exports = {
  preset: "react-native",
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testMatch: ["**/__tests__/**/*.test.ts?(x)"],
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": "babel-jest",
  },
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|twrnc|lucide-react-native|axios|p-limit|yocto-queue)",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^expo-sqlite$": "<rootDir>/__mocks__/expo-sqlite.js",
    "^expo-secure-store$": "<rootDir>/__mocks__/expo-secure-store.js",
    "^@react-native-community/netinfo$":
      "<rootDir>/__mocks__/@react-native-community/netinfo.js",
    "^expo-location$": "<rootDir>/__mocks__/expo-location.js",
    "^expo$": "<rootDir>/__mocks__/expo.js",
    "^expo-crypto$": "<rootDir>/__mocks__/expo-crypto.js",
    "^expo-battery$": "<rootDir>/__mocks__/expo-battery.js",
    "^expo-task-manager$": "<rootDir>/__mocks__/expo-task-manager.js",
    "^@notifee/react-native$": "<rootDir>/__mocks__/@notifee/react-native.js",
    "^@/utils/logger$": "<rootDir>/__mocks__/logger.js",
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  collectCoverageFrom: [
    "services/**/*.ts",
    "hooks/**/*.ts",
    "context/**/*.tsx",
    "!**/node_modules/**",
  ],
  resetMocks: false,
  clearMocks: true,
};

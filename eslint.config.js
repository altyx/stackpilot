const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier/flat');
const globals = require('globals');
const tseslint = require('typescript-eslint');

module.exports = defineConfig([
  expoConfig,
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [tseslint.configs.recommendedTypeCheckedOnly],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: __dirname },
    },
    rules: {
      // Props typed `() => void` (onPress, onRefresh…) routinely receive async
      // handlers; that's fine on the UI side, so only argument/return positions
      // stay checked.
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', '__tests__/**', 'src/testing/**', 'jest.setup.ts'],
    languageOptions: { globals: globals.jest },
  },
  {
    // Runs under Node, not in the app bundle: build scripts, config plugins,
    // the companion watcher service and the tooling config files themselves.
    files: [
      'scripts/**',
      'plugins/**',
      'watcher/**',
      '*.config.js',
      'jest.globalSetup.js',
      'app.config.ts',
    ],
    languageOptions: { globals: globals.node },
    rules: {
      'expo/no-dynamic-env-var': 'off',
      'expo/no-env-var-destructuring': 'off',
    },
  },
  // Last on purpose: turns off every rule Prettier already enforces.
  prettierConfig,
  {
    ignores: [
      'node_modules/',
      'ios/',
      'android/',
      '.expo/',
      'dist/',
      'build/',
      'coverage/',
      'expo-env.d.ts',
    ],
  },
]);

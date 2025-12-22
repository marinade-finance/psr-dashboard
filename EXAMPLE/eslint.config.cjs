const createSharedConfig = require('@marinade.finance/eslint-config')

const sharedConfig = createSharedConfig({})

module.exports = [
  ...sharedConfig,
  {
    files: ['**/*.css.d.ts'],
    rules: {
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-extra-semi': 'off',
      semi: 'off',
      'no-extra-semi': 'off',
    },
  },
  {
    rules: {
      'no-console': 'off',
      // using relative imports is just fine
      'no-relative-import-paths/no-relative-import-paths': 'off',
      'import/no-relative-parent-imports': 'off',
    },
  },
]

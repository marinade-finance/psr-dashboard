const createSharedConfig = require('@marinade.finance/eslint-config')

const sharedConfig = createSharedConfig({})

module.exports = [
  { ignores: ['src/schemas/generated/**'] },
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
      complexity: ['warn', { max: 64 }],
      'no-console': 'off',
      // using relative imports is just fine
      'no-relative-import-paths/no-relative-import-paths': 'off',
      'import/no-relative-parent-imports': 'off',
      // eslint-plugin-import@2.x uses sourceCode.getTokenOrCommentAfter which
      // was removed in ESLint 10. Disable newline enforcement until the shared
      // config bumps to eslint-plugin-import-x (ESLint-10-compatible fork).
      'import/order': 'off',
    },
  },
]

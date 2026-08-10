import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '.auth/**',
      '.worktrees/**',
      'allure-report/**',
      'allure-results/**',
      'blob-report/**',
      'coverage/**',
      'node_modules/**',
      'playwright-report/**',
      'temp/**',
      'test-results/**',
      'tmp/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/no-extraneous-class': 'off',
    },
  },
  {
    files: ['tests/**/*.ts', 'workflows/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'CallExpression[callee.property.name=/^(locator|getByRole|getByText|getByLabel|getByPlaceholder|getByTestId)$/]',
          message: 'Locators belong in Page Objects or Page components.',
        },
      ],
    },
  },
  {
    files: ['fixtures/**/*.ts'],
    rules: {
      'no-empty-pattern': 'off',
    },
  },
  {
    files: ['**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
  },
);

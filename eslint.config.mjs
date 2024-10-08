// @ts-check

import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['**/dist/**']
  },
  {
    files: ['src/**/*.ts']
  },
  {
    plugins: {
      '@typescript-eslint': tseslint.plugin
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: {
          allowDefaultProject: ['eslint.config.mjs'],
          loadTypeScriptPlugins: true
        },
        tsconfigRootDir: '.'
      }
    },
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/require-await': 'error',
      'no-return-await': 'error'
    }
  }
)

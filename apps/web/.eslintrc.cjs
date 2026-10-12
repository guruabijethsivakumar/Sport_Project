module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['@typescript-eslint', 'tailwindcss', 'react'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  },
  overrides: [
    {
      files: ['src/pages/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
      rules: {
        'tailwindcss/no-custom-classname': 'error',
        'tailwindcss/no-arbitrary-value': 'warn',
      },
    },
    {
      files: ['src/pages/**/*.{ts,tsx}'],
      rules: {
        'react/jsx-no-literals': 'off',
      },
    },
  ],
  settings: {
    tailwindcss: {
      callees: ['classnames', 'clsx', 'ctl', 'cn'],
      config: './tailwind.config.ts',
    },
    react: {
      version: 'detect',
    },
  },
  ignorePatterns: ['dist/', 'node_modules/'],
};

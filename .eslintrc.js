'use strict';

module.exports = {
  ignorePatterns: 'webpack.config.js',
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  extends: ['plugin:@typescript-eslint/recommended', 'prettier', 'prettier/@typescript-eslint'],
  plugins: ['@typescript-eslint', 'prettier'],
  rules: {
    'prettier/prettier': 1,
    'sort-keys': 0,
    '@typescript-eslint/indent': 0,
    '@typescript-eslint/member-ordering': [
      0,
      {
        default: [
          'public-static-field',
          'protected-static-field',
          'private-static-field',
          'public-instance-field',
          'protected-instance-field',
          'private-instance-field',
          'public-constructor',
          'protected-constructor',
          'private-constructor',
          'private-instance-method',
          'protected-instance-method',
          'public-instance-method',
          'public-static-method',
          'protected-static-method',
          'private-static-method',
        ],
      },
    ],
    '@typescript-eslint/no-parameter-properties': 0,
    '@typescript-eslint/no-unused-vars': 0,
  },
  env: {
    browser: true,
    node: true,
  },
};

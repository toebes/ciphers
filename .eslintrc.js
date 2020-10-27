module.exports = {
    parserOptions: {
        ecmaVersion: 6,
        sourceType: 'module',
        ecmaFeatures: {
            jsx: true,
        },
    },
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
    extends: [
        'prettier/@typescript-eslint',
        'plugin:prettier/recommended',
        'plugin:@typescript-eslint/recommended',
    ],
    rules: {
        'no-underscore-dangle': 'error',
    },
};

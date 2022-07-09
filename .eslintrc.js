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
    extends: ['plugin:prettier/recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
    rules: {
        'no-underscore-dangle': 'error',
        camelcase: 'off',
        '@typescript-eslint/camelcase': 'off',
        'class-name-casing': 'off',
        '@typescript-eslint/class-name-casing': 'off',
        '@typescript-eslint/no-empty-function': 'off',
        '@typescript-eslint/interface-name-prefix': 'off',
        '@typescript-eslint/no-unused-vars': ['error', { args: 'none' }],
        '@typescript-eslint/no-explicit-any': 'off',
    },
};

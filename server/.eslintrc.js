module.exports = {
    env: {
        node: true,
        es2021: true,
        jest: true
    },
    extends: [
        'eslint:recommended',
        'prettier'
    ],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
    },
    rules: {
        // Error Prevention
        'no-console': ['warn', { allow: ['warn', 'error'] }],
        'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        'no-undef': 'error',

        // Best Practices
        'eqeqeq': ['error', 'always'],
        'curly': ['error', 'all'],
        'no-eval': 'error',
        'no-implied-eval': 'error',
        'no-with': 'error',
        'no-loop-func': 'error',
        'no-new-func': 'error',

        // Code Style
        'indent': ['error', 4],
        'quotes': ['error', 'single', { avoidEscape: true }],
        'semi': ['error', 'always'],
        'comma-dangle': ['error', 'never'],
        'no-trailing-spaces': 'error',
        'eol-last': ['error', 'always'],

        // ES6+
        'prefer-const': 'error',
        'no-var': 'error',
        'prefer-arrow-callback': 'error',
        'prefer-template': 'error',
        'arrow-spacing': 'error',

        // Async
        'no-async-promise-executor': 'error',
        'require-await': 'warn',

        // Security
        'no-eval': 'error',
        'no-new-func': 'error'
    }
};

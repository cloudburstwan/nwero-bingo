import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';
import { defineConfig } from 'eslint/config';

/** @type {import('@typescript-eslint/utils').TSESLint.Config[]} */
const config = defineConfig(
    eslint.configs.recommended,
    tseslint.configs.recommendedTypeChecked,
    {
        plugins: {
            '@stylistic': stylistic,
        },
        files: ['**/*.ts'],
        rules: {
            '@stylistic/max-len': ['warn', {
                code: 140,
                ignoreStrings: true,
                ignoreTemplateLiterals: true,
                ignoreRegExpLiterals: true
            }],
            '@stylistic/arrow-parens': ['error', 'as-needed'],
            '@stylistic/eol-last': ['error', 'always'],
            '@stylistic/indent': ['error', 4, { SwitchCase: 1 }],
            '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
            '@stylistic/comma-dangle': ['error', 'always-multiline'],
            '@stylistic/member-delimiter-style': ['error'],
            '@stylistic/object-curly-spacing': ['error', 'always'],
            '@stylistic/semi': ['error', 'always'],
            '@stylistic/function-call-argument-newline': ['error', 'consistent'],
            '@stylistic/function-paren-newline': 'off',
        },
    },
);

export default config;

// Hàng rào lint cho backend. Chỉ nhóm luật bắt bug thật, cần thông tin kiểu từ tsconfig.json.
// Nợ cũ nằm trong eslint-suppressions.json (do `eslint --suppress-all` sinh ra) — đừng sửa tay.
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  { ignores: ['node_modules/', 'coverage/'] },
  {
    files: ['**/*.js', '**/*.mjs'],
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: globals.node,
      // Bắt buộc cho tệp .js: thiếu dòng này thì luật cần kiểu làm ESLint dừng hẳn.
      parser: tseslint.parser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { '@typescript-eslint': tseslint.plugin },
    rules: {
      ...js.configs.recommended.rules,
      // Lỗi bất đồng bộ: promise bị bỏ quên trong handler Express / truy vấn pg.
      '@typescript-eslint/no-floating-promises': [
        'error',
        { allowForKnownSafeCalls: [{ from: 'package', package: 'node:test', name: ['test', 'it', 'describe', 'suite'] }] },
      ],
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/require-await': 'error',
      // Chỉ ném Error, và ném lại thì giữ lỗi gốc của pg/jwt.
      '@typescript-eslint/only-throw-error': 'error',
      'preserve-caught-error': 'error',
      // `== null` là idiom cố ý trong repo này (bắt cả null lẫn undefined) nên được tha.
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'prefer-const': 'error',
      'no-unused-vars': ['error', { args: 'after-used', caughtErrors: 'all', ignoreRestSiblings: true }],
    },
  },
  { files: ['**/*.mjs'], languageOptions: { sourceType: 'module' } },
  // Repository giả trong test khai async cho đúng giao diện thật, không có await bên trong.
  { files: ['tests/**/*.js'], rules: { '@typescript-eslint/require-await': 'off' } },
];

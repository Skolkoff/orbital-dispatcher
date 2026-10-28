import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default [
  { ignores: ['dist/**', 'server/vendor/**', 'server/public/app/**', 'node_modules/**', 'stitch_web_app/**', 'docs/superpowers/**', '.superpowers/**', 'playwright-report/**', 'test-results/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
]

import { defineConfig } from '@witheslint/core'

export default defineConfig({
  ignores: [
    'api/src/protobufs/*',
  ],
  extends: [
    {
      rules: {
        'no-console': 'off',
        'unicorn/no-null': 'off',
      },
    },
  ],
})

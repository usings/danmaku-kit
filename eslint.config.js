import { defineConfig } from '@witheslint/core'

export default defineConfig({
  extends: [
    {
      rules: {
        'no-console': 'off',
        'unicorn/no-null': 'off',
      },
    },
    {
      files: ['api/src/protobufs/**/*'],
      rules: {
        'unicorn/filename-case': 'off',
      },
    },
  ],
})

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    snapshotSerializers: ['./tests/astro-error-serializer.ts'],
  },
})

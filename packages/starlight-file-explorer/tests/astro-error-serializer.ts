import { AstroError } from 'astro/errors'
import type { SnapshotSerializer } from 'vitest'

export default {
  serialize: ({ hint, message }: AstroError) => (hint ? `${message}\n\n---\n\n${hint}` : message),
  test: (val) => val instanceof AstroError,
} satisfies SnapshotSerializer

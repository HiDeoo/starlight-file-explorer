import { defineConfig } from 'tsdown'

export default defineConfig({
  copy: ['src/index.ts', { from: 'src/**/*.astro', flatten: false }],
  dts: true,
  entry: [
    'src/**/*.ts',
    // https://github.com/withastro/starlight/blob/5a50fd103d4faf1d00592aa520b12e855fe940d7/packages/starlight/tsdown.config.ts#L13-L15
    '!src/index.ts',
  ],
  fixedExtension: false,
  publint: { strict: true },
  root: 'src',
  unbundle: true,
})

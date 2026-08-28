import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node20',
  clean: true,
  dts: false,
  sourcemap: false,
  minify: false,
  banner: { js: '#!/usr/bin/env node' },
});

import { defineConfig } from 'vite';

const artifact = process.env.VITE_TARGET === 'artifact';

export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    outDir: artifact ? 'dist-artifact' : 'dist',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1500,
    rollupOptions: artifact ? { output: { inlineDynamicImports: true } } : undefined,
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
} as any);

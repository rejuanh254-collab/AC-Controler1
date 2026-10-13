import esbuild from 'esbuild';

console.log('[BUILD-API] Bundling src/api/index.ts -> api/index.js with ESM require banner...');

esbuild.buildSync({
  entryPoints: ['src/api/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  banner: {
    js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`,
  },
  outfile: 'api/index.js',
});

console.log('[BUILD-API] Successfully generated api/index.js!');

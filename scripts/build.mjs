import { mkdir, copyFile } from 'node:fs/promises';
import { build } from 'esbuild';

// Keep the root files usable on GitHub Pages and publish only these files on Vercel.
await build({
  entryPoints: ['src/app.js'],
  bundle: true,
  minify: true,
  format: 'esm',
  target: 'es2020',
  outfile: 'app.js',
});

await mkdir('public', { recursive: true });
await Promise.all([
  copyFile('index.html', 'public/index.html'),
  copyFile('app.js', 'public/app.js'),
  copyFile('manifest.webmanifest', 'public/manifest.webmanifest'),
  copyFile('sw.js', 'public/sw.js'),
  ...[180, 192, 512].map(size => copyFile(`icon-${size}.png`, `public/icon-${size}.png`)),
]);

import { build } from 'esbuild';
import { execSync } from 'child_process';
import path from 'path';

const root = process.cwd();

console.log('Building client...');
execSync('npx vite build', { stdio: 'inherit', cwd: root });

console.log('Building server...');
await build({
  entryPoints: [path.join(root, 'server/index.ts')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: path.join(root, 'dist/server/index.js'),
  packages: 'external',
  define: {
    'import.meta.url': '"file:///placeholder"',
  },
});

console.log('Build complete.');

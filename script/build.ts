import { build } from 'esbuild';
import { execSync } from 'child_process';
import path from 'path';

async function main() {
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
}

main().catch((err) => { console.error(err); process.exit(1); });

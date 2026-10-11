import { cp, mkdir, access } from 'node:fs/promises';

try {
  await access(new URL('../src/index.html', import.meta.url));
} catch {
  throw new Error('Missing website entry point: src/index.html.');
}
await mkdir(new URL('../dist/', import.meta.url), { recursive: true });
await cp(new URL('../src/', import.meta.url), new URL('../dist/', import.meta.url), { recursive: true });
console.log('HD Toolkit built to dist/');

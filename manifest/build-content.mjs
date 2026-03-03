#!/usr/bin/env node
import * as esbuild from 'esbuild';
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = join(__dirname, 'dist', 'content.js');
mkdirSync(dirname(out), { recursive: true });

await esbuild.build({
  entryPoints: [join(__dirname, 'content.ts')],
  bundle: true,
  format: 'iife',
  outfile: out,
  target: 'es2020',
  logLevel: 'info',
});

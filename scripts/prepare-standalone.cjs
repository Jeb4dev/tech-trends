#!/usr/bin/env node
/*
Copy required static assets into the standalone dir so that
node .next/standalone/server.js can serve them without 404s.
- .next/static -> .next/standalone/.next/static
- public        -> .next/standalone/public
*/
const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else if (entry.isFile()) {
      fs.copyFileSync(s, d);
    }
  }
}

const projectRoot = process.cwd();
const standaloneRoot = path.join(projectRoot, '.next', 'standalone');
const nextStaticSrc = path.join(projectRoot, '.next', 'static');
const nextStaticDest = path.join(standaloneRoot, '.next', 'static');
const publicSrc = path.join(projectRoot, 'public');
const publicDest = path.join(standaloneRoot, 'public');

try {
  copyDir(nextStaticSrc, nextStaticDest);
  copyDir(publicSrc, publicDest);
  console.log('[postbuild] Copied static assets to standalone directory.');
} catch (e) {
  console.error('[postbuild] Failed to prepare standalone assets:', e);
  process.exit(1);
}


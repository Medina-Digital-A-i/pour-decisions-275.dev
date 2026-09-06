#!/usr/bin/env node
// Copies the deployable site into dist/ (Netlify publishes dist/). Anything not needed by
// browsers stays out: node_modules, functions source, scripts, archive, dev scratch.
const fs = require('fs'), path = require('path');
const SKIP = new Set(['node_modules', 'netlify', 'scripts', 'dist', '.git', '.github', '.claude', '.handoff', '.netlify', 'archive', 'Claude outputs', 'package.json', 'package-lock.json', 'netlify.toml', '.gitignore', '.DS_Store', 'index.html.bak']);
const root = process.cwd(), out = path.join(root, 'dist');
fs.rmSync(out, { recursive: true, force: true });
let n = 0;
(function copy(src, dst) {
  for (const name of fs.readdirSync(src)) {
    if (SKIP.has(name)) continue;
    const s = path.join(src, name), d = path.join(dst, name);
    const st = fs.statSync(s);
    if (st.isDirectory()) { fs.mkdirSync(d, { recursive: true }); copy(s, d); }
    else { fs.mkdirSync(path.dirname(d), { recursive: true }); fs.copyFileSync(s, d); n++; }
  }
})(root, out);
for (const must of ['index.html', 'menu.json', 'sw.js']) if (!fs.existsSync(path.join(out, must))) { console.error('✖ dist/ missing ' + must); process.exit(1); }
console.log(`✔ dist/ built — ${n} files${fs.existsSync(path.join(out, '_redirects')) ? ' (with _redirects)' : ''}`);

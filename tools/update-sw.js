// Ponovno napravi sw.js s popisom svih datoteka za igranje bez interneta.
// Pokreni nakon dodavanja ili mijenjanja igre:  node tools/update-sw.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const SKIP = new Set(['.git', 'tools', 'node_modules', '.vercel', '.claude', 'HANDOVER.md', '.vercelignore']);
const EXT = /\.(html|js|css|svg|png|jpg|jpeg|webp|json|webmanifest|mp3|ogg|wav|woff2?)$/i;

const files = [];
(function walk(dir) {
  for (const name of fs.readdirSync(dir).sort()) {
    if (SKIP.has(name) || name === 'sw.js') continue;
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (EXT.test(name)) files.push(path.relative(root, full).split(path.sep).join('/'));
  }
})(root);

// Stranice se otvaraju kao mape ("games/memorija/"), pa spremamo i taj oblik adrese.
const urls = files.map((f) => (f === 'index.html' ? './' : f.endsWith('/index.html') ? './' + f.slice(0, -'index.html'.length) : './' + f));

const hash = crypto.createHash('sha1');
for (const f of files) hash.update(f).update(fs.readFileSync(path.join(root, f)));
const version = hash.digest('hex').slice(0, 10);

const template = fs.readFileSync(path.join(__dirname, 'sw.template.js'), 'utf8');
const out = template.replace('__VERSION__', version).replace('__FILES__', JSON.stringify(urls, null, 2));
fs.writeFileSync(path.join(root, 'sw.js'), out);
console.log(`sw.js: ${urls.length} datoteka, verzija ${version}`);

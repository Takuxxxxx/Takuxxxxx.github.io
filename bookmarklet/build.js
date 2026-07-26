const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, 'bookmarklet.js'), 'utf8');

// remove comments (only full-line comments starting with //, not inside strings)
let code = src.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

// trim lines and join
code = code.split('\n').map(l => l.trim()).filter(Boolean).join('');

// wrap in IIFE - source already has (async function(){...})()
// encode for bookmarklet: preserve most chars, encode only what's needed
// Use encodeURI which keeps : / ? # @ etc.
let encoded = encodeURI(code);
// encodeURI doesn't encode single quotes but bookmarklets need them escaped sometimes
// also encode % for safety

const bookmarklet = 'javascript:' + encoded;

// output the HTML snippet
const html = `<a href="${bookmarklet}" class="bookmarklet-link">⭐ Portfolioに追加</a>`;

fs.writeFileSync(path.join(__dirname, 'bookmarklet-link.html'), html, 'utf8');
console.log('Generated bookmarklet-link.html');
console.log('Length:', bookmarklet.length);

const fs=require('fs');
const p='rings.js';
let s=fs.readFileSync(p,'utf8');
s=s.replace("{ t: 'l', len: 2 * iz, p0: [ix, iz], d: [0, -1] },", "{ t: 'l', len: 2 * iz, p0: [hx, iz], d: [0, -1] },");
s=s.replace("{ t: 'l', len: 2 * ix, p0: [ix, -iz], d: [-1, 0] },", "{ t: 'l', len: 2 * ix, p0: [ix, -hz], d: [-1, 0] },");
s=s.replace("{ t: 'l', len: 2 * iz, p0: [-ix, -iz], d: [0, 1] },", "{ t: 'l', len: 2 * iz, p0: [-hx, -iz], d: [0, 1] },");
fs.writeFileSync(p,s,'utf8');
console.log('ok');

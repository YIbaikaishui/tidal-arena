const fs = require('fs');
const lines = fs.readFileSync('_a.js', 'utf8').split('\n');
function scan(s) {
  let open = 0, inq = null, esc = false, tpl = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (inq) { if (ch === inq) inq = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { inq = ch; continue; }
    if ('{(['.includes(ch)) open++;
    else if ('})]'.includes(ch)) open--;
  }
  return { open, inq };
}
for (let n = 1; n <= lines.length; n++) {
  const r = scan(lines.slice(0, n).join('\n'));
  if (r.inq) { console.log('unterminated quote at line', n, ':', lines[n-1].trim()); break; }
}
console.log('scan done, lines', lines.length);

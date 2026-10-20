const fs = require('fs');
const p = 'src/lib/seats.js';
let s = fs.readFileSync(p, 'utf8');
const a = s.indexOf('export function seatColor');
const b = s.indexOf('\n}', a) + 2;
const nowy = `export function seatColor(tierIdx, row, zone, i, perZone) {
  const pal = PALETTE[tierIdx] || PALETTE[0];
  const base = pal[(zone + row) % pal.length];
  const band = (row % 9 === 0);                                   // 每 9 排一道强调带
  const ember = (((zone * 5 + Math.floor(i / Math.max(1, Math.floor(perZone / 2)))) % 17 === 0));
  if (band && (zone % 3 !== 0)) return ACCENT[(zone + tierIdx) % ACCENT.length];
  if (ember) return ACCENT[(zone + 3) % ACCENT.length];
  return base;
}
`;
s = s.slice(0, a) + nowy + s.slice(b);
fs.writeFileSync(p, s, 'utf8');
console.log('accent ratio lowered');

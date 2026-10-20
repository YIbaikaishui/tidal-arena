import { buildSection, END0, SIDE0 } from '../src/lib/sections.js';
import { RING, makePath } from '../src/lib/build.js';

const s = buildSection();
const inner = RING.path(END0, 0);
const eave = makePath(RING.eaveL, RING.eaveL * RING.wRatio, RING.eaveL * 0.42);
console.log('inner   L', inner.L, 'W', inner.W.toFixed(2), 'r', inner.r.toFixed(2), 'total', inner.total.toFixed(1));
console.log('eave    L', eave.L.toFixed(1), 'W', eave.W.toFixed(1), 'r', eave.r.toFixed(1), 'total', eave.total.toFixed(1));
console.log('ratio eave/inner', (eave.total / inner.total).toFixed(3));
for (const off of [3.1, 5.1]) { const p = RING.path(END0, off); console.log('offset', off, 'L', p.L.toFixed(1), 'W', p.W.toFixed(1)); }
// 检查路径在 x=0 处 z 是否为 W（中点），以及四角是否连续
const pts = inner.pts;
console.log('pts', pts.length);
const a = inner.sample(0); console.log('u=0', a.x.toFixed(2), a.z.toFixed(2), 'n', a.nx.toFixed(2), a.nz.toFixed(2));
const b = inner.sample(0.25); console.log('u=.25', b.x.toFixed(2), b.z.toFixed(2), 'n', b.nx.toFixed(2), b.nz.toFixed(2));
const c = inner.sample(0.5); console.log('u=.5', c.x.toFixed(2), c.z.toFixed(2));
const d = inner.sample(0.75); console.log('u=.75', d.x.toFixed(2), d.z.toFixed(2));
// 周长一致性
console.log('inner perim vs rect', (2 * (2 * inner.L + 2 * inner.W)).toFixed(1));


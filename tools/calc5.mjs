import('./../src/lib/rings.js').then(async R=>{
  const ring = R.refRing(192);
  console.log('counts', ring.counts, 'total', ring.total.toFixed(2));
  for (const i of [0, 20, 40, 50, 96, 191]) { const p = ring.pts[i]; console.log(i, p.x.toFixed(2), p.z.toFixed(2), p.nx.toFixed(2), p.nz.toFixed(2)); }
}).catch(e=>console.error(e));

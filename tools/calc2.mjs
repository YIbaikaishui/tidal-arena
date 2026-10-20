import('./../src/lib/rings.js').then(async R=>{
  const ring = R.refRing(192);
  let mn=1e9,mx=0; for(let i=1;i<ring.pts.length;i++){ const a=ring.pts[i-1], b=ring.pts[i]; const d=Math.hypot(a.x-b.x,a.z-b.z); mn=Math.min(mn,d); mx=Math.max(mx,d); }
  console.log('segs', ring.pts.length, 'total', ring.total.toFixed(1), 'spacing', mn.toFixed(2), mx.toFixed(2));
  for (const i of [0, 2, 10, 30, 48, 96]) {
    const p = R.pt(i, 111.6, 0);
    console.log('i',i,'s111.6 ->', p.x.toFixed(1), p.z.toFixed(1));
  }
  const g = R.sweepRing([{s:3,y:50},{s:100,y:60},{s:99.5,y:59.5},{s:3.5,y:49.5}], {segs:192});
  console.log('sweep verts', g.attributes.position.count, 'tris', g.index.count/3);
}).catch(e=>console.error(e));

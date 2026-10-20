import('./../src/lib/rings.js').then(async R=>{
  const ring = R.refRing(192);
  // 打印几个段与弦长
  for (const i of [0, 24, 30, 48, 96, 144]) {
    const p = ring.pts[i], q = ring.pts[(i+1)%192];
    console.log('i', i, 'p', p.x.toFixed(1), p.z.toFixed(1), 'q', q.x.toFixed(1), q.z.toFixed(1), 'chord', Math.hypot(p.x-q.x,p.z-q.z).toFixed(2));
  }
}).catch(e=>console.error(e));

import('./../src/lib/sections.js').then(S=>{
  console.log('BACK_S', S.BACK_S.toFixed(2), 'BACK_Y', S.BACK_Y.toFixed(2), 'C3_Y', S.C3_Y.toFixed(2));
  S.TIERS.forEach(t=>console.log(t.id, 'rows', t.n, 's', t.s0.toFixed(1),'->',t.endS.toFixed(1), 'y', t.y0.toFixed(2),'->',t.endY.toFixed(2), 'cS1', t.cS1.toFixed(1)));
  // 用与搜索一致的公式统计
  const HX=34, HZ=52.5, AISLE=1.2, PITCH=0.52, Z=20;
  const perim=(hx,hz)=>{const r=hx*0.36; return 4*(hx-r)+4*(hz-r)+2*Math.PI*r;};
  let total=0;
  for (const t of S.TIERS) { let n=0; for (const r of t.rows) { const p=perim(HX+r.sFront+0.4, HZ+r.sFront+0.4); n += Math.floor((p/Z-AISLE)/PITCH)*Z; } console.log(t.id, n); total+=n; }
  console.log('TOTAL', total);
}).catch(e=>console.error(e));

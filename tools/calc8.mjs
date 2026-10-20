import('./../src/lib/rings.js').then(R=>{
  const ring=R.refRing(192);
  let mx=0,mn=1e9; for(let i=0;i<192;i++){const a=ring.pts[i],b=ring.pts[(i+1)%192];const d=Math.hypot(a.x-b.x,a.z-b.z);mx=Math.max(mx,d);mn=Math.min(mn,d);}
  console.log('ring segs',ring.pts.length,'total',ring.total.toFixed(1),'chord',mn.toFixed(2),mx.toFixed(2));
  // 带封口的弧段扫掠
  const g=R.sweepRing([{s:10,y:1},{s:10,y:14},{s:9,y:14},{s:9,y:1}],{uRange:[0.05,0.12],capEnds:true});
  console.log('capped arc verts',g.attributes.position.count,'tris',g.index.count/3,'hasNaN',Array.from(g.attributes.position.array).some(Number.isNaN));
  const g2=R.sweepRing([{s:10,y:1},{s:10,y:14},{s:9,y:14},{s:9,y:1}],{});
  console.log('full ring tris',g2.index.count/3);
}).catch(e=>console.error(e));

import('./../src/lib/rings.js').then(async R=>{
  const ring = R.refRing(192);
  let worst=[]; for(let i=0;i<192;i++){ const a=ring.pts[i], b=ring.pts[(i+1)%192]; const d=Math.hypot(a.x-b.x,a.z-b.z); worst.push([i,d,a.x,a.z,b.x,b.z]); }
  worst.sort((a,b)=>b[1]-a[1]); console.log(worst.slice(0,6).map(w=>w.map(n=>typeof n==='number'?+n.toFixed(2):n)));
  const n=384; const r2=R.refRing(n); let mx=0; for(let i=0;i<n;i++){ const a=r2.pts[i], b=r2.pts[(i+1)%n]; mx=Math.max(mx,Math.hypot(a.x-b.x,a.z-b.z)); } console.log('n=384 max chord', mx.toFixed(2), 'min', Math.min(...Array.from({length:n},(_,i)=>{const a=r2.pts[i],b=r2.pts[(i+1)%n];return Math.hypot(a.x-b.x,a.z-b.z);})).toFixed(2));
}).catch(e=>console.error(e));

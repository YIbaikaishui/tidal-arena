import('./../src/lib/sections.js').then(async S=>{
  const { seatModel } = await import('./../src/lib/seats.js');
  const m = seatModel();
  console.log('tiers end:', S.LAYOUT.tiers.map(t=>t.def.id+' endS='+t.endS.toFixed(1)+' endY='+t.endY.toFixed(1)));
  console.log('sum', m.total, m.tiers.map(t=>t.id+':'+t.total));
  const last = S.LAYOUT.tiers[2];
  console.log('last row s', last.rows[20].sFront.toFixed(1));
}).catch(e=>console.error(e));

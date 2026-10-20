import('./../src/lib/seats.js').then(S=>{
  const m=S.MODEL;
  console.log('total', m.total, 'rows', m.rows, 'zones', m.zones.length);
  console.log('per tier', m.tiers.map(t=>t.id+':'+t.total));
  console.log('zone sample', m.zones.slice(0,3).map(z=>z.id+':'+z.seats));
  let cnt=0; for (const x of S.seatInstances(m)) cnt++;
  console.log('instances', cnt);
}).catch(e=>console.error(e));

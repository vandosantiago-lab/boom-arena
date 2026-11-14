import fs from 'fs';
const src = fs.readFileSync(new URL('../src/01-core.js', import.meta.url), 'utf8') + '\n' + fs.readFileSync(new URL('../src/02-sim.js', import.meta.url), 'utf8');
const stub = `const document={getElementById(){return null}};\n`;
const tail = `
function run(diff, mapChoice){
  for(const s of V.slots){s.k='b';s.peer=null;s.ch=s.i;s.nm='B'+s.i;}
  simSetupMatch(mapChoice,diff);
  let t=0, rounds=0, lastRnd=0, bombs=0, seenIds=new Set(), wins=[0,0,0,0], draws=0, maxT=0, roundStart=0, selfKillEarly=0;
  const dt=1/60;
  while(V.ph!=='mend' && t<60*60){
    simTick(dt); t+=dt;
    for(const b of V.bombs) if(!seenIds.has(b.id)){seenIds.add(b.id);bombs++;}
    for(const s of V.slots){ if(!(s.x>=0&&s.x<=GW-1&&s.y>=0&&s.y<=GH-1)) throw new Error('oob '+s.x+','+s.y); if(s.al && Math.abs(s.x-Math.round(s.x))>1e-3 && Math.abs(s.y-Math.round(s.y))>1e-3) throw new Error('off-lane '+s.x+','+s.y);
      if(s.al){const c=idx(Math.round(s.x),Math.round(s.y)); if(V.grid[c]===PILLAR||V.grid[c]===BLOCK) throw new Error('inside wall '+s.x+','+s.y+' g='+V.grid[c]);} }
    if(V.rnd!==lastRnd){lastRnd=V.rnd;rounds++;roundStart=t;}
    if(V.ph==='rend' && !V._c){V._c=1; if(V.win>=0)wins[V.win]++; else draws++; maxT=Math.max(maxT,ROUND_T-V.t);} if(V.ph!=='rend')V._c=0;
  }
  return {diff,mapChoice,ph:V.ph,simSec:Math.round(t),rounds,bombs,wins,draws,mwin:V.mwin,longestRound:Math.round(maxT)};
}
const out=[]; for(let d=0;d<3;d++) for(let m=-1;m<4;m++){ out.push(run(d,m)); }
console.log(out.map(o=>JSON.stringify(o)).join('\\n'));
`;
fs.writeFileSync(new URL('./_sim.mjs', import.meta.url), stub + src + tail);

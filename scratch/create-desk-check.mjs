import fs from 'node:fs';
let p='apps/web/src/office/game/deskClaims.ts',s=fs.readFileSync(p,'utf8').replace('PRIVATE_OFFICES.map((r, i) =>','PRIVATE_OFFICES.map((r, i): DeskDef =>').replace(/^\s*store\.toast\([^\n]+\n/gm,'');fs.writeFileSync(p,s);
s=fs.readFileSync('scripts/check-map.mjs','utf8');s=s.slice(0,s.indexOf('const map = await import'));s+=`
const memory=new Map();globalThis.window={};globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};
const desks=await import(moduleUrl(new URL('apps/web/src/office/game/deskClaims.ts',root)));
const map=await import(moduleUrl(new URL('apps/web/src/office/game/map.ts',root)));
assert.equal(desks.OFFICE_DESKS.length,10);
for(const desk of desks.OFFICE_DESKS){assert.equal(map.objects[desk.chairTile[1]][desk.chairTile[0]],'officeChairUp');assert(map.findPath(map.SPAWN.x,map.SPAWN.y,...desk.chairTile));for(const [x,y] of desk.deskTiles)assert.equal(map.objects[y][x],'workDesk')}
const [a,b,c]=desks.OFFICE_DESKS.map(d=>d.id),user={id:'test-player',name:'OVN'};
assert(desks.claimDesk(a,user));assert.equal(desks.getDeskClaim(a).userName,'OVN');
assert(desks.claimDesk(b,user));assert.equal(desks.getDeskClaim(a),null);
assert.equal(desks.claimDesk(b,{id:'other',name:'Other'}),false);assert.equal(desks.getDeskClaim(b).userId,user.id);
assert.equal(desks.claimDesk('missing',user),false);
assert(desks.claimDesk(c,{id:'other',name:'Other'}));assert.equal(desks.claimDesk(c,user),false);assert(desks.getDeskClaim(b));
desks.unclaimDesk(b);assert.equal(desks.getDeskClaim(b),null);
assert(memory.get('oppera_claimed_desks').includes('Other'));
console.log('Desk checks passed: 10 reachable desks; claim, move, persistence, release and occupied-desk protection.');
`;fs.writeFileSync('scripts/check-desks.mjs',s);

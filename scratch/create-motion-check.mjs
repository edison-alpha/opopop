import fs from 'node:fs';
let s=fs.readFileSync('scripts/check-map.mjs','utf8');s=s.slice(0,s.indexOf('const map = await import'));
s=s.replace('  const result = `data:text/javascript;', '  outputText=outputText.replace(/from "react"/g, `from "data:text/javascript,export const useSyncExternalStore=()=>{}"`);\n  const result = `data:text/javascript;');
s+=`
const {store,STEP_MS}=await import(moduleUrl(new URL('apps/web/src/office/store.ts',root)));
const {positionAt}=await import(moduleUrl(new URL('apps/web/src/office/game/motion.ts',root)));
const registry=await import(moduleUrl(new URL('apps/web/src/office/game/overlayPositions.ts',root)));
const {doorFrame}=await import(moduleUrl(new URL('apps/web/src/office/game/doorGeometry.ts',root)));
const map=await import(moduleUrl(new URL('apps/web/src/office/game/map.ts',root)));
const {COURTYARD,LAYOUT_DOORS}=await import(moduleUrl(new URL('apps/web/src/office/game/layout.ts',root)));
const a=store.upsert({id:'test',x:0,y:0,dir:'right'});
store.stepTo(a,1,0,'right',1000);a.rx=0.65;
store.stepTo(a,2,0,'right',1000+STEP_MS+4);
assert.equal(a.fromX,1,'Next step must start at the completed position, not stale rendered rx');
assert.equal(positionAt(a,1000+STEP_MS+4+STEP_MS/2,STEP_MS).x,1.5);
const started=a.stepStart;store.stepTo(a,2,0,'up',started+20);assert.equal(a.stepStart,started,'Repeated target/direction updates must not restart animation');
for(let i=3;i<80;i++){store.stepTo(a,i,0,'right',1000+(i-1)*(STEP_MS+4));assert.equal(a.fromX,i-1)}
const node={style:{}};registry.registerMapOverlay('head:test',node);assert.equal(node.style.display,'none');
for(let i=0;i<100;i++){registry.positionMapOverlay('head:test',{x:i*0.37,y:45.25,visible:true});assert.equal(node.style.transform,'translate3d('+(i*.37).toFixed(2)+'px, 45.25px, 0)')}
registry.positionMapOverlay('head:test',{x:12,y:14,visible:false});assert.equal(node.style.display,'none');registry.clearMapOverlayPositions();assert.equal(node.style.display,'none');registry.registerMapOverlay('head:test',null);
for(const d of LAYOUT_DOORS){const tiles=[[map.OX+d.x,map.OY+d.y],[map.OX+d.x+(d.orientation==='horizontal'?1:0),map.OY+d.y+(d.orientation==='vertical'?1:0)]];const f=doorFrame(tiles,d.orientation,d.id.startsWith('focus-'));if(d.orientation==='vertical'){assert.equal(f.posts[0].x+f.posts[0].w/2,(map.OX+d.x+.5)*map.TILE)}else{assert.equal(f.posts[0].x+f.posts[0].w,f.left);assert.equal(f.posts[1].x,f.right)} }
const pond=[];for(let y=0;y<map.MAP_H;y++)for(let x=0;x<map.MAP_W;x++)if(map.objects[y][x]==='koiPond')pond.push([x,y]);assert.equal(pond.length,16);
assert.equal((Math.min(...pond.map(p=>p[0]))+Math.max(...pond.map(p=>p[0]))+1)/2,map.OX+COURTYARD.x+COURTYARD.w/2);
assert.equal((Math.min(...pond.map(p=>p[1]))+Math.max(...pond.map(p=>p[1]))+1)/2,map.OY+COURTYARD.y+COURTYARD.h/2);
console.log('Motion/geometry checks passed: continuous steps, duplicate-target handling, stable head transforms, aligned door posts and centered square pond footprint.');
`;fs.writeFileSync('scripts/check-motion.mjs',s);

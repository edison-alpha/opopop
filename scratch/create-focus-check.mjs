import fs from 'node:fs';
let s=fs.readFileSync('scripts/check-map.mjs','utf8');s=s.slice(0,s.indexOf('const map = await import'));s+=`
const map=await import(moduleUrl(new URL('apps/web/src/office/game/map.ts',root)));
const lighting=await import(moduleUrl(new URL('apps/web/src/office/game/focusLighting.ts',root)));
const {PRIVATE_OFFICES,COURTYARD}=await import(moduleUrl(new URL('apps/web/src/office/game/layout.ts',root)));
const {doorFrame}=await import(moduleUrl(new URL('apps/web/src/office/game/doorGeometry.ts',root)));
const contains=(r,x,y)=>x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h;
for(const room of PRIVATE_OFFICES){
 const area=map.areas.find(a=>a.x===map.OX+room.x+1&&a.y===map.OY+1);
 const regions=lighting.roomLightRegions(area),dark=lighting.outsideLightRects(regions,map.MAP_W*32,map.MAP_H*32);
 const bright=(x,y)=>!dark.some(r=>contains(r,x,y));
 const left=(map.OX+room.x+.5)*32,right=(map.OX+room.x+room.w-.5)*32;
 for(let x=left;x<=right;x+=8)assert(bright(x,(map.OY+8.5)*32),'Entire lower wall must be illuminated');
 assert(bright((left+right)/2,map.OY*32+1),'Top wall must be illuminated');
 assert(bright(left,(map.OY+4)*32),'Side wall must be illuminated');
 const entranceX=(map.OX+room.entrance.x+.5)*32,entranceY=(map.OY+9.5)*32;
 assert(bright(entranceX,entranceY),'Carpeted doorway must remain illuminated');
 const atDoor=lighting.focusAreaAt(entranceX/32,entranceY/32);assert(atDoor&&atDoor.x===area.x,'Focus must remain active in the doorway');
 assert(!bright(left-32,(map.OY+4)*32),'Adjacent room must stay dim');
 const seam=regions[0].y+regions[0].h;
 assert(!lighting.lightOutline(regions).some(([x1,y1,x2,y2])=>y1===seam&&y2===seam&&entranceX>Math.min(x1,x2)&&entranceX<Math.max(x1,x2)),'No bright outline should cross the open doorway');
 for(let i=0;i<dark.length;i++)for(let j=i+1;j<dark.length;j++){const a=dark[i],b=dark[j];assert(Math.min(a.x+a.w,b.x+b.w)<=Math.max(a.x,b.x)||Math.min(a.y+a.h,b.y+b.h)<=Math.max(a.y,b.y),'Dark rectangles must not overlap and double-darken the map')}
}
const garden=map.areas.find(a=>a.x===map.OX+COURTYARD.x&&a.y===map.OY+COURTYARD.y);assert.equal(lighting.roomLightRegions(garden).length,0);
console.log('Focus checks passed: complete top/side/bottom walls, illuminated doorways, continuous outline, neighboring rooms dimmed once, and garden excluded.');
`;fs.writeFileSync('scripts/check-focus.mjs',s);
let render=fs.readFileSync('scratch/render-office.mjs','utf8');const start=render.indexOf('const canvas=art.renderStaticMap();');render=render.slice(0,start)+render.slice(start).replace('const canvas=art.renderStaticMap();',`const canvas=art.renderStaticMap();
const lighting=await import(moduleUrl(new URL('apps/web/src/office/game/focusLighting.ts',root)));
const area=map.areas.find(a=>a.name==='Focus Booth 2');
const regions=lighting.roomLightRegions(area),ctx=canvas.getContext('2d');
ctx.fillStyle='rgba(17,26,32,0.42)';
for(const r of lighting.outsideLightRects(regions,canvas.width,canvas.height))ctx.fillRect(r.x,r.y,r.w,r.h);
ctx.fillStyle='#e5f0df';
for(const [x1,y1,x2,y2] of lighting.lightOutline(regions))ctx.fillRect(x1,y1,Math.max(1,x2-x1),Math.max(1,y2-y1));
art.drawAvatar(ctx,{skin:'#dba579',hair:'#30251f',hairStyle:0,shirt:'#667eea',pants:'#2c3e66'},(map.OX+15)*32,(map.OY+9.5)*32,'up',0);
`);
render=render.slice(0,render.indexOf('await sharp(Buffer.from(svg),{limitInputPixels:false}).png()'))+`await sharp(Buffer.from(svg),{limitInputPixels:false}).extract({left:16*32,top:7*32,width:18*32,height:13*32}).resize({width:864,kernel:'nearest'}).png().toFile(fileURLToPath(new URL('scratch/focus-lighting-detail.png',root)));\nconsole.log('Rendered the real focus lighting geometry and doorway.');\n`;
fs.writeFileSync('scratch/render-focus.mjs',render);

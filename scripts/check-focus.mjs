import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"

const root = new URL("../", import.meta.url)
const require = createRequire(new URL("apps/web/package.json", root))
const ts = require("typescript")
const compiled = new Map()
function moduleUrl(url) {
  if (compiled.has(url.href)) return compiled.get(url.href)
  const source = readFileSync(url, "utf8")
  let { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    fileName: fileURLToPath(url),
  })
  outputText = outputText.replace(/from "(\.\.?\/[^"\n]+)"/g, (_, specifier) =>
    `from "${moduleUrl(new URL(`${specifier}.ts`, url))}"`)
  const result = `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
  compiled.set(url.href, result)
  return result
}


const map=await import(moduleUrl(new URL('apps/web/src/office/game/map.ts',root)));
const lighting=await import(moduleUrl(new URL('apps/web/src/office/game/focusLighting.ts',root)));
const {PRIVATE_OFFICES,HUDDLE_ROOMS,COURTYARD}=await import(moduleUrl(new URL('apps/web/src/office/game/layout.ts',root)));
const {doorFrame}=await import(moduleUrl(new URL('apps/web/src/office/game/doorGeometry.ts',root)));
const contains=(r,x,y)=>x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h;
for(const room of PRIVATE_OFFICES){
 const area=map.areas.find(a=>a.x===map.OX+room.x+1&&a.y===map.OY+1);
 const regions=lighting.roomLightRegions(area),dark=lighting.outsideLightRects(regions,map.MAP_W*32,map.MAP_H*32);
 const bright=(x,y)=>!dark.some(r=>contains(r,x,y));
 const left=(map.OX+room.x+.5)*32,right=(map.OX+room.x+room.w-.5)*32;
 for(let x=left;x<=right;x+=8)assert(bright(x,(map.OY+8.5)*32),'Entire lower wall must be illuminated');
 assert(bright((left+right)/2,map.OY*32+1),'Top wall must be illuminated');
 assert(!bright((left+right)/2,(map.OY-1)*32+1),'Garden above the actual wall must remain dim');
 assert(bright(left,(map.OY+4)*32),'Side wall must be illuminated');
 const entranceX=(map.OX+room.entrance.x+.5)*32,entranceY=(map.OY+8.5)*32;
 assert(bright(entranceX,entranceY),'Carpeted doorway must remain illuminated');
 const atDoor=lighting.focusAreaAt(entranceX/32,entranceY/32);assert(atDoor&&atDoor.x===area.x,'Focus must remain active in the doorway');
 assert(!bright(left-32,(map.OY+4)*32),'Adjacent room must stay dim');
 assert(!bright(entranceX,(map.OY+9.5)*32),'Corridor must not inherit room lighting');
 assert.equal(lighting.focusAreaAt(entranceX/32,map.OY+9.5),null,'Leaving the threshold releases room focus');
 const seam=(map.OY+room.entrance.y-1)*32+1;
 assert(!lighting.lightOutline(regions).some(([x1,y1,x2,y2])=>y1===seam&&y2===seam&&entranceX>Math.min(x1,x2)&&entranceX<Math.max(x1,x2)),'No bright outline should cross the open doorway');
 for(let i=0;i<dark.length;i++)for(let j=i+1;j<dark.length;j++){const a=dark[i],b=dark[j];assert(Math.min(a.x+a.w,b.x+b.w)<=Math.max(a.x,b.x)||Math.min(a.y+a.h,b.y+b.h)<=Math.max(a.y,b.y),'Dark rectangles must not overlap and double-darken the map')}
}
for(const room of HUDDLE_ROOMS){
 const area=map.areas.find(a=>a.x===map.OX+room.x+1&&a.y===map.OY+room.y+1)
 const regions=lighting.roomLightRegions(area),main=regions[0]
 assert.equal(main.y,(map.OY+room.y-1)*32,'Huddle highlight starts at the visible back-wall cap')
 assert.equal(main.y+main.h,(map.OY+room.y+room.h)*32,'Huddle highlight ends at its own bottom wall')
 const doorX=map.OX+(room.side==='left'?room.x+room.w-1:room.x)+.5,doorY=map.OY+room.y+3.5
 assert(regions.some(r=>contains(r,doorX*32,doorY*32)),'Doorway remains lit')
 const hallX=doorX+(room.side==='left'?1:-1)
 assert(!regions.some(r=>contains(r,hallX*32,doorY*32)),'Hall outside side doorway must remain dim')
}
const garden=map.areas.find(a=>a.x===map.OX+COURTYARD.x&&a.y===map.OY+COURTYARD.y);assert.equal(lighting.roomLightRegions(garden).length,0);
console.log('Focus checks passed: complete top/side/bottom walls, illuminated doorways, continuous outline, neighboring rooms dimmed once, and garden excluded.');

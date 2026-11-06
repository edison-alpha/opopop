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


const {wallShape,HORIZONTAL_WALL_RISE}=await import(moduleUrl(new URL('apps/web/src/office/game/wallGeometry.ts',root)));
const grid=points=>{const set=new Set(points.map(p=>p.join(',')));return (x,y)=>set.has([x,y].join(','))};
for(const points of [[[0,0],[0,1],[1,1],[2,1]],[[1,0],[0,1],[1,1],[2,1]],[[2,0],[0,1],[1,1],[2,1]]]) {
 const isWall=grid(points),shapes=[0,1,2].map(x=>wallShape(x,1,isWall));
 for(const shape of shapes){assert.equal(shape.y,32-HORIZONTAL_WALL_RISE,'L/T corner must share the raised top edge');assert.equal(shape.h,32+HORIZONTAL_WALL_RISE)}
 const vertical=wallShape(points[0][0],0,isWall);assert.equal(vertical.horizontal,false);assert.equal(vertical.w,6,'Vertical partition stays thin');
}
const stacked=grid([[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]]);
assert.equal(wallShape(1,0,stacked).hidden,true,'Upper wall rows must not add another facade');
assert.equal(wallShape(1,1,stacked).h,64,'Window walls and single-row walls share one visual height');
assert.equal(wallShape(1,1,stacked).y,0);
// Outside corners align to the side partition; doorways retain full tile width.
assert.equal(wallShape(0,1,grid([[0,0],[0,1],[1,1]])).x,13);
const doorway=grid([[0,0],[1,0],[4,0],[5,0]]);
assert.equal(wallShape(1,0,doorway).x+wallShape(1,0,doorway).w,64);
assert.equal(wallShape(4,0,doorway).x,128);
const {doorFrame}=await import(moduleUrl(new URL('apps/web/src/office/game/doorGeometry.ts',root)));
const {doorPanel}=await import(moduleUrl(new URL('apps/web/src/office/game/doorPanels.ts',root)));
const frame=doorFrame([[2,0],[3,0]],'horizontal',true);
assert.equal(frame.left,64);assert.equal(frame.right,128);
assert.equal(frame.posts[0].y,-32);assert.equal(frame.posts[0].h,64);
const closed=doorPanel(65,30,30,1,0,1),open=doorPanel(65,30,30,1,1,1);
assert.equal(closed.outline[1].x-closed.outline[0].x,30);
assert.equal(closed.outline[0].y-closed.outline[3].y,60,'Door must be upright, not a strip on the floor');
assert(open.outline[1].x-open.outline[0].x<3,'Open leaf clears the entrance');
assert(closed.glass.every(p=>p.y<30&&p.y>-30),'Glass stays inside the upright panel');
console.log('Wall checks passed: L/T joins flush on both ends, thin vertical partitions, continuous raised faces and stacked-row heights.');

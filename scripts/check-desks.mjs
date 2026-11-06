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

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

const map = await import(moduleUrl(new URL("apps/web/src/office/game/map.ts", root)))
const layout = await import(moduleUrl(new URL("apps/web/src/office/game/layout.ts", root)))
const {wallShape,HORIZONTAL_WALL_HEIGHT} = await import(moduleUrl(new URL("apps/web/src/office/game/wallGeometry.ts", root)))
const world = (x, y) => [x + map.OX, y + map.OY]
const canReach = (x, y) => map.findPath(map.SPAWN.x, map.SPAWN.y, x, y) !== null
const leftHuddle=layout.HUDDLE_ROOMS[0],leftBooth=layout.PRIVATE_OFFICES[0]
assert.equal(leftHuddle.y+1,leftBooth.y+leftBooth.h,"Huddle back wall and booth front wall must share their floor baseline")
assert.equal(leftHuddle.x+leftHuddle.w-1-leftBooth.x,1,"Keep the reference's one-tile side offset")
assert(!map.isBlocked(map.SPAWN.x, map.SPAWN.y), "Spawn must be walkable")

for (const area of map.areas) {
  assert(area.x >= 0 && area.y >= 0 && area.x + area.w <= map.MAP_W && area.y + area.h <= map.MAP_H, `${area.name}: outside map`)
  const target = map.areaCenter(area)
  assert(target && canReach(...target), `${area.name}: cannot be reached from spawn`)
}

for (const door of layout.LAYOUT_DOORS) {
  for (let i = 0; i < 2; i++) {
    const [x, y] = world(door.x + (door.orientation === "horizontal" ? i : 0), door.y + (door.orientation === "vertical" ? i : 0))
    assert(!map.isBlocked(x, y), `${door.id}: blocked door tile`)
    assert(canReach(x, y), `${door.id}: disconnected entrance`)
    const offsets = door.orientation === "horizontal" ? [[0, -1], [0, 1]] : [[-1, 0], [1, 0]]
    for (const [dx, dy] of offsets) assert(!map.isBlocked(x + dx, y + dy), `${door.id}: obstructed door approach`)
  }
}

let seats = 0
for (let y = 0; y < map.MAP_H; y++) for (let x = 0; x < map.MAP_W; x++) {
  if(map.floor[y][x]==="wall") {
    const shape=wallShape(x,y,(tx,ty)=>map.floor[ty]?.[tx]==="wall")
    if(shape.horizontal&&!shape.hidden) assert.equal(shape.h,HORIZONTAL_WALL_HEIGHT,`Unequal horizontal wall height at ${x},${y}`)
  }
  assert(map.isFloor(map.floor[y][x]), `Unknown floor at ${x},${y}`)
  const object = map.objects[y][x]
  assert(object === null || map.isObj(object), `Unknown object at ${x},${y}`)
  if (map.seatAt(x, y)) {
    seats++
    assert(canReach(x, y), `Unreachable seat at ${x},${y}`)
  }
}

for (const office of layout.PRIVATE_OFFICES) {
  const [entryX, entryY] = world(office.entrance.x, office.entrance.y)
  for (let dx=0;dx<2;dx++) {
    assert.equal(map.floor[entryY][entryX+dx],"lavender","Door threshold matches room carpet")
    assert.equal(map.floor[entryY+1][entryX+dx],"hall","Carpet ends flush with the wall baseline")
    assert.equal(map.objects[entryY+1][entryX+dx],null,"Door apron is empty")
  }
  const chair = world(office.chair.x, office.chair.y)
  assert(map.objects[chair[1]][chair[0]] === "officeChairUp", `${office.name}: claim target is not a desk chair`)
  assert(canReach(...chair), `${office.name}: inaccessible desk chair`)
}

for (const room of layout.HUDDLE_ROOMS) {
  const [cx,cy]=world(room.x+3,room.y+5)
  for(const [dx,dy] of [[0,-1],[0,1],[-1,0],[1,0]]) assert(map.seatAt(cx+dx,cy+dy),`${room.name}: chairs must be adjacent to the table`)
}

// Touching desks still have independent footprints for erase/undo/build tools.
for (const desk of layout.TEAM_DESKS) {
  const [x, y] = world(desk.x, desk.y)
  const [w, h] = map.FOOTPRINT.workDesk
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) {
    assert.equal(map.objects[y + dy][x + dx], "workDesk")
    assert.deepEqual(map.objectOrigin(x + dx, y + dy), [x, y], "Adjacent desk footprints must remain independent")
  }
}

// A local claimed-desk display alias must not break Go-to-room navigation.
map.setDeskNameResolver(() => "Test user's desk")
for (const area of map.areas) assert(map.areaCenter(area), `${area.name}: desk alias breaks destination`)
map.setDeskNameResolver(() => null)

console.log(`Map checks passed: ${map.areas.length} areas, ${layout.LAYOUT_DOORS.length} doors, ${seats} reachable seats; ${map.MAP_W} x ${map.MAP_H} tiles.`)

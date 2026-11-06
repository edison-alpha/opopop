"use client"
// Build-mode edit builders: each returns the MapOps for one user action.
import type { MapOp } from "@/shared/protocol"
import {
  FOOTPRINT, MAP_H, MAP_W, WALL_DECOR, WATER_ONLY, areas, floor, objectOrigin, objects,
  type Area, type Floor, type Obj,
} from "./game/map"

const inMap = (x: number, y: number) => x >= 0 && y >= 0 && x < MAP_W && y < MAP_H

/** Palette groups shown in the build panel. */
export const OBJECT_GROUPS: { name: string; items: Obj[] }[] = [
  {name:"Garden & office details",items:["flowerPink","flowerBlue","trailingShelf","snakePlant","monstera","oakSideTable","recycleStation","snackVending","landscapePoster","airConditioner","coatRack","firstAid","magazineRack"]},
  { name: "Desks & meeting furniture", items: ["workDesk", "furnishedDesk", "roundSmall", "meetingRound", "chartEasel", "whiteboard", "studyShelf", "filingLaptop", "pantryUnit"] },
  { name: "New furniture & accessories", items: ["beanbagPurple", "bamboo", "terracottaPlant", "sideTablePlant", "sideTableMug", "monitor", "laptop", "deskPhone", "notebooks", "blueSofaBack", "blueArmchairBack", "koiPond", "loungeTable", "roundSmall"] },
  { name: "Work", items: ["workDesk", "reception", "displayShelf", "deskMonitor", "desk", "officeChairUp", "officeChair", "whiteboard", "printer", "cabinet", "cabinetPlant", "bookshelf", "tv", "table", "roundTable"] },
  { name: "Seating", items: ["chair", "chairUp", "chairL", "chairR", "sofa", "sofaUp", "blueSofa", "blueSofaSide", "blueSofaLeft", "cognacSofaLeft", "cognacSofaRight", "officeChairL", "officeChairR", "bench", "stool", "beanbag", "beanbagPink"] },
  { name: "Hangout & pantry", items: ["oakCoffeeRect", "coffeeTable", "cafeTable", "parasol", "counter", "coffee", "fridge", "vending", "waterCooler", "arcade", "pingpong", "lamp", "trash"] },
  { name: "Decor", items: ["plant", "plantBig", "flowers", "painting", "poster", "clock", "wallWindow", "fishTank", "rock"] },
  { name: "Outdoor", items: ["tree", "pine", "bush", "hedge", "lampPost", "lily"] },
]

export const OBJECT_LABEL: Partial<Record<Obj, string>> = {
  blueSofaLeft: "Blue sofa · facing left", cognacSofaLeft: "Cognac sofa · facing left", cognacSofaRight: "Cognac sofa · facing right",
  officeChairL: "Office chair · facing left", officeChairR: "Office chair · facing right", oakCoffeeRect: "Oak coffee table",
  flowerPink:"Flower Pink", flowerBlue:"Flower Blue", trailingShelf:"Trailing Shelf", snakePlant:"Snake Plant", monstera:"Monstera", oakSideTable:"Oak Side Table", recycleStation:"Recycle Station", snackVending:"Snack Vending", landscapePoster:"Landscape Poster", airConditioner:"Air Conditioner", coatRack:"Coat Rack", firstAid:"First Aid", magazineRack:"Magazine Rack",
  furnishedDesk: "White desk + computer", chartEasel: "Chart easel", studyShelf: "Bookcase + snake plant", filingLaptop: "Filing cabinet + laptop", pantryUnit: "Espresso pantry", meetingRound: "Round meeting table",
  beanbagPurple: "Purple beanbag", bamboo: "Potted bamboo", terracottaPlant: "Terracotta plant", sideTablePlant: "Side table + plant", sideTableMug: "Side table + mug", deskPhone: "Desk phone", blueSofaBack: "Blue sofa (back)", blueArmchairBack: "Blue armchair (back)", koiPond: "Koi pond",
  workDesk: "White work desk", reception: "Reception desk", displayShelf: "Display shelves", loungeTable: "Lounge coffee table",
  roundSmall: "Huddle table", fishTank: "Fish tank", blueSofa: "Blue sofa", blueSofaSide: "Blue sofa (side)",
  deskMonitor: "Desk + monitor", desk: "Desk", officeChairUp: "Office chair ↑", officeChair: "Office chair ↓",
  cabinetPlant: "Cabinet + plant", roundTable: "Round table", chair: "Chair ↓", chairUp: "Chair ↑", chairL: "Chair ←",
  chairR: "Chair →", sofa: "Sofa ↓", sofaUp: "Sofa ↑", beanbag: "Beanbag", beanbagPink: "Beanbag (pink)",
  coffeeTable: "Coffee table", cafeTable: "Café table", parasol: "Parasol table", coffee: "Coffee machine",
  vending: "Vending machine", waterCooler: "Water cooler", pingpong: "Ping-pong", plantBig: "Big plant",
  wallWindow: "Window (wall)", painting: "Painting (wall)", poster: "Poster (wall)", clock: "Clock (wall)",
  pine: "Pine", lampPost: "Lamp post", lily: "Lily pad (water)", tv: "TV", lamp: "Floor lamp",
}
export const labelOf = (o: Obj) => OBJECT_LABEL[o] ?? o.charAt(0).toUpperCase() + o.slice(1)

export const FLOOR_LABEL: Record<Floor, string> = {
  stripe: "Striped carpet", huddle: "Huddle carpet", diamond: "Diamond rug",
  grass: "Grass", path: "Stone path", wall: "Wall", hall: "Light wood", lavender: "Purple carpet", slate: "Grey chevron",
  rug: "Grey rug", kitchen: "Kitchen tile", game: "Dark tile", wood: "Parquet", carpet: "Teal carpet",
  marble: "Marble", deck: "Deck", water: "Water", rugWarm: "Warm rug", rugBlue: "Blue rug",
}

const ROTATIONS: Obj[][] = [
  ["chair", "chairR", "chairUp", "chairL"],
  ["officeChair", "officeChairR", "officeChairUp", "officeChairL"],
  ["sofa", "cognacSofaRight", "sofaUp", "cognacSofaLeft"],
  ["blueSofa", "blueSofaSide", "blueSofaBack", "blueSofaLeft"],
  ["redChair", "redChairR", "redChairUp", "redChairL"],
  ["beanbag", "beanbagPink"],
  ["plant", "plantBig"],
  ["tree", "pine"],
  ["cabinet", "cabinetPlant"],
  ["desk", "deskMonitor"],
]
/** Next variant/orientation of an object (R key). */
export function rotateObj(o: Obj): Obj {
  for (const g of ROTATIONS) {
    const i = g.indexOf(o)
    if (i >= 0) return g[(i + 1) % g.length]
  }
  return o
}

/** Ops that clear the whole object (all footprint tiles) covering (x,y). */
function clearAt(x: number, y: number, out: MapOp[]) {
  const origin = objectOrigin(x, y)
  if (!origin) return
  const o = objects[y][x]!
  const [w, h] = FOOTPRINT[o] ?? [1, 1]
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) {
    const tx = origin[0] + dx, ty = origin[1] + dy
    if (inMap(tx, ty) && objects[ty][tx] === o) out.push({ k: "obj", x: tx, y: ty, o: null })
  }
}

/** Why `o` can't go at (x,y), or null when it fits. */
export function placeError(o: Obj, x: number, y: number): string | null {
  const [w, h] = FOOTPRINT[o] ?? [1, 1]
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) {
    const tx = x + dx, ty = y + dy
    if (!inMap(tx, ty)) return "Outside the map"
    const f = floor[ty][tx]
    if (WALL_DECOR.has(o)) { if (f !== "wall") return "Wall decor goes on a wall" }
    else if (WATER_ONLY.has(o)) { if (f !== "water") return "Lily pads go on water" }
    else if (f === "wall") return "Can't place on a wall"
    else if (f === "water") return "Can't place on water"
  }
  return null
}

export function placeOps(o: Obj, x: number, y: number): MapOp[] | null {
  if (placeError(o, x, y)) return null
  const [w, h] = FOOTPRINT[o] ?? [1, 1]
  const ops: MapOp[] = []
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) clearAt(x + dx, y + dy, ops)
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) ops.push({ k: "obj", x: x + dx, y: y + dy, o })
  return ops
}

const norm = (x0: number, y0: number, x1: number, y1: number) =>
  [Math.max(0, Math.min(x0, x1)), Math.max(0, Math.min(y0, y1)), Math.min(MAP_W - 1, Math.max(x0, x1)), Math.min(MAP_H - 1, Math.max(y0, y1))] as const

export function eraseOps(ax: number, ay: number, bx: number, by: number): MapOp[] {
  const [x0, y0, x1, y1] = norm(ax, ay, bx, by)
  const ops: MapOp[] = []
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (objects[y][x]) clearAt(x, y, ops)
  return dedupe(ops)
}

export function floorOps(f: Floor, ax: number, ay: number, bx: number, by: number): MapOp[] {
  const [x0, y0, x1, y1] = norm(ax, ay, bx, by)
  const ops: MapOp[] = []
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const o = objects[y][x]
      // Keep objects only where they still fit on the new floor.
      if (o) {
        const fits = WALL_DECOR.has(o) ? f === "wall" : WATER_ONLY.has(o) ? f === "water" : f !== "wall" && f !== "water"
        if (!fits) clearAt(x, y, ops)
      }
      ops.push({ k: "floor", x, y, f })
    }
  }
  return dedupe(ops)
}

function uniqueName(base: string) {
  const name = base.trim() || "New Room"
  if (!areas.some((a) => a.name === name)) return name
  for (let i = 2; ; i++) if (!areas.some((a) => a.name === `${name} ${i}`)) return `${name} ${i}`
}

/** A walled room over the dragged rectangle with a door in the bottom wall, plus its named area. */
export function roomOps(
  ax: number, ay: number, bx: number, by: number,
  opts: { name: string; floor: Floor; private: boolean; meeting: boolean },
): MapOp[] | null {
  const [x0, y0, x1, y1] = norm(ax, ay, bx, by)
  if (x1 - x0 < 2 || y1 - y0 < 2) return null
  const ops: MapOp[] = []
  const doorMid = Math.floor((x0 + x1) / 2)
  const doors = new Set(x1 - x0 >= 5 ? [doorMid, doorMid + 1] : [doorMid])
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const edge = x === x0 || x === x1 || y === y0 || y === y1
      const door = y === y1 && doors.has(x) && x !== x0 && x !== x1
      const f: Floor = edge && !door ? "wall" : opts.floor
      const o = objects[y][x]
      if (o && (f === "wall" ? !WALL_DECOR.has(o) : WALL_DECOR.has(o) || WATER_ONLY.has(o))) clearAt(x, y, ops)
      ops.push({ k: "floor", x, y, f })
    }
  }
  ops.push({
    k: "area",
    area: { name: uniqueName(opts.name), x: x0 + 1, y: y0 + 1, w: x1 - x0 - 1, h: y1 - y0 - 1, private: opts.private, meeting: opts.meeting, label: true },
  })
  return dedupe(ops)
}

const inside = (a: Area, x: number, y: number) => x >= a.x && x < a.x + a.w && y >= a.y && y < a.y + a.h

/**
 * Removes a room: its area, the furniture inside, and its walls, except wall
 * tiles shared with a neighbouring room. The floor becomes light wood.
 */
export function demolishOps(name: string): MapOp[] {
  const a = areas.find((r) => r.name === name)
  if (!a) return []
  const others = areas.filter((r) => r !== a)
  const ops: MapOp[] = []
  for (let y = a.y - 1; y <= a.y + a.h; y++) {
    for (let x = a.x - 1; x <= a.x + a.w; x++) {
      if (!inMap(x, y)) continue
      if (inside(a, x, y)) {
        if (objects[y][x]) clearAt(x, y, ops)
        ops.push({ k: "floor", x, y, f: "hall" })
      } else if (floor[y][x] === "wall") {
        const shared = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => others.some((r) => inside(r, x + dx, y + dy)))
        const outerWall = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !inMap(x + dx, y + dy) || floor[y + dy][x + dx] === "grass")
        if (shared || outerWall) continue
        if (objects[y][x]) clearAt(x, y, ops)
        ops.push({ k: "floor", x, y, f: "hall" })
      }
    }
  }
  ops.push({ k: "areaDel", name })
  return dedupe(ops)
}

export function renameAreaOps(name: string, patch: Partial<Area>): MapOp[] {
  const a = areas.find((r) => r.name === name)
  if (!a) return []
  const next = { ...a, ...patch }
  const ops: MapOp[] = []
  if (next.name !== a.name) ops.push({ k: "areaDel", name: a.name })
  ops.push({ k: "area", area: next })
  return ops
}

/** Drops repeated ops on the same tile/key, keeping the last. */
function dedupe(ops: MapOp[]): MapOp[] {
  const seen = new Map<string, number>()
  ops.forEach((op, i) => {
    const k = op.k === "obj" ? `o${op.x},${op.y}` : op.k === "floor" ? `f${op.x},${op.y}` : `${op.k}${i}`
    seen.set(k, i)
  })
  return ops.filter((op, i) => {
    const k = op.k === "obj" ? `o${op.x},${op.y}` : op.k === "floor" ? `f${op.x},${op.y}` : `${op.k}${i}`
    return seen.get(k) === i
  })
}

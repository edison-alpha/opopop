// Office map: tile grid with floor + object layers and named areas.
import type { MapOp } from "@/shared/protocol"

// A real-office layout: meeting rooms and focus booths along the top, open-plan
// division floors in the middle, hangout spaces + lobby along the bottom, all
// inside a garden with a terrace and a pond. Coordinates in build() are
// building-local; the building is 60 x 44 tiles.

export const TILE = 32
const BW = 60
const BH = 38
const OX = 13
const OY = 9
export const MAP_W = OX + BW + 13
export const MAP_H = OY + BH + 9

export const FLOORS = [
  "grass", "path", "wall", "hall", "lavender", "slate", "rug", "kitchen", "game",
  "wood", "carpet", "marble", "deck", "water", "rugWarm", "rugBlue",
] as const
export type Floor = (typeof FLOORS)[number]

export const OBJS = [
  "desk", "deskMonitor", "chair", "chairUp", "plant", "plantBig", "sofa", "sofaUp", "table", "roundTable",
  "whiteboard", "counter", "fridge", "coffee", "bookshelf", "tv", "arcade", "beanbag", "beanbagPink", "lamp",
  "pine", "tree", "bush", "window", "printer", "chairL", "chairR", "officeChairUp", "officeChair", "painting",
  "cabinet", "cabinetPlant", "waterCooler", "flowers", "rock", "bench", "hedge", "lampPost", "wallWindow",
  "poster", "clock", "coffeeTable", "vending", "pingpong", "trash", "stool", "lily", "cafeTable", "parasol",
] as const
export type Obj = (typeof OBJS)[number]

const FLOOR_SET: ReadonlySet<string> = new Set(FLOORS)
const OBJ_SET: ReadonlySet<string> = new Set(OBJS)

export interface Area {
  name: string
  x: number
  y: number
  w: number
  h: number
  /** Private areas connect everyone inside them regardless of distance. */
  private: boolean
  /** Meeting areas open the full-screen meeting layout. */
  meeting?: boolean
  /** Shown as a floating label on the map. */
  label?: boolean
}

// Seats are walkable; standing still on one makes the avatar sit.
const BLOCKING: ReadonlySet<Obj> = new Set<Obj>([
  "desk", "deskMonitor", "plant", "plantBig", "table", "roundTable", "whiteboard",
  "counter", "fridge", "coffee", "bookshelf", "tv", "arcade", "lamp", "pine", "tree", "bush", "window", "printer",
  "painting", "cabinet", "cabinetPlant", "waterCooler", "rock", "hedge", "lampPost", "wallWindow",
  "poster", "clock", "coffeeTable", "vending", "pingpong", "trash", "cafeTable", "parasol",
])

export type SeatDir = "up" | "down" | "left" | "right" | "any"
export interface Seat {
  /** Direction the sitter faces ("any" keeps the avatar's own facing). */
  dir: SeatDir
  /** How far the seated sprite is raised so the hips meet the seat, in px. */
  lift: number
  /** Rows of the seat sprite (from tile top) that are drawn in front of a sitter. */
  frontFrom?: number
}
export const SEATS: Partial<Record<Obj, Seat>> = {
  chair: { dir: "down", lift: 7 },
  chairUp: { dir: "up", lift: 9, frontFrom: 12 },
  chairL: { dir: "left", lift: 7 },
  chairR: { dir: "right", lift: 7 },
  officeChair: { dir: "down", lift: 7 },
  officeChairUp: { dir: "up", lift: 9, frontFrom: 11 },
  sofa: { dir: "down", lift: 7 },
  sofaUp: { dir: "up", lift: 9, frontFrom: 18 },
  bench: { dir: "down", lift: 8 },
  stool: { dir: "any", lift: 9 },
  beanbag: { dir: "down", lift: 4 },
  beanbagPink: { dir: "down", lift: 4 },
}
export function seatAt(x: number, y: number): Seat | null {
  if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return null
  const o = objects[y][x]
  return (o && SEATS[o]) ?? null
}

/** Objects that cover more than one tile, as [width, height] from the top-left tile. */
export const FOOTPRINT: Partial<Record<Obj, [number, number]>> = { roundTable: [2, 2], pingpong: [2, 1] }
/** Objects that hang on a wall tile instead of standing on the floor. */
export const WALL_DECOR: ReadonlySet<Obj> = new Set<Obj>(["painting", "poster", "clock", "wallWindow"])
/** Objects that only go on water. */
export const WATER_ONLY: ReadonlySet<Obj> = new Set<Obj>(["lily"])
export const floor: Floor[][] = Array.from({ length: MAP_H }, () =>
  Array.from({ length: MAP_W }, () => "grass" as Floor),
)
export const objects: (Obj | null)[][] = Array.from({ length: MAP_H }, () =>
  Array.from({ length: MAP_W }, () => null),
)
export const areas: Area[] = []

// ── building-local helpers ──
function setF(x: number, y: number, f: Floor) {
  floor[y + OY][x + OX] = f
}
function fill(x0: number, y0: number, x1: number, y1: number, f: Floor) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) setF(x, y, f)
}
function walls(x0: number, y0: number, x1: number, y1: number) {
  for (let x = x0; x <= x1; x++) { setF(x, y0, "wall"); setF(x, y1, "wall") }
  for (let y = y0; y <= y1; y++) { setF(x0, y, "wall"); setF(x1, y, "wall") }
}
function room(x0: number, y0: number, x1: number, y1: number, inside: Floor, doors: [number, number][], doorFloor: Floor = inside) {
  fill(x0 + 1, y0 + 1, x1 - 1, y1 - 1, inside)
  walls(x0, y0, x1, y1)
  for (const [x, y] of doors) setF(x, y, doorFloor)
}
function put(x: number, y: number, o: Obj) {
  objects[y + OY][x + OX] = o
}
function area(a: Area) {
  areas.push({ ...a, x: a.x + OX, y: a.y + OY })
}
/** A row of desks facing up, with office chairs below the monitor desks. */
function deskRow(x0: number, y: number, n: number) {
  for (let i = 0; i < n; i++) {
    const o: Obj = i % 3 === 2 ? "desk" : "deskMonitor"
    put(x0 + i, y, o)
    if (o === "deskMonitor") put(x0 + i, y + 1, "officeChairUp")
  }
}
/** Small café table with a chair on each side. */
function cafeSet(x: number, y: number) {
  put(x, y, "cafeTable"); put(x - 1, y, "chairR"); put(x + 1, y, "chairL")
}

// ── world helpers ──
const inMap = (x: number, y: number) => x >= 0 && y >= 0 && x < MAP_W && y < MAP_H
function wf(x: number, y: number, f: Floor) {
  if (inMap(x, y)) floor[y][x] = f
}
/** Places an object on free grass only (garden decoration). */
function putWorld(x: number, y: number, o: Obj) {
  if (!inMap(x, y) || floor[y][x] !== "grass" || objects[y][x]) return
  objects[y][x] = o
}
function putAny(x: number, y: number, o: Obj) {
  if (inMap(x, y) && !objects[y][x]) objects[y][x] = o
}

function build() {
  fill(0, 0, BW - 1, BH - 1, "hall")
  walls(0, 0, BW - 1, BH - 1)

  // ───────── Top Band: 4 Private Offices + Central Outdoor Koi Pond (y 0..9) ─────────

  // 1. Focus Booth 1 (Private Office 1)
  room(1, 0, 11, 9, "lavender", [[6, 9]], "hall")
  area({ name: "Focus Booth 1", x: 2, y: 1, w: 9, h: 8, private: true })
  put(5, 2, "deskMonitor"); put(6, 2, "desk"); put(7, 2, "desk")
  put(6, 1, "officeChair")
  put(2, 1, "plantBig"); put(10, 1, "plant")
  put(4, 0, "wallWindow"); put(8, 0, "wallWindow")

  // 2. Focus Booth 2 (Private Office 2)
  room(13, 0, 23, 9, "lavender", [[18, 9]], "hall")
  area({ name: "Focus Booth 2", x: 14, y: 1, w: 9, h: 8, private: true })
  put(17, 2, "deskMonitor"); put(18, 2, "desk"); put(19, 2, "desk")
  put(18, 1, "officeChair")
  put(14, 1, "plantBig"); put(22, 1, "plant")
  put(16, 0, "wallWindow"); put(20, 0, "wallWindow")

  // 3. Central Outdoor Courtyard & Koi Pond (Photo 2 Top-Center)
  fill(24, 0, 36, 9, "path")
  for (let y = 0; y <= 9; y++) { setF(24, y, "wall"); setF(36, y, "wall") }
  // Organic Koi Pond in the middle
  fill(27, 2, 33, 7, "water")
  put(28, 4, "lily"); put(31, 5, "lily")
  // Patio Deck Chairs around the pond
  put(29, 1, "chair"); put(31, 1, "chair")
  put(29, 8, "chairUp"); put(31, 8, "chairUp")
  put(26, 4, "chairR"); put(34, 5, "chairL")
  // Surrounding lush shrubs
  put(25, 1, "bush"); put(35, 1, "bush"); put(25, 8, "bush"); put(35, 8, "bush")
  area({ name: "Koi Pond Courtyard", x: 25, y: 1, w: 11, h: 8, private: false, label: true })

  // 4. Focus Booth 3 (Private Office 3)
  room(37, 0, 47, 9, "lavender", [[42, 9]], "hall")
  area({ name: "Focus Booth 3", x: 38, y: 1, w: 9, h: 8, private: true })
  put(41, 2, "deskMonitor"); put(42, 2, "desk"); put(43, 2, "desk")
  put(42, 1, "officeChair")
  put(38, 1, "plantBig"); put(46, 1, "plant")
  put(40, 0, "wallWindow"); put(44, 0, "wallWindow")

  // 5. Focus Booth 4 (Private Office 4)
  room(49, 0, 59, 9, "lavender", [[54, 9]], "hall")
  area({ name: "Focus Booth 4", x: 50, y: 1, w: 9, h: 8, private: true })
  put(53, 2, "deskMonitor"); put(54, 2, "desk"); put(55, 2, "desk")
  put(54, 1, "officeChair")
  put(50, 1, "plantBig"); put(58, 1, "plant")
  put(52, 0, "wallWindow"); put(56, 0, "wallWindow")

  // ───────── Central Corridor (y 10..13) ─────────
  put(9, 10, "arcade")
  put(11, 10, "bookshelf"); put(12, 10, "bookshelf")
  put(20, 10, "counter"); put(21, 10, "coffee"); put(22, 10, "fridge")
  put(27, 10, "whiteboard")
  put(34, 10, "lampPost")
  put(38, 10, "bookshelf"); put(39, 10, "bookshelf")
  put(48, 10, "whiteboard")

  // ───────── Middle Band: Lounge, Team Pod, Café & Conference (y 14..26) ─────────

  // Breakroom / Café (Far-Left)
  room(1, 14, 11, 26, "wood", [[11, 20]], "hall")
  area({ name: "Café", x: 2, y: 15, w: 9, h: 11, private: false, label: true })
  cafeSet(4, 17); cafeSet(8, 17)
  cafeSet(4, 23); cafeSet(8, 23)
  put(2, 15, "counter"); put(3, 15, "coffee"); put(4, 15, "waterCooler"); put(10, 15, "plantBig")

  // Central Lounge (Center-Left: Striped Slate Rug + Cognac Sofas)
  fill(13, 14, 28, 26, "slate")
  area({ name: "Lounge", x: 13, y: 14, w: 16, h: 12, private: false, label: true })
  // Modern bookcases on left & right
  put(13, 14, "bookshelf"); put(13, 15, "bookshelf"); put(13, 25, "cabinetPlant")
  put(28, 14, "bookshelf"); put(28, 15, "bookshelf"); put(28, 25, "cabinetPlant")
  // Cognac leather sofas facing each other
  put(18, 16, "sofa"); put(19, 16, "sofa"); put(20, 16, "sofa"); put(21, 16, "sofa"); put(22, 16, "sofa")
  put(19, 19, "coffeeTable"); put(20, 19, "coffeeTable"); put(21, 19, "coffeeTable")
  put(18, 22, "sofaUp"); put(19, 22, "sofaUp"); put(20, 22, "sofaUp"); put(21, 22, "sofaUp"); put(22, 22, "sofaUp")
  // Colorful beanbags
  put(15, 18, "beanbag"); put(15, 20, "beanbagPink"); put(25, 18, "beanbagPink"); put(25, 20, "beanbag")

  // Team Desk Pod (Center-Right: Purple Chevron Carpet + 6 Modern Desks)
  fill(31, 14, 46, 26, "lavender")
  area({ name: "Team", x: 31, y: 14, w: 16, h: 12, private: false, label: true })
  // Top row: 3 connected desks facing down
  put(33, 16, "deskMonitor"); put(34, 16, "deskMonitor"); put(35, 16, "deskMonitor")
  put(39, 16, "deskMonitor"); put(40, 16, "deskMonitor"); put(41, 16, "deskMonitor")
  put(34, 18, "officeChairUp"); put(40, 18, "officeChairUp")
  // Bottom row: 3 connected desks facing up
  put(33, 21, "deskMonitor"); put(34, 21, "deskMonitor"); put(35, 21, "deskMonitor")
  put(39, 21, "deskMonitor"); put(40, 21, "deskMonitor"); put(41, 21, "deskMonitor")
  put(34, 23, "officeChairUp"); put(40, 23, "officeChairUp")
  put(31, 26, "printer"); put(46, 26, "plantBig"); put(31, 14, "whiteboard"); put(46, 14, "whiteboard")

  // Meeting Room A (Boardroom - Upper Right)
  room(48, 11, 58, 18, "carpet", [[48, 14]], "hall")
  area({ name: "Meeting Room A", x: 49, y: 12, w: 9, h: 6, private: true, meeting: true })
  put(53, 14, "roundTable"); put(54, 14, "roundTable"); put(53, 15, "roundTable"); put(54, 15, "roundTable")
  put(53, 13, "chair"); put(54, 13, "chair"); put(53, 16, "chairUp"); put(54, 16, "chairUp")
  put(52, 14, "chairR"); put(55, 15, "chairL")
  put(50, 12, "whiteboard"); put(57, 12, "plantBig")

  // Meeting Room B (Huddle Room - Lower Right)
  room(48, 19, 58, 26, "slate", [[48, 22]], "hall")
  area({ name: "Meeting Room B", x: 49, y: 20, w: 9, h: 6, private: true, meeting: true })
  put(53, 22, "coffeeTable"); put(54, 22, "coffeeTable")
  put(53, 21, "chair"); put(54, 21, "chair"); put(53, 24, "chairUp"); put(54, 24, "chairUp")
  put(49, 20, "cabinet"); put(57, 20, "lampPost")

  // ───────── Bottom Band: Lobby & Reception (y 27..37) ─────────
  fill(1, 27, 34, 37, "wood")
  area({ name: "Lobby", x: 2, y: 27, w: 32, h: 10, private: false, label: true })
  // Blue modular L-couch on diamond rug
  fill(3, 28, 12, 34, "rug")
  put(4, 29, "sofa"); put(5, 29, "sofa"); put(6, 29, "sofa"); put(7, 29, "sofa")
  put(4, 30, "sofa"); put(4, 31, "sofa"); put(4, 32, "sofa")
  put(6, 31, "coffeeTable"); put(7, 31, "coffeeTable")
  // Curved reception desk
  put(18, 30, "desk"); put(19, 30, "deskMonitor"); put(20, 30, "desk")
  put(19, 29, "officeChair")
  // Abstract swirling blue mural on north lobby wall
  put(8, 27, "painting"); put(9, 27, "painting")
  put(2, 28, "plantBig"); put(23, 28, "lampPost")

  // Tech & Archives (Bottom Right: x 35..58)
  fill(35, 27, 58, 37, "wood")
  area({ name: "HR & Finance", x: 35, y: 27, w: 23, h: 10, private: true, label: true })
  put(36, 28, "cabinet"); put(37, 28, "cabinet"); put(38, 28, "waterCooler")
  put(56, 28, "vending"); put(57, 28, "printer"); put(58, 28, "cabinetPlant")

  // Floor-to-ceiling glass windows on South Wall overlooking the garden
  for (let x = 3; x <= 57; x += 3) {
    if (x < 33 || x > 36) put(x, 37, "wallWindow")
  }

  // Double main entrance door opening to garden
  setF(34, 37, "hall"); setF(35, 37, "hall")

  // ───────── Garden ─────────
  const bx0 = OX, by0 = OY, bx1 = OX + BW - 1, by1 = OY + BH - 1
  const rx0 = bx0 - 3, rx1 = bx1 + 3, ry0 = by0 - 3, ry1 = by1 + 3

  // Path ring around the building
  for (let x = rx0; x <= rx1; x++) { wf(x, ry0, "path"); wf(x, ry1, "path") }
  for (let y = ry0; y <= ry1; y++) { wf(rx0, y, "path"); wf(rx1, y, "path") }

  // Main entrance: plaza + path to the bottom edge
  const ex = OX + 36
  for (let y = by1 + 1; y < MAP_H; y++) for (let x = ex - 1; x <= ex + 1; x++) wf(x, y, "path")
  for (let y = by1 + 1; y <= by1 + 5; y++) for (let x = ex - 6; x <= ex + 6; x++) wf(x, y, "path")
  putWorld(ex - 6, by1 + 2, "lampPost"); putWorld(ex + 6, by1 + 2, "lampPost")
  putWorld(ex - 4, by1 + 2, "bench"); putWorld(ex + 4, by1 + 2, "bench")
  for (let x = ex - 6; x <= ex + 6; x++) if (Math.abs(x - ex) > 1) putAny(x, by1 + 5, "flowers")
  for (const x of [ex - 5, ex - 3, ex + 3, ex + 5]) objects[by1 + 5][x] = "hedge"

  // Terrace (outdoor hangout) off the lounge's side door
  for (let y = by0 + 34; y <= by0 + 41; y++) for (let x = 1; x <= rx0 - 1; x++) wf(x, y, "deck")
  for (let x = rx0; x < bx0; x++) { wf(x, by0 + 36, "path"); wf(x, by0 + 37, "path") }
  area({ name: "Terrace", x: 1 - OX, y: 34, w: rx0 - 1, h: 8, private: false, label: true })
  for (const [x, y] of [[3, by0 + 35], [7, by0 + 35], [3, by0 + 39], [7, by0 + 39]]) {
    objects[y][x] = "parasol"; objects[y][x - 1] = "chairR"; objects[y][x + 1] = "chairL"
  }
  objects[by0 + 41][1] = "plant"; objects[by0 + 34][1] = "plant"; objects[by0 + 37][5] = "lampPost"

  // Pond in the east garden
  const pcx = rx1 + 5, pcy = by0 + 10
  for (let y = pcy - 4; y <= pcy + 4; y++) {
    for (let x = pcx - 4; x <= pcx + 4; x++) {
      const d = ((x - pcx) / 4.2) ** 2 + ((y - pcy) / 3.6) ** 2
      if (d <= 1) wf(x, y, "water")
    }
  }
  for (const [dx, dy] of [[-2, -1], [1, 1], [2, -2], [-1, 2]]) putAny(pcx + dx, pcy + dy, "lily")
  for (const [dx, dy] of [[-5, 0], [5, 1], [0, -4], [-3, 4], [4, -3], [3, 4]]) putWorld(pcx + dx, pcy + dy, "rock")
  for (const [dx, dy] of [[-5, -2], [-4, 3], [5, -1], [2, 5], [-2, -5]]) putWorld(pcx + dx, pcy + dy, "flowers")
  putWorld(pcx - 2, pcy + 6, "bench"); putWorld(pcx + 2, pcy + 6, "bench"); putWorld(pcx, pcy + 6, "lampPost")

  // Beds and hedges hugging the building
  for (let x = bx0; x <= bx1; x++) {
    if (x % 2 === 0) putWorld(x, by0 - 1, "flowers")
    if (x % 6 === 3) putWorld(x, by0 - 2, "bush")
    if (Math.abs(x - ex) > 7 && x % 2 === 1) putWorld(x, by1 + 1, "flowers")
    if (Math.abs(x - ex) > 7 && x % 4 === 0) putWorld(x, by1 + 2, "hedge")
  }
  for (let y = by0; y <= by1; y++) {
    if (y % 2 === 0) { putWorld(bx0 - 1, y, "flowers"); putWorld(bx1 + 1, y, "flowers") }
    if (y % 5 === 2) { putWorld(bx0 - 2, y, "bush"); putWorld(bx1 + 2, y, "bush") }
  }

  // Benches and lamps along the outside of the ring
  for (let x = rx0 + 6; x < rx1 - 4; x += 12) { putWorld(x, ry0 - 1, "bench"); putWorld(x + 2, ry0 - 1, "lampPost") }
  for (let y = ry0 + 6; y < ry1 - 4; y += 10) { putWorld(rx1 + 1, y, "lampPost"); putWorld(rx0 - 1, y, "lampPost") }

  // Trees and scatter outside the ring, deterministic
  let seed = 11
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280)
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (floor[y][x] !== "grass" || objects[y][x]) continue
      const outside = x < rx0 - 1 || x > rx1 + 1 || y < ry0 - 1 || y > ry1 + 1
      if (!outside) continue
      // keep a clear border around paths, deck and water
      let near = false
      for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) {
        const f = inMap(x + dx, y + dy) ? floor[y + dy][x + dx] : "grass"
        if (f !== "grass") { near = true; break }
      }
      const r = rnd()
      if (near) { if (r < 0.12) putWorld(x, y, "flowers"); continue }
      if (r < 0.13) putWorld(x, y, "pine")
      else if (r < 0.22) putWorld(x, y, "tree")
      else if (r < 0.27) putWorld(x, y, "bush")
      else if (r < 0.33) putWorld(x, y, "flowers")
      else if (r < 0.35) putWorld(x, y, "rock")
    }
  }
}

build()

// ───────── Live edits (build mode) ─────────

/** Tiles touched by a change, or "all" after a reset / area change that needs a full redraw. */
export type MapChange = { tiles: [number, number][]; areas: boolean; all: boolean }
const listeners = new Set<(c: MapChange) => void>()
export function onMapChange(fn: (c: MapChange) => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/** Restores the default office (before any build-mode edits). */
export function resetMap() {
  for (const row of floor) row.fill("grass")
  for (const row of objects) row.fill(null)
  areas.length = 0
  build()
}

export const isFloor = (f: unknown): f is Floor => typeof f === "string" && FLOOR_SET.has(f)
export const isObj = (o: unknown): o is Obj => typeof o === "string" && OBJ_SET.has(o)

/** Applies edits to the live map and notifies listeners. Unknown ids are ignored. */
export function applyOps(ops: MapOp[]) {
  const change: MapChange = { tiles: [], areas: false, all: false }
  for (const op of ops) {
    switch (op.k) {
      case "reset":
        resetMap()
        change.all = true
        change.areas = true
        break
      case "obj":
        if (!inMap(op.x, op.y) || (op.o !== null && !isObj(op.o))) break
        objects[op.y][op.x] = op.o
        change.tiles.push([op.x, op.y])
        break
      case "floor":
        if (!inMap(op.x, op.y) || !isFloor(op.f)) break
        floor[op.y][op.x] = op.f
        change.tiles.push([op.x, op.y])
        break
      case "area": {
        const i = areas.findIndex((a) => a.name === op.area.name)
        if (i >= 0) areas.splice(i, 1)
        areas.push({ ...op.area })
        change.areas = true
        break
      }
      case "areaDel": {
        const i = areas.findIndex((a) => a.name === op.name)
        if (i >= 0) areas.splice(i, 1)
        change.areas = true
        break
      }
    }
  }
  if (change.tiles.length || change.areas || change.all) for (const fn of listeners) fn(change)
}

/** The op that would undo `op` given the current map (call before applying it). */
export function inverseOf(op: MapOp): MapOp | null {
  switch (op.k) {
    case "obj":
      return inMap(op.x, op.y) ? { k: "obj", x: op.x, y: op.y, o: objects[op.y][op.x] } : null
    case "floor":
      return inMap(op.x, op.y) ? { k: "floor", x: op.x, y: op.y, f: floor[op.y][op.x] } : null
    case "area": {
      const prev = areas.find((a) => a.name === op.area.name)
      return prev ? { k: "area", area: { ...prev } } : { k: "areaDel", name: op.area.name }
    }
    case "areaDel": {
      const prev = areas.find((a) => a.name === op.name)
      return prev ? { k: "area", area: { ...prev } } : null
    }
    case "reset":
      return null
  }
}

/** Top-left tile of the multi-tile object covering (x,y), if any. */
export function objectOrigin(x: number, y: number): [number, number] | null {
  if (!inMap(x, y)) return null
  const o = objects[y][x]
  if (!o) return null
  const fp = FOOTPRINT[o]
  if (!fp) return [x, y]
  let ox = x, oy = y
  for (let i = 1; i < fp[0] && ox > 0 && objects[y][ox - 1] === o; i++) ox--
  for (let i = 1; i < fp[1] && oy > 0 && objects[oy - 1][ox] === o; i++) oy--
  return [ox, oy]
}

export const SPAWN = { x: OX + 19, y: OY + 32 }

export function isBlocked(x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return true
  const f = floor[y][x]
  if (f === "wall" || f === "water") return true
  const o = objects[y][x]
  return o !== null && BLOCKING.has(o)
}

let deskNameResolver: ((x: number, y: number) => string | null) | null = null
export function setDeskNameResolver(fn: (x: number, y: number) => string | null) {
  deskNameResolver = fn
}

export function areaAt(x: number, y: number): Area | null {
  for (const a of areas) {
    if (x >= a.x && x < a.x + a.w && y >= a.y && y < a.y + a.h) {
      if (deskNameResolver) {
        const custom = deskNameResolver(x, y)
        if (custom) return { ...a, name: custom }
      }
      return a
    }
  }
  return null
}

export const meetingRooms = () => areas.filter((a) => a.meeting)

/** Walkable tile at the centre of an area (used to walk into a room). */
export function areaCenter(a: Area): [number, number] | null {
  const cx = Math.floor(a.x + a.w / 2)
  const cy = Math.floor(a.y + a.h / 2)
  for (let r = 0; r < Math.max(a.w, a.h); r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = cx + dx
        const y = cy + dy
        if (areaAt(x, y) === a && !isBlocked(x, y)) return [x, y]
      }
    }
  }
  return null
}

/** BFS path from (sx,sy) to (tx,ty); returns steps excluding the start, or null. */
export function findPath(sx: number, sy: number, tx: number, ty: number): [number, number][] | null {
  if (isBlocked(tx, ty)) return null
  const key = (x: number, y: number) => y * MAP_W + x
  const prev = new Map<number, number>()
  const queue: number[] = [key(sx, sy)]
  let head = 0
  prev.set(key(sx, sy), -1)
  const target = key(tx, ty)
  while (head < queue.length) {
    const cur = queue[head++]
    if (cur === target) break
    const cx = cur % MAP_W
    const cy = Math.floor(cur / MAP_W)
    for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
      const nx = cx + dx
      const ny = cy + dy
      const k = key(nx, ny)
      if (!prev.has(k) && !isBlocked(nx, ny)) {
        prev.set(k, cur)
        queue.push(k)
      }
    }
  }
  if (!prev.has(target)) return null
  const out: [number, number][] = []
  for (let k = target; k !== key(sx, sy); k = prev.get(k)!) out.push([k % MAP_W, Math.floor(k / MAP_W)])
  return out.reverse()
}

/** Nearest walkable tile next to (x,y), used for "walk to person". */
export function walkableNeighbor(x: number, y: number): [number, number] | null {
  for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    if (!isBlocked(x + dx, y + dy)) return [x + dx, y + dy]
  }
  return null
}

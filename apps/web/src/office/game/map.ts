// Office map: tile grid with floor + object layers and named areas.
import type { MapOp } from "@/shared/protocol"

// A real-office layout: meeting rooms and focus booths along the top, open-plan
// division floors in the middle, hangout spaces + lobby along the bottom, all
// inside a garden with a terrace and a pond. Coordinates in build() are
// building-local; the building is 60 x 44 tiles.

export const TILE = 32
const BW = 60
const BH = 44
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

  // ───────── Top band: rooms (y 0..10) ─────────

  // Pantry
  room(0, 0, 13, 10, "kitchen", [[6, 10], [7, 10]], "hall")
  area({ name: "Pantry", x: 1, y: 1, w: 12, h: 9, private: false, label: true })
  put(1, 1, "fridge"); for (let x = 2; x <= 8; x++) put(x, 1, "counter"); put(9, 1, "coffee")
  put(11, 1, "plant"); put(12, 1, "vending"); put(1, 4, "waterCooler"); put(1, 9, "trash"); put(12, 9, "plantBig")
  for (const [tx, ty] of [[4, 5], [9, 5]]) {
    put(tx, ty, "roundTable"); put(tx + 1, ty, "roundTable"); put(tx, ty + 1, "roundTable"); put(tx + 1, ty + 1, "roundTable")
    put(tx, ty - 1, "chair"); put(tx + 1, ty - 1, "chair"); put(tx, ty + 2, "chairUp"); put(tx + 1, ty + 2, "chairUp")
    put(tx - 1, ty, "chairR"); put(tx + 2, ty + 1, "chairL")
  }
  put(3, 0, "wallWindow"); put(10, 0, "wallWindow")

  // Focus booths
  for (const [x0, i] of [[13, 1], [18, 2]] as const) {
    room(x0, 0, x0 + 5, 10, "lavender", [[x0 + 2, 10]], "hall")
    area({ name: `Focus Booth ${i}`, x: x0 + 1, y: 1, w: 4, h: 9, private: true })
    put(x0 + 2, 1, "deskMonitor"); put(x0 + 3, 1, "desk"); put(x0 + 2, 2, "officeChairUp")
    put(x0 + 1, 1, "lamp"); put(x0 + 4, 5, i === 1 ? "beanbag" : "beanbagPink"); put(x0 + 4, 9, "plant"); put(x0 + 1, 9, "bookshelf")
    put(x0 + 3, 0, "wallWindow")
  }

  // Meeting Room A (boardroom)
  room(23, 0, 35, 10, "slate", [[29, 10], [30, 10]], "hall")
  area({ name: "Meeting Room A", x: 24, y: 1, w: 11, h: 9, private: true, meeting: true })
  for (let x = 26; x <= 32; x++) { put(x, 4, "table"); put(x, 5, "table"); put(x, 6, "table"); put(x, 3, "chair"); put(x, 7, "chairUp") }
  put(25, 5, "chairR"); put(33, 5, "chairL")
  put(28, 1, "tv"); put(29, 1, "tv"); put(30, 1, "tv"); put(32, 1, "whiteboard"); put(33, 1, "whiteboard")
  put(24, 1, "plantBig"); put(34, 1, "cabinetPlant"); put(24, 9, "plant"); put(34, 9, "plant")
  put(26, 0, "wallWindow"); put(32, 0, "wallWindow")

  // Meeting Room B (huddle)
  room(35, 0, 45, 10, "carpet", [[40, 10]], "hall")
  area({ name: "Meeting Room B", x: 36, y: 1, w: 9, h: 9, private: true, meeting: true })
  put(39, 4, "roundTable"); put(40, 4, "roundTable"); put(39, 5, "roundTable"); put(40, 5, "roundTable")
  put(39, 3, "chair"); put(40, 3, "chair"); put(39, 6, "chairUp"); put(40, 6, "chairUp"); put(38, 4, "chairR"); put(41, 5, "chairL")
  put(37, 1, "whiteboard"); put(38, 1, "whiteboard"); put(43, 1, "bookshelf"); put(44, 1, "cabinetPlant")
  put(36, 9, "plant"); put(44, 9, "lamp"); put(40, 0, "wallWindow")

  // HR & Finance office
  room(45, 0, 59, 10, "wood", [[51, 10], [52, 10]], "hall")
  area({ name: "HR & Finance", x: 46, y: 1, w: 13, h: 9, private: true, label: true })
  deskRow(47, 2, 3); deskRow(54, 2, 3); deskRow(47, 6, 3); deskRow(54, 6, 3)
  put(46, 1, "cabinet"); put(58, 1, "bookshelf"); put(57, 1, "bookshelf"); put(46, 9, "plantBig"); put(58, 9, "printer")
  put(51, 4, "plant"); put(52, 4, "waterCooler")
  put(48, 0, "wallWindow"); put(55, 0, "wallWindow")

  // Corridor wall decor (faces of the top rooms, seen from the hallway)
  put(2, 10, "poster"); put(11, 10, "poster"); put(26, 10, "clock"); put(33, 10, "poster")
  put(43, 10, "poster"); put(48, 10, "painting"); put(49, 10, "painting"); put(56, 10, "poster")

  // ───────── Middle band: division floors (y 13..26) ─────────

  // Engineering
  fill(1, 13, 20, 26, "lavender")
  area({ name: "Engineering", x: 1, y: 13, w: 20, h: 14, private: false, label: true })
  for (const y of [14, 18, 22]) { deskRow(2, y, 7); deskRow(11, y, 7) }
  put(19, 14, "whiteboard"); put(20, 14, "whiteboard"); put(20, 17, "cabinetPlant"); put(20, 21, "cabinet")
  put(1, 26, "plantBig"); put(10, 26, "printer"); put(19, 26, "trash"); put(20, 26, "plant"); put(9, 13, "plant")

  // Design Studio
  fill(22, 13, 35, 26, "wood")
  area({ name: "Design Studio", x: 22, y: 13, w: 14, h: 14, private: false, label: true })
  deskRow(23, 14, 6); deskRow(30, 14, 5); deskRow(23, 18, 6); deskRow(30, 18, 5)
  put(30, 23, "whiteboard"); put(31, 23, "whiteboard"); put(32, 23, "whiteboard")
  fill(23, 22, 28, 26, "rugBlue")
  put(24, 24, "beanbag"); put(25, 24, "coffeeTable"); put(26, 24, "coffeeTable"); put(27, 24, "beanbagPink")
  put(24, 22, "sofa"); put(25, 22, "sofa"); put(26, 22, "sofa"); put(27, 22, "sofa")
  put(33, 25, "table"); put(34, 25, "table"); put(33, 24, "chair"); put(34, 26, "chairUp")
  put(22, 26, "plant"); put(35, 26, "plantBig"); put(35, 22, "lamp"); put(29, 26, "trash")

  // Marketing & Sales
  fill(37, 13, 58, 26, "carpet")
  area({ name: "Marketing & Sales", x: 37, y: 13, w: 22, h: 14, private: false, label: true })
  for (const y of [14, 18, 22]) { deskRow(38, y, 7); deskRow(47, y, 7) }
  put(56, 14, "tv"); put(57, 14, "tv"); put(56, 18, "whiteboard"); put(57, 18, "whiteboard")
  put(56, 22, "sofaUp"); put(57, 22, "sofaUp"); put(56, 20, "coffeeTable")
  put(37, 26, "plant"); put(58, 26, "plantBig"); put(55, 26, "printer"); put(46, 26, "trash"); put(58, 13, "plant")

  // Corridor planters between zones
  for (const [x, y] of [[21, 13], [21, 26], [36, 13], [36, 26], [1, 11], [58, 11], [1, 28], [58, 28]]) put(x, y, "plant")
  put(21, 20, "waterCooler"); put(36, 20, "plantBig")

  // ───────── Bottom band: hangouts + lobby (y 29..43) ─────────

  // Lounge (with a side door to the terrace)
  room(0, 29, 16, 43, "wood", [[7, 29], [8, 29], [9, 29], [0, 36], [0, 37]])
  area({ name: "Lounge", x: 1, y: 30, w: 15, h: 13, private: false, label: true })
  fill(9, 31, 15, 35, "rugWarm"); fill(1, 36, 6, 42, "rugBlue")
  for (let x = 1; x <= 4; x++) put(x, 30, "bookshelf")
  put(5, 30, "plantBig"); put(6, 30, "lamp")
  put(11, 30, "tv"); put(12, 30, "tv"); put(13, 30, "tv"); put(10, 30, "cabinet"); put(14, 30, "cabinet"); put(15, 30, "plant")
  for (let x = 10; x <= 14; x++) put(x, 34, "sofaUp")
  put(11, 32, "coffeeTable"); put(13, 32, "coffeeTable"); put(9, 32, "beanbag"); put(15, 32, "beanbagPink")
  for (let x = 2; x <= 5; x++) { put(x, 37, "sofa"); put(x, 41, "sofaUp") }
  put(3, 39, "coffeeTable"); put(4, 39, "coffeeTable"); put(1, 38, "chairR"); put(6, 40, "chairL"); put(1, 36, "lamp"); put(6, 36, "plantBig")
  put(10, 39, "pingpong"); put(11, 39, "pingpong"); put(9, 39, "stool"); put(12, 39, "stool")
  put(15, 37, "arcade"); put(15, 38, "arcade")
  put(15, 42, "plant"); put(1, 42, "plant"); put(8, 42, "trash"); put(13, 42, "plantBig"); put(10, 42, "waterCooler")
  put(4, 43, "wallWindow"); put(12, 43, "wallWindow"); put(2, 29, "poster"); put(13, 29, "clock")

  // Café
  room(16, 29, 31, 43, "wood", [[27, 29], [28, 29], [29, 29]])
  area({ name: "Café", x: 17, y: 30, w: 14, h: 13, private: false, label: true })
  put(17, 30, "whiteboard"); for (let x = 18; x <= 23; x++) put(x, 30, "counter")
  put(24, 30, "coffee"); put(25, 30, "coffee"); put(30, 31, "fridge"); put(30, 32, "vending")
  for (let x = 18; x <= 24; x += 2) put(x, 31, "stool")
  fill(18, 33, 28, 41, "rugWarm")
  for (const y of [34, 37, 40]) for (const x of [19, 23, 27]) cafeSet(x, y)
  put(17, 42, "plantBig"); put(30, 42, "plant"); put(30, 36, "trash"); put(17, 34, "plant"); put(17, 38, "plant")
  put(30, 39, "sofa"); put(30, 40, "plant"); put(22, 42, "plant"); put(26, 42, "plant"); put(26, 31, "stool")
  put(19, 29, "poster"); put(21, 29, "painting"); put(22, 29, "painting")
  put(20, 43, "wallWindow"); put(27, 43, "wallWindow")

  // Lobby & reception (main entrance on the bottom wall)
  room(31, 29, 41, 43, "marble", [[35, 29], [36, 29], [37, 29], [35, 43], [36, 43], [37, 43]])
  area({ name: "Lobby", x: 32, y: 30, w: 9, h: 13, private: false, label: true })
  for (let x = 34; x <= 38; x++) put(x, 33, x === 36 ? "desk" : "deskMonitor")
  put(35, 32, "officeChair"); put(37, 32, "officeChair")
  fill(33, 31, 39, 34, "rugBlue")
  put(32, 37, "sofa"); put(33, 37, "sofa"); put(32, 39, "coffeeTable"); put(33, 39, "plant")
  put(40, 37, "sofa"); put(39, 37, "sofa"); put(40, 39, "coffeeTable"); put(39, 39, "plant")
  put(32, 30, "plantBig"); put(40, 30, "plantBig"); put(32, 42, "plantBig"); put(40, 42, "plantBig"); put(32, 35, "waterCooler")
  put(34, 31, "bookshelf"); put(38, 31, "cabinetPlant"); put(40, 34, "lamp"); put(33, 42, "flowers"); put(39, 42, "flowers")
  put(39, 29, "painting"); put(40, 29, "painting"); put(32, 29, "poster")

  // Game Room
  room(41, 29, 50, 43, "game", [[45, 29], [46, 29]])
  area({ name: "Game Room", x: 42, y: 30, w: 8, h: 13, private: false, label: true })
  put(42, 30, "arcade"); put(43, 30, "arcade"); put(44, 30, "arcade"); put(48, 30, "tv"); put(49, 30, "tv")
  for (let x = 47; x <= 49; x++) put(x, 33, "sofaUp")
  fill(46, 31, 49, 34, "rugWarm")
  put(44, 36, "pingpong"); put(45, 36, "pingpong")
  put(42, 40, "beanbag"); put(44, 41, "beanbagPink"); put(43, 40, "coffeeTable"); put(49, 42, "vending"); put(47, 42, "plant"); put(42, 33, "lamp")
  put(48, 38, "pingpong"); put(49, 38, "pingpong"); put(42, 36, "stool"); put(47, 36, "stool"); put(48, 32, "coffeeTable")
  put(45, 43, "wallWindow")

  // Library / quiet room
  room(50, 29, 59, 43, "wood", [[54, 29], [55, 29]])
  area({ name: "Library", x: 51, y: 30, w: 8, h: 13, private: false, label: true })
  for (let x = 51; x <= 58; x++) if (x < 54 || x > 55) put(x, 30, "bookshelf")
  for (let x = 53; x <= 56; x++) { put(x, 35, "table"); put(x, 36, "table"); put(x, 34, "chair"); put(x, 37, "chairUp") }
  fill(52, 33, 57, 38, "rugBlue")
  put(51, 40, "beanbag"); put(52, 41, "lamp"); put(58, 40, "beanbagPink"); put(58, 42, "plantBig"); put(51, 33, "plant")
  put(54, 41, "sofaUp"); put(55, 41, "sofaUp"); put(54, 39, "coffeeTable"); put(58, 33, "cabinetPlant"); put(51, 42, "plant")
  put(54, 43, "wallWindow")

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

export const SPAWN = { x: OX + 36, y: OY + 37 }

export function isBlocked(x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return true
  const f = floor[y][x]
  if (f === "wall" || f === "water") return true
  const o = objects[y][x]
  return o !== null && BLOCKING.has(o)
}

export function areaAt(x: number, y: number): Area | null {
  for (const a of areas) {
    if (x >= a.x && x < a.x + a.w && y >= a.y && y < a.y + a.h) return a
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

// Office map: tile grid with floor + object layers and named areas.
import type { MapOp } from "@/shared/protocol"

import { OFFICE_ORIGIN, OFFICE_SIZE } from "./layout"
import { buildDefaultOffice } from "./defaultOffice"

export const TILE = 32
export const OX = OFFICE_ORIGIN.x
export const OY = OFFICE_ORIGIN.y
export const MAP_W = OX + OFFICE_SIZE.w + 8
export const MAP_H = OY + OFFICE_SIZE.h + 8

export const FLOORS = [
  "grass", "path", "wall", "hall", "lavender", "slate", "rug", "kitchen", "game",
  "wood", "carpet", "marble", "deck", "water", "rugWarm", "rugBlue", "stripe", "huddle", "diamond",
] as const
export type Floor = (typeof FLOORS)[number]

export const OBJS = [
  "blueSofaLeft", "cognacSofaLeft", "cognacSofaRight", "officeChairL", "officeChairR", "oakCoffeeRect",
  "flowerPink", "flowerBlue", "trailingShelf", "snakePlant", "monstera", "oakSideTable", "recycleStation", "snackVending", "landscapePoster", "airConditioner", "coatRack", "firstAid", "magazineRack",
  "furnishedDesk", "chartEasel", "studyShelf", "filingLaptop", "pantryUnit", "meetingRound",
  "desk", "deskMonitor", "chair", "chairUp", "plant", "plantBig", "sofa", "sofaUp", "table", "roundTable",
  "whiteboard", "counter", "fridge", "coffee", "bookshelf", "tv", "arcade", "beanbag", "beanbagPink", "lamp",
  "pine", "tree", "bush", "window", "printer", "chairL", "chairR", "officeChairUp", "officeChair", "painting",
  "cabinet", "cabinetPlant", "waterCooler", "flowers", "rock", "bench", "hedge", "lampPost", "wallWindow",
  "poster", "clock", "coffeeTable", "vending", "pingpong", "trash", "stool", "lily", "cafeTable", "parasol",
  "redChair", "redChairUp", "redChairL", "redChairR",
  "workDesk", "reception", "roundSmall", "fishTank", "displayShelf", "blueSofa", "blueSofaSide", "loungeTable",
  "beanbagPurple", "bamboo", "terracottaPlant", "sideTablePlant", "sideTableMug", "monitor", "laptop", "deskPhone", "notebooks", "blueSofaBack", "blueArmchairBack", "koiPond",
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
  "oakCoffeeRect",
  "flowerPink", "flowerBlue", "trailingShelf", "snakePlant", "monstera", "oakSideTable", "recycleStation", "snackVending", "landscapePoster", "airConditioner", "coatRack", "firstAid", "magazineRack",
  "furnishedDesk", "chartEasel", "studyShelf", "filingLaptop", "pantryUnit", "meetingRound",
  "desk", "deskMonitor", "plant", "plantBig", "table", "roundTable", "whiteboard",
  "counter", "fridge", "coffee", "bookshelf", "tv", "arcade", "lamp", "pine", "tree", "bush", "window", "printer",
  "painting", "cabinet", "cabinetPlant", "waterCooler", "rock", "hedge", "lampPost", "wallWindow",
  "poster", "clock", "coffeeTable", "vending", "pingpong", "trash", "cafeTable", "parasol",
  "workDesk", "reception", "roundSmall", "fishTank", "displayShelf", "loungeTable",
  "bamboo", "terracottaPlant", "sideTablePlant", "sideTableMug", "monitor", "laptop", "deskPhone", "notebooks", "koiPond",
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
  redChair: { dir: "down", lift: 7 },
  redChairUp: { dir: "up", lift: 9, frontFrom: 12 },
  redChairL: { dir: "left", lift: 7 },
  redChairR: { dir: "right", lift: 7 },
  blueSofa: { dir: "down", lift: 7 },
  blueSofaSide: { dir: "right", lift: 7 },
  blueSofaLeft: { dir: "left", lift: 7 },
  cognacSofaLeft: { dir: "left", lift: 7 },
  cognacSofaRight: { dir: "right", lift: 7 },
  officeChairL: { dir: "left", lift: 7 },
  officeChairR: { dir: "right", lift: 7 },
  sofa: { dir: "down", lift: 7 },
  sofaUp: { dir: "up", lift: 9, frontFrom: 18 },
  bench: { dir: "down", lift: 8 },
  stool: { dir: "any", lift: 9 },
  beanbag: { dir: "down", lift: 4 },
  beanbagPink: { dir: "down", lift: 4 },
  beanbagPurple: { dir: "down", lift: 4 },
  blueSofaBack: { dir: "up", lift: 9, frontFrom: 18 },
  blueArmchairBack: { dir: "up", lift: 9, frontFrom: 18 },
}
export function seatAt(x: number, y: number): Seat | null {
  if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return null
  const o = objects[y][x]
  return (o && SEATS[o]) ?? null
}

/** Objects that cover more than one tile, as [width, height] from the top-left tile. */
export const FOOTPRINT: Partial<Record<Obj, [number, number]>> = { blueSofaLeft:[1,3], cognacSofaLeft:[1,3], cognacSofaRight:[1,3], oakCoffeeRect:[2,1], blueSofaSide:[1,3], coffee:[2,1], flowerPink:[2,1],flowerBlue:[2,1],trailingShelf:[2,1],recycleStation:[2,1],airConditioner:[2,1], koiPond: [4, 4], furnishedDesk: [3, 1], studyShelf: [2, 1], pantryUnit: [3, 1], roundTable: [2, 2], pingpong: [2, 1], workDesk: [3, 1], reception: [4, 2], displayShelf: [3, 2], fishTank: [2, 2], roundSmall: [1, 1], loungeTable: [2, 1] }
/** Objects that hang on a wall tile instead of standing on the floor. */
export const WALL_DECOR: ReadonlySet<Obj> = new Set<Obj>(["painting", "poster", "clock", "wallWindow", "landscapePoster", "airConditioner", "firstAid"])
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
/** Places the complete footprint so collisions agree with the artwork. */
function furnish(x: number, y: number, o: Obj) {
  const [w, h] = FOOTPRINT[o] ?? [1, 1]
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) put(x + dx, y + dy, o)
}
const inMap = (x: number, y: number) => x >= 0 && y >= 0 && x < MAP_W && y < MAP_H
function build() {
  buildDefaultOffice({ fill, room, put, area, furnish })
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
  while (ox > 0 && objects[y][ox - 1] === o) ox--
  while (oy > 0 && objects[oy - 1][x] === o) oy--
  return [ox + Math.floor((x - ox) / fp[0]) * fp[0], oy + Math.floor((y - oy) / fp[1]) * fp[1]]
}

export const SPAWN = { x: OX + 16, y: OY + 30 }

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
        if (x >= a.x && x < a.x + a.w && y >= a.y && y < a.y + a.h && !isBlocked(x, y)) return [x, y]
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

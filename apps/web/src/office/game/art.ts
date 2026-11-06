// Procedural pixel art for the office and avatars (original to OPPERA).
// Everything is drawn pixel-exact (integer rects / row runs, no anti-aliased
// paths) so it stays crisp when Phaser scales it with pixelArt: true.
import { INK, SHADOW, blob, box, disc, ell, hash, line, obox, rect, tri, type Ctx } from "./pixel"
export { drawAvatar, randomLook, SKIN_TONES, HAIR_COLORS, SHIRT_COLORS, PANTS_COLORS, PALETTE } from "./avatar"
import { FOOTPRINT, MAP_H, MAP_W, OX, OY, TILE, floor, objects, type Floor, type Obj } from "./map"
import { doorFrame } from "./doorGeometry"
import { COURTYARD, MEDIA_ROOM, LAYOUT_DOORS } from "./layout"
import { drawDetailedObject } from "./sprites"
import { wallShape } from "./wallGeometry"

const T = TILE

// ───────────── Palette ─────────────

// wood
const W0 = "#e3a96e", W1 = "#c98a52", W2 = "#a8693a", W3 = "#7c4a2a"
// blue upholstery
const B0 = "#6fb2fb", B1 = "#3c8df0", B2 = "#2a6fd0", B3 = "#1f55a8"
// greys
const G0 = "#eef1f3", G1 = "#d3d9de", G2 = "#aeb7bf", G3 = "#838e98", G4 = "#5d6771"
// navy furniture
const N0 = "#566080", N1 = "#3f4763", N2 = "#2c3249"
// foliage
const L0 = "#a9e67a", L1 = "#66c24f", L2 = "#3f9a3e", L3 = "#2c7034", LINK = "#295c35"
// terracotta
const P0 = "#f39158", P1 = "#d8662f", P2 = "#9f4423"
const BOOKS = ["#e8907a", "#3fa6b8", "#d9a373", "#8a9ab8", "#e05a5a", "#f2c45f", "#56b98a", "#a98ad8", "#f1efe9"]

// ───────────── Floors (cached pattern tiles) ─────────────

const tileCache = new Map<string, HTMLCanvasElement>()
function rgb(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16)
  return [n >> 16, (n >> 8) & 255, n & 255]
}
function patternTile(key: string, fn: (x: number, y: number) => string): HTMLCanvasElement {
  const hit = tileCache.get(key)
  if (hit) return hit
  const c = document.createElement("canvas")
  c.width = T
  c.height = T
  const g = c.getContext("2d")!
  const img = g.createImageData(T, T)
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      const [r, gg, b] = rgb(fn(x, y))
      const i = (y * T + x) * 4
      img.data[i] = r; img.data[i + 1] = gg; img.data[i + 2] = b; img.data[i + 3] = 255
    }
  }
  g.putImageData(img, 0, 0)
  tileCache.set(key, c)
  return c
}

function floorTile(f: Exclude<Floor, "wall">, tx: number, ty: number): HTMLCanvasElement {
  switch (f) {
    case "stripe":
      return patternTile("stripe", (x, y) => {
        const band = Math.floor(x / 16) % 2
        return y % 8 === 0 ? (band ? "#9fadb0" : "#aab7b8") : band ? "#a6b3b5" : "#b5c1c1"
      })
    case "huddle":
      return patternTile("huddle", (x, y) => {
        const d = Math.abs(x % 16 - 8) + Math.abs(y % 16 - 8)
        return d === 5 || d === 6 ? "#c6cbd7" : d < 3 ? "#d3d7e0" : "#dfe1e9"
      })
    case "diamond":
      return patternTile("diamond", (x, y) => {
        const d = Math.abs(x - 16) + Math.abs(y - 16)
        return d === 14 || d === 16 || d === 18 ? "#cdd0dc" : "#edeaf1"
      })
    case "grass": {
      const v = Math.floor(hash(tx, ty) * 4)
      return patternTile(`grass${v}`, (x, y) => {
        const h = hash(x + v * 97, y + v * 31)
        // little "v" tufts
        const tuft = hash(Math.floor(x / 8) + v * 7, Math.floor(y / 8) + v * 3) > 0.985
        const lx = x % 8, ly = y % 8
        if (tuft && ly === 5 && (lx === 2 || lx === 4)) return "#b3daa5"
        if (tuft && ly === 4 && (lx === 1 || lx === 5)) return "#b3daa5"
        if (h > 0.998) return "#c6e5cb"
        return "#d7eedb"
      })
    }
    case "path":
      return patternTile(`path${(tx + ty) % 2}`, (x, y) => {
        const o = ((tx + ty) % 2) * 8
        const lx = (x + (Math.floor(y / 8) % 2 ? 8 : 0) + o) % 16, ly = y % 8
        if (ly === 7 || lx === 15) return "#cfc6b3"
        if (ly === 0 || lx === 0) return "#efe9dc"
        return "#e3dccb"
      })
    case "hall":
      return patternTile("hall", (x, y) => {
        const seam = (x + (Math.floor(y / 8) % 2) * 16) % 32
        if (y % 8 === 7 || seam === 31) return "#e3d4c0"
        if (y % 8 === 0) return "#f7eddf"
        return hash(x, y) > 0.96 ? "#ecdeca" : "#f1e4d2"
      })
    case "lavender":
      return patternTile("lavender", (x, y) => {
        const step = Math.abs(Math.floor(y / 8) - 2) * 8
        const band = (x + step) % 32
        return band < 16 ? "#a7addd" : "#939bce"
      })
    case "slate":
      return patternTile("slate", (x, y) => {
        // chevron carpet like a meeting-room rug
        const v = (y + Math.abs((x % 16) - 8)) % 16
        if (v < 2) return "#8b959a"
        if (v < 7) return "#a4adb1"
        return "#97a1a5"
      })
    case "rug":
      return patternTile("rug", (x, y) => {
        const a = (x + y) % 8, b = (x - y + 64) % 8
        if (a === 0 && b === 0) return "#a2adb1"
        if (a === 0) return "#97a3a7"
        if (b === 0) return "#869296"
        return "#8e9a9e"
      })
    case "kitchen":
      return patternTile("kitchen", (x, y) => {
        const lx = x % 16, ly = y % 16
        if (lx === 0 || ly === 0) return "#d8ddea"
        const d = Math.abs(lx - 8) + Math.abs(ly - 8)
        if (d === 4) return "#cfd6e6"
        if (d < 2) return "#c3cce0"
        return "#eceff6"
      })
    case "game":
      return patternTile("game", (x, y) => {
        const dark = ((x >> 4) + (y >> 4)) % 2
        const lx = x % 16, ly = y % 16
        if (lx === 0 || ly === 0) return "#4d5160"
        return dark ? "#575b6b" : "#5f6475"
      })
    case "wood":
      return patternTile(`wood${tx % 2}`, (x, y) => {
        // staggered parquet planks
        const col = Math.floor(x / 8)
        const ly = (y + ((col + tx) % 2) * 8) % 16
        if (x % 8 === 7) return "#b9814f"
        if (ly === 15) return "#be8653"
        if (ly === 0) return "#e2b17f"
        if (hash(x + tx * 3, y + col * 17) > 0.94) return "#cf9a66"
        return "#d8a674"
      })
    case "carpet":
      return patternTile("carpet", (x, y) => {
        const a = (x + y * 2) % 6, b = (x * 2 - y + 96) % 7
        if (a === 0 && b < 3) return "#94c4c4"
        if (b === 0) return "#79abac"
        return "#86b8b9"
      })
    case "marble":
      return patternTile(`marble${(tx + ty) % 3}`, (x, y) => {
        const v = (tx + ty) % 3
        if (x === 0 || y === 0) return "#dcd7cf"
        if (x === 31 || y === 31) return "#fbfaf7"
        const vein = Math.abs(((x + v * 9) * 0.6 + Math.sin((y + v * 5) / 4) * 3) % 23) < 0.8
        if (vein) return "#e3ded5"
        return "#f2efe9"
      })
    case "deck":
      return patternTile(`deck${tx % 3}`, (x, y) => {
        const ly = y % 8
        if (ly === 7) return "#8f5f37"
        const seam = ((tx % 3) * 11 + Math.floor(y / 8) * 13) % 32
        if (x === seam) return "#9d6b40"
        if ((x === seam + 2 || x === seam - 3) && (ly === 2 || ly === 5)) return "#7c4f2c"
        if (ly === 0) return "#d8a473"
        return "#c48f5c"
      })
    case "rugWarm":
      return patternTile("rugWarm", (x, y) => {
        const d = Math.abs((x % 16) - 8) + Math.abs((y % 16) - 8)
        if (d === 6) return "#e9b88a"
        if (d < 2) return "#f0c79c"
        if ((x + y) % 4 === 0) return "#d9845f"
        return "#de8f6a"
      })
    case "rugBlue":
      return patternTile("rugBlue", (x, y) => {
        const lx = x % 16, ly = y % 16
        if (lx === 8 || ly === 8) return "#8fa6e0"
        if (Math.abs(lx - 8) === Math.abs(ly - 8) && Math.abs(lx - 8) < 5) return "#9db3ea"
        if ((x + y) % 2 === 0) return "#6f88cc"
        return "#7690d2"
      })
    case "water":
      return patternTile(`water${(tx + ty) % 2}`, (x, y) => {
        const o = ((tx + ty) % 2) * 9
        const r = (x + o + Math.round(Math.sin((y + o) / 3) * 2)) % 16
        // Swimming orange & white koi fish on selected water tiles
        const hasKoi = (tx * 17 + ty * 31) % 5 === 1
        if (hasKoi) {
          const kx = x - 14, ky = y - 15
          if (kx * kx * 2 + ky * ky * 3 < 20) return (kx > 0 ? "#ea580c" : "#ffffff")
          if ((kx - 4) * (kx - 4) + ky * ky < 6) return "#ea580c"
        }
        if (y % 8 === 3 && r < 5) return "#a5f3fc"
        return "#38bdf8"
      })
  }
}

/** Rocky rim on water tiles that border land. */
function waterEdge(ctx: Ctx, x: number, y: number) {
  const px = x * T, py = y * T
  const land = (dx: number, dy: number) => {
    const nx = x + dx, ny = y + dy
    return nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H || floor[ny][nx] !== "water"
  }
  const stones = (sx: number, sy: number, horiz: boolean) => {
    for (let i = 0; i < 4; i++) {
      const ox = horiz ? i * 8 + 4 : 4
      const oy = horiz ? 4 : i * 8 + 4
      const r = 4 + Math.floor(hash(x * 4 + i, y * 9 + (horiz ? 1 : 2)) * 2)
      disc(ctx, sx + ox, sy + oy, r + 1, "#5d6670")
      disc(ctx, sx + ox, sy + oy, r, "#a9b2ba")
      disc(ctx, sx + ox - 1, sy + oy - 1, Math.max(1, r - 3), "#cfd6dc")
    }
  }
  if (land(0, -1)) stones(px, py - 2, true)
  if (land(0, 1)) { rect(ctx, px, py + 24, T, 2, "#5fa9cc"); stones(px, py + 26, true) }
  if (land(-1, 0)) stones(px - 2, py, false)
  if (land(1, 0)) stones(px + 26, py, false)
}

function isWall(x: number, y: number) {
  return x < 0 || y < 0 || x >= MAP_W || y >= MAP_H || floor[y][x] === "wall"
}

/** Ground under a cutaway corner belongs to its adjacent room or garden. */
function wallGround(x: number, y: number): Exclude<Floor,"wall"> {
  for (const dy of [0,1,-1,2,-2]) {
    const f=floor[y+dy]?.[x]
    if(f && f!=="wall") return f
  }
  return "grass"
}

function drawWall(ctx: Ctx, x: number, y: number) {
  const px = x * T, py = y * T
  const shape = wallShape(x,y,isWall,T)
  if (shape.hidden) return
  const { horizontal } = shape
  if (!horizontal) {
    // Side partitions are a narrow cutaway. Extend each room's own flooring
    // underneath its half, instead of leaving an entire dark tile-wide column.
    for (const [dx, offset] of [[-1, 0], [1, T / 2]] as const) {
      const surface = wallGround(x+dx,y)
      const tile = floorTile(surface, x + dx, y)
      ctx.drawImage(tile, offset, 0, T / 2, T, px + offset, py, T / 2, T)
    }
    rect(ctx, px + T / 2 - 3, py, 6, T, "#85978b")
    rect(ctx, px + T / 2 - 3, py, 1, T, "#bcc9b5")
    rect(ctx, px + T / 2 + 2, py, 1, T, "#5c746d")
    rect(ctx, px + T / 2 + 3, py, 2, T, "rgba(42,60,55,0.12)")
    return
  }
  const face = !isWall(x, y + 1)

  // A continuous muted green back wall, with a thin rim rather than dark blocks.
  const { start, end, topEdge, rise } = shape
  const wallX = px + start, wallW = end - start
  const plaster = patternTile("wall-plaster", (tx,ty) => {
    const grain=hash(tx+41,ty+73)
    return grain > 0.965 ? "#7b8f8a" : grain < 0.035 ? "#728681" : "#768a86"
  })
  for (let offset=0;offset<T+rise;offset+=T) {
    const height=Math.min(T,T+rise-offset)
    ctx.drawImage(plaster,start,0,wallW,height,wallX,py-rise+offset,wallW,height)
  }
  if (topEdge) {
    rect(ctx, wallX, py - rise, wallW, 1, "#d0d8c9")
    rect(ctx, wallX, py - rise + 1, wallW, 2, "#afbfaf")
    rect(ctx, wallX, py - rise + 3, wallW, 1, "#5c746d")
  }
  if (face) {
    rect(ctx, wallX, py + T - 4, wallW, 1, "#a0b1a4")
    rect(ctx, wallX, py + T - 3, wallW, 3, "#566f69")
  }
}

function drawFloor(ctx: Ctx, f: Floor, x: number, y: number) {
  if (f === "wall") {
    // Paint beneath every wall row, including hidden rows of stacked facades.
    // Trimming a corner must expose real flooring rather than a transparent hole.
    for(const [dx,offset] of [[-1,0],[1,T/2]] as const) {
      ctx.drawImage(floorTile(wallGround(x+dx,y),x,y),offset,0,T/2,T,x*T+offset,y*T,T/2,T)
    }
    return
  }
  ctx.drawImage(floorTile(f, x, y), x * T, y * T)
  if (f === "rugWarm" || f === "rugBlue") {
    // woven border + fringe on the rug's outer edges
    const edge = f === "rugWarm" ? "#a8533a" : "#3f5596"
    const band = f === "rugWarm" ? "#f3d3a8" : "#d7e0f6"
    const px = x * T, py = y * T
    const o = (dx: number, dy: number) => {
      const nx = x + dx, ny = y + dy
      return nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H || floor[ny][nx] !== f
    }
    if (o(0, -1)) { rect(ctx, px, py, T, 3, edge); rect(ctx, px, py + 4, T, 1, band) }
    if (o(0, 1)) { rect(ctx, px, py + T - 3, T, 3, edge); rect(ctx, px, py + T - 5, T, 1, band) }
    if (o(-1, 0)) { rect(ctx, px, py, 3, T, edge); rect(ctx, px + 4, py, 1, T, band); for (let i = 1; i < T; i += 3) rect(ctx, px - 1, py + i, 1, 1, band) }
    if (o(1, 0)) { rect(ctx, px + T - 3, py, 3, T, edge); rect(ctx, px + T - 5, py, 1, T, band); for (let i = 1; i < T; i += 3) rect(ctx, px + T, py + i, 1, 1, band) }
  }
  // soft contact shadow under walls
  if (isWall(x, y - 1)) rect(ctx, x * T, y * T, T, 3, "rgba(40,48,60,0.12)")
  // thin trim where two different indoor floors meet, like a rug edge
  const indoor = f !== "grass" && f !== "path" && f !== "deck" && f !== "water"
  if (indoor && y > 0) {
    const up = floor[y - 1][x]
    if (up !== f && up !== "wall" && up !== "grass") rect(ctx, x * T, y * T, T, 1, "rgba(40,48,60,0.18)")
  }
  if (indoor && x > 0) {
    const lf = floor[y][x - 1]
    if (lf !== f && lf !== "wall" && lf !== "grass") rect(ctx, x * T, y * T, 1, T, "rgba(40,48,60,0.18)")
  }
}

// ───────────── Objects ─────────────

// Neighbour lookups read this grid; palette thumbnails swap in a tiny scratch grid.
let grid: (Obj | null)[][] = objects
const same = (x: number, y: number, o: Obj | Obj[]) => {
  if (y < 0 || y >= grid.length || x < 0 || x >= grid[0].length) return false
  const v = grid[y][x]
  return Array.isArray(o) ? !!v && o.includes(v) : v === o
}
const shadow = (ctx: Ctx, cx: number, cy: number, rx: number, ry: number) => ell(ctx, cx, cy, rx, ry, SHADOW)

function woodChairFront(ctx: Ctx, px: number, py: number) {
  // seat faces the viewer; backrest at the top
  shadow(ctx, px + 16, py + 28, 10, 3)
  rect(ctx, px + 8, py + 20, 2, 8, W3); rect(ctx, px + 22, py + 20, 2, 8, W3)
  rect(ctx, px + 8, py + 4, 2, 16, W2); rect(ctx, px + 22, py + 4, 2, 16, W2)
  obox(ctx, px + 8, py + 1, 16, 9, B1)
  rect(ctx, px + 10, py + 2, 12, 2, B0); rect(ctx, px + 9, py + 8, 14, 1, B2)
  obox(ctx, px + 7, py + 11, 18, 10, B1)
  rect(ctx, px + 9, py + 12, 14, 2, B0); rect(ctx, px + 8, py + 18, 16, 2, B2)
  rect(ctx, px + 7, py + 20, 18, 2, W2); rect(ctx, px + 7, py + 20, 18, 1, W1)
}
function woodChairBack(ctx: Ctx, px: number, py: number) {
  // seen from behind (sits below a table)
  shadow(ctx, px + 16, py + 28, 10, 3)
  obox(ctx, px + 7, py + 3, 18, 9, B1)
  rect(ctx, px + 9, py + 4, 14, 2, B0)
  rect(ctx, px + 8, py + 12, 2, 16, W2); rect(ctx, px + 22, py + 12, 2, 16, W2)
  rect(ctx, px + 8, py + 12, 1, 16, W1); rect(ctx, px + 22, py + 12, 1, 16, W1)
  obox(ctx, px + 7, py + 12, 18, 10, B2)
  rect(ctx, px + 9, py + 13, 14, 2, B1); rect(ctx, px + 8, py + 20, 16, 1, B3)
  rect(ctx, px + 9, py + 23, 14, 2, W2)
}
function woodChairSide(ctx: Ctx, px: number, py: number, facingRight: boolean) {
  const X = (x: number, w: number) => (facingRight ? px + x : px + T - x - w)
  shadow(ctx, px + 16, py + 28, 9, 3)
  rect(ctx, X(9, 2), py + 20, 2, 8, W3); rect(ctx, X(21, 2), py + 20, 2, 8, W3)
  // backrest on the side the chair faces away from
  rect(ctx, X(7, 2), py + 5, 2, 16, W2)
  obox(ctx, X(7, 7), py + 3, 7, 15, B1)
  rect(ctx, X(8, 2), py + 4, 2, 11, B0)
  obox(ctx, X(8, 17), py + 13, 17, 8, B1)
  rect(ctx, X(10, 13), py + 14, 13, 2, B0)
  rect(ctx, X(8, 17), py + 20, 17, 2, W2); rect(ctx, X(8, 17), py + 20, 17, 1, W1)
}

// ── Executive Red Conference Chairs (Photo 2 Reference) ──
function redChairFront(ctx: Ctx, px: number, py: number) {
  shadow(ctx, px + 16, py + 28, 10, 3)
  // Swivel base
  rect(ctx, px + 15, py + 20, 2, 6, "#334155")
  rect(ctx, px + 9, py + 26, 14, 2, "#1e293b")
  rect(ctx, px + 8, py + 27, 2, 2, "#0f172a"); rect(ctx, px + 22, py + 27, 2, 2, "#0f172a")
  // Curved vibrant red backrest with headrest
  obox(ctx, px + 7, py + 1, 18, 9, "#ef4444")
  rect(ctx, px + 9, py + 2, 14, 2, "#f87171")
  rect(ctx, px + 8, py + 8, 16, 1, "#b91c1c")
  // Red seat cushion
  obox(ctx, px + 6, py + 11, 20, 10, "#ef4444")
  rect(ctx, px + 8, py + 12, 16, 2, "#f87171")
  rect(ctx, px + 7, py + 18, 18, 2, "#b91c1c")
  // Armrests
  rect(ctx, px + 4, py + 10, 2, 8, "#1e293b"); rect(ctx, px + 26, py + 10, 2, 8, "#1e293b")
}

function redChairBack(ctx: Ctx, px: number, py: number) {
  shadow(ctx, px + 16, py + 28, 10, 3)
  // Swivel base
  rect(ctx, px + 15, py + 22, 2, 5, "#334155")
  rect(ctx, px + 9, py + 26, 14, 2, "#1e293b")
  rect(ctx, px + 8, py + 27, 2, 2, "#0f172a"); rect(ctx, px + 22, py + 27, 2, 2, "#0f172a")
  // Red backrest rear shell
  obox(ctx, px + 6, py + 2, 20, 10, "#dc2626")
  rect(ctx, px + 8, py + 3, 16, 2, "#ef4444")
  rect(ctx, px + 15, py + 12, 2, 10, "#1e293b")
  obox(ctx, px + 7, py + 12, 18, 9, "#b91c1c")
  rect(ctx, px + 9, py + 13, 14, 2, "#dc2626")
  // Armrests
  rect(ctx, px + 4, py + 10, 2, 8, "#1e293b"); rect(ctx, px + 26, py + 10, 2, 8, "#1e293b")
}

function redChairSide(ctx: Ctx, px: number, py: number, facingRight: boolean) {
  const X = (x: number, w: number) => (facingRight ? px + x : px + T - x - w)
  shadow(ctx, px + 16, py + 28, 9, 3)
  rect(ctx, X(15, 2), py + 21, 2, 6, "#334155")
  rect(ctx, X(9, 14), py + 26, 14, 2, "#1e293b")
  // Red backrest profile
  obox(ctx, X(6, 6), py + 2, 6, 17, "#ef4444")
  rect(ctx, X(7, 2), py + 3, 2, 14, "#f87171")
  // Red seat cushion profile
  obox(ctx, X(8, 17), py + 12, 17, 8, "#ef4444")
  rect(ctx, X(10, 13), py + 13, 13, 2, "#f87171")
  rect(ctx, X(8, 17), py + 18, 17, 2, "#b91c1c")
  // Armrest
  rect(ctx, X(10, 10), py + 9, 10, 2, "#1e293b")
  rect(ctx, X(14, 2), py + 11, 2, 5, "#1e293b")
}
function officeChairBack(ctx: Ctx, px: number, py: number) {
  // 2.5D ergonomic mesh executive chair
  shadow(ctx, px + 16, py + 28, 10, 3)
  rect(ctx, px + 15, py + 23, 2, 4, "#334155")
  rect(ctx, px + 9, py + 26, 14, 2, "#334155")
  rect(ctx, px + 8, py + 27, 2, 2, "#0f172a"); rect(ctx, px + 22, py + 27, 2, 2, "#0f172a"); rect(ctx, px + 15, py + 27, 2, 2, "#0f172a")
  // Curved mesh backrest
  obox(ctx, px + 7, py + 4, 18, 8, "#1e293b")
  rect(ctx, px + 9, py + 5, 14, 6, "#334155")
  rect(ctx, px + 10, py + 6, 12, 1, "#64748b")
  // Lumbar spine support
  obox(ctx, px + 8, py + 11, 16, 11, "#1e293b")
  rect(ctx, px + 10, py + 12, 12, 2, "#475569")
  rect(ctx, px + 10, py + 19, 12, 2, "#0f172a")
  // Armrests
  rect(ctx, px + 5, py + 11, 3, 8, "#0f172a"); rect(ctx, px + 24, py + 11, 3, 8, "#0f172a")
}

function pottedPlant(ctx: Ctx, px: number, py: number, big: boolean) {
  shadow(ctx, px + 16, py + 29, 9, 3)
  // pot
  obox(ctx, px + 10, py + 19, 12, 10, P1)
  rect(ctx, px + 11, py + 20, 2, 7, P0)
  rect(ctx, px + 19, py + 20, 2, 8, P2)
  box(ctx, px + 9, py + 17, 14, 4, P0)
  rect(ctx, px + 10, py + 18, 12, 1, "#f8b282")
  if (big) {
    rect(ctx, px + 15, py + 2, 2, 16, L3)
    blob(ctx, px, py, [[16, -6, 6], [10, 0, 6], [22, 1, 6], [11, 9, 5], [21, 10, 5], [16, 4, 5]], L1, LINK, L0, L2)
  } else {
    blob(ctx, px, py, [[16, 9, 5], [10, 12, 4], [22, 12, 4], [13, 5, 4], [20, 5, 4]], L1, LINK, L0, L2)
    // pointed leaf tips
    rect(ctx, px + 15, py - 1, 2, 3, LINK); rect(ctx, px + 15, py, 2, 2, L1)
    rect(ctx, px + 6, py + 8, 2, 2, LINK); rect(ctx, px + 25, py + 8, 2, 2, LINK)
  }
}

function painting(ctx: Ctx, x: number, y: number) {
  if (same(x - 1, y, "painting")) return
  let n = 1
  while (same(x + n, y, "painting")) n++
  const px = x * T, py = y * T
  const x0 = px + 3, w = n * T - 6, y0 = py + 3, h = 25
  box(ctx, x0 - 1, y0 - 1, w + 2, h + 2, "#2a3046", "#2a3046")
  rect(ctx, x0 + 1, y0 + 1, w - 2, h - 2, "#f7f6f1")
  // abstract grid composition, deterministic per position
  const cols = [0, Math.round(w * 0.18), Math.round(w * 0.62), w - 2]
  const rows = [0, Math.round(h * 0.42), Math.round(h * 0.72), h - 2]
  const fills = ["#e04848", "#f6cf45", "#3d5fc4", "#f7f6f1", "#f7f6f1"]
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const k = Math.floor(hash(x * 5 + c, y * 3 + r) * fills.length)
      const color = r === 0 && c === 1 ? "#e04848" : fills[k]
      rect(ctx, x0 + 1 + cols[c], y0 + 1 + rows[r], cols[c + 1] - cols[c], rows[r + 1] - rows[r], color)
    }
  }
  for (const c of cols.slice(1, 3)) rect(ctx, x0 + 1 + c, y0 + 1, 2, h - 2, "#2a3046")
  for (const r of rows.slice(1, 3)) rect(ctx, x0 + 1, y0 + 1 + r, w - 2, 2, "#2a3046")
}

function drawObject(ctx: Ctx, o: Obj, x: number, y: number) {
  if (drawDetailedObject(ctx, o, x, y, grid)) return
  const px = x * T
  const py = y * T
  switch (o) {
    case "workDesk":
    case "reception": {
      let startX = x, startY = y
      while (same(startX - 1, y, o)) startX--
      while (same(x, startY - 1, o)) startY--
        const [fw, fh] = FOOTPRINT[o] ?? [1, 1]
        if ((x - startX) % fw || (y - startY) % fh) break
        const w = fw * T, h = fh * T
      shadow(ctx, px + w / 2, py + h - 3, w / 2 - 5, 4)
      if (o === "reception") {
        obox(ctx, px + 2, py + 8, w - 4, h - 12, "#a6b0c0", "#75839a")
        obox(ctx, px + 2, py + 2, w - 4, h - 19, "#f5f7fa", "#8e9bae")
        rect(ctx, px + 8, py + 4, w - 16, 3, "#ffffff")
        rect(ctx, px + 9, py + h - 12, w - 18, 2, "#c4cbd6")
        for (const dx of [74, 88]) {
          obox(ctx, px + dx, py + 11, 10, 13, "#ffffff", "#9aa8b9")
          rect(ctx, px + dx + 2, py + 13, 6, 2, "#d7dfeb")
        }
      } else {
        rect(ctx, px + 8, py + h - 18, 4, 15, "#657084")
        rect(ctx, px + w - 12, py + h - 18, 4, 15, "#657084")
        box(ctx, px + 1, py + 1, w - 2, h - 14, "#f5f5fc", "#8d91b5")
        rect(ctx, px + 2, py + 2, w - 4, 3, "#ffffff")
        rect(ctx, px + 2, py + h - 21, w - 4, 6, "#d1d3e6")
        rect(ctx, px + 2, py + h - 15, w - 4, 2, "#969bb6")
      }
      break
    }
    case "displayShelf": {
      if (same(x - 1, y, o) || same(x, y - 1, o)) break
      const w = 5 * T
      box(ctx, px + 2, py - 10, w - 4, 3 * T + 8, "#e5ebec", "#6d7e8c")
      rect(ctx, px + 4, py - 8, w - 8, 3, "#ffffff")
      for (let row = 0; row < 4; row++) for (let col = 0; col < 6; col++) {
        const sx = px + 6 + col * 25, sy = py - 2 + row * 25
        box(ctx, sx, sy, 22, 22, "#78958e", "#aebfc4")
        if ((row + col) % 3 === 0) {
          obox(ctx, sx + 5, sy + 6, 7, 8, "#f4e6c8")
          blob(ctx, sx, sy, [[8, 4, 4]], L1, LINK, L0)
        } else {
          for (let i = 0; i < 3; i++) rect(ctx, sx + 3 + i * 4, sy + 4 + i % 2, 3, 9, BOOKS[(col * 3 + row + i) % BOOKS.length])
        }
      }
      break
    }
    case "fishTank": {
      if (same(x - 1, y, o) || same(x, y - 1, o)) break
      obox(ctx, px + 2, py, 60, 61, "#3d526a")
      box(ctx, px + 5, py + 4, 54, 38, "#59bada", "#8caabb")
      rect(ctx, px + 7, py + 6, 50, 5, "#c3f3ff")
      rect(ctx, px + 7, py + 35, 50, 5, "#ccb98c")
      for (const dx of [12, 39, 47]) {
        rect(ctx, px + dx, py + 23, 2, 14, "#3f9a67")
        rect(ctx, px + dx - 3, py + 28, 8, 2, "#64c485")
      }
      ell(ctx, px + 23, py + 20, 5, 3, "#ffc35a")
      tri(ctx, px + 30, py + 18, 5, 3, "#f18c43")
      rect(ctx, px + 7, py + 47, 50, 1, "#72859c")
      rect(ctx, px + 30, py + 48, 1, 10, "#28394f")
      break
    }
    case "loungeTable": {
      if (same(x - 1, y, o) || same(x, y - 1, o)) break
      shadow(ctx, px + 64, py + 89, 51, 5)
      rect(ctx, px + 59, py + 52, 10, 34, W3)
      ell(ctx, px + 64, py + 46, 59, 34, W3)
      ell(ctx, px + 64, py + 41, 59, 32, W0)
      ell(ctx, px + 59, py + 36, 45, 22, "#e6b47a")
      obox(ctx, px + 28, py + 25, 12, 15, "#ffffff", W2)
      rect(ctx, px + 30, py + 27, 8, 3, "#805239")
      break
    }
    case "roundSmall":
      if (same(x - 1, y, o) || same(x, y - 1, o)) break
      shadow(ctx, px + 32, py + 57, 21, 4)
      rect(ctx, px + 28, py + 30, 8, 26, "#7b879a")
      ell(ctx, px + 32, py + 25, 25, 18, "#67798f")
      ell(ctx, px + 32, py + 21, 24, 16, "#dce4eb")
      ell(ctx, px + 28, py + 17, 12, 5, "#f4f7fa")
      break
    case "blueSofaSide":
      shadow(ctx, px + 16, py + 28, 13, 3)
      obox(ctx, px + 3, py + 2, 26, 27, B2)
      rect(ctx, px + 4, py + 3, 7, 24, B0)
      box(ctx, px + 11, py + 4, 16, 22, B1, B3)
      rect(ctx, px + 13, py + 5, 12, 2, B0)
      break
    case "desk":
    case "deskMonitor": {
      const kinds: Obj[] = ["desk", "deskMonitor"]
      const l = same(x - 1, y, kinds), r = same(x + 1, y, kinds)
      const x0 = px + (l ? 0 : 1), w = T - (l ? 0 : 1) - (r ? 0 : 1)
      if (!l) rect(ctx, px + 2, py + 22, 2, 8, G4)
      if (!r) rect(ctx, px + T - 4, py + 22, 2, 8, G4)
      // 2.5D modern desk: crisp white top surface + 10px vertical front modesty/drawer panel
      shadow(ctx, px + 16, py + 28, 15, 2)
      rect(ctx, x0, py + 3, w, 15, "#1e293b")
      const ix = x0 + (l ? 0 : 1), iw = w - (l ? 0 : 1) - (r ? 0 : 1)
      rect(ctx, ix, py + 4, iw, 13, "#ffffff")
      rect(ctx, ix, py + 4, iw, 2, "#f8fafc")
      // Front vertical 3D face (modesty panel + drawers)
      rect(ctx, x0, py + 18, w, 9, "#1e293b")
      rect(ctx, ix, py + 18, iw, 8, "#cbd5e1")
      // Horizontal drawer seam
      rect(ctx, ix, py + 22, iw, 1, "#94a3b8")
      // Metallic chrome bar handles
      if (iw >= 14) {
        rect(ctx, ix + 4, py + 20, Math.min(10, iw - 8), 1, "#64748b")
        rect(ctx, ix + 4, py + 19, Math.min(10, iw - 8), 1, "#ffffff")
        rect(ctx, ix + 4, py + 24, Math.min(10, iw - 8), 1, "#64748b")
        rect(ctx, ix + 4, py + 23, Math.min(10, iw - 8), 1, "#ffffff")
      }
      const v = Math.floor(hash(x * 7, y * 3) * 4)
      if (o === "deskMonitor") {
        const screens = ["#6fb4ef", "#7fd6a8", "#f3b46b", "#b49af0"]
        const scr = screens[Math.floor(hash(x, y * 11) * screens.length)]
        if (v === 3) {
          // laptop
          obox(ctx, px + 8, py - 1, 16, 11, "#2b3042")
          rect(ctx, px + 10, py + 1, 12, 7, scr)
          rect(ctx, px + 10, py + 1, 12, 1, "#ffffff")
          obox(ctx, px + 7, py + 9, 18, 6, G2)
          rect(ctx, px + 9, py + 10, 14, 3, G1)
        } else {
          obox(ctx, px + 6, py - 5, 20, 14, "#2b3042")
          rect(ctx, px + 8, py - 3, 16, 9, scr)
          rect(ctx, px + 8, py - 3, 16, 2, "rgba(255,255,255,0.45)")
          rect(ctx, px + 10, py + 1, 7, 1, "rgba(0,0,0,0.25)"); rect(ctx, px + 10, py + 3, 10, 1, "rgba(0,0,0,0.25)")
          rect(ctx, px + 14, py + 9, 4, 3, "#2b3042")
          obox(ctx, px + 8, py + 12, 14, 4, G1)
          rect(ctx, px + 9, py + 13, 12, 1, "#ffffff")
          obox(ctx, px + 24, py + 12, 4, 5, G1)
        }
        if (v === 1) { obox(ctx, px + 1, py + 8, 5, 6, "#ffffff"); rect(ctx, px + 2, py + 9, 3, 1, "#7a4a2a") }
        if (v === 2) { rect(ctx, px + 1, py + 9, 5, 5, P1); blob(ctx, px, py, [[3, 6, 3]], L1, LINK, L0) }
      } else if (v === 0 || v === 1) {
        // papers + mug
        box(ctx, px + 5, py + 7, 10, 8, "#ffffff", G2)
        rect(ctx, px + 7, py + 9, 6, 1, G2); rect(ctx, px + 7, py + 11, 4, 1, G2)
        obox(ctx, px + 20, py + 8, 6, 7, v ? "#e05a5a" : "#f2c45f")
        rect(ctx, px + 21, py + 9, 4, 1, "#7a4a2a")
      } else if (v === 2) {
        // small plant + notebook
        rect(ctx, px + 20, py + 9, 7, 6, P1); rect(ctx, px + 20, py + 9, 7, 1, P0)
        blob(ctx, px, py, [[23, 5, 4], [20, 7, 3], [26, 7, 3]], L1, LINK, L0)
        obox(ctx, px + 4, py + 7, 11, 9, "#4c7ef0"); rect(ctx, px + 6, py + 8, 1, 7, "#2f5bb8")
      } else {
        // desk lamp + books
        rect(ctx, px + 7, py + 12, 8, 2, G4); rect(ctx, px + 10, py + 4, 2, 8, G4)
        tri(ctx, px + 13, py + 1, 5, 4, "#f2c45f")
        rect(ctx, px + 19, py + 11, 9, 3, "#e05a5a"); rect(ctx, px + 20, py + 8, 8, 3, "#3fa6b8")
      }
      break
    }
    case "chair": woodChairFront(ctx, px, py); break
    case "chairUp": woodChairBack(ctx, px, py); break
    case "chairL": woodChairSide(ctx, px, py, false); break
    case "chairR": woodChairSide(ctx, px, py, true); break
    case "redChair": redChairFront(ctx, px, py); break
    case "redChairUp": redChairBack(ctx, px, py); break
    case "redChairL": redChairSide(ctx, px, py, false); break
    case "redChairR": redChairSide(ctx, px, py, true); break
    case "officeChairUp": officeChairBack(ctx, px, py); break
    case "plant": pottedPlant(ctx, px, py, false); break
    case "plantBig": pottedPlant(ctx, px, py, true); break
    case "blueSofa":
    case "sofa":
    case "sofaUp": {
      const up = o === "sofaUp"
      const l = same(x - 1, y, o), r = same(x + 1, y, o)
      const [S0, S1, S2, S3] = o === "blueSofa" ? [B0, B1, B2, B3] : ["#dc9e6c", "#c27c4c", "#9e5d35", "#7a4426"]
      const x0 = px + (l ? 0 : 2), w = T - (l ? 0 : 2) - (r ? 0 : 2)
      shadow(ctx, px + 16, py + 29, 16, 3)
      rect(ctx, x0, py + 4, w, 25, INK)
      const ix = x0 + (l ? 0 : 1), iw = w - (l ? 0 : 1) - (r ? 0 : 1)
      rect(ctx, ix, py + 5, iw, 23, S2)
      // backrest: a rolled top edge on the far side
      const by = up ? py + 18 : py + 5
      rect(ctx, ix, by, iw, 10, S2)
      rect(ctx, ix, up ? by + 7 : by, iw, 2, S1)
      rect(ctx, ix, up ? by + 9 : by + 9, iw, 1, S3)
      // seat cushion (one per tile) with a seam and highlight
      const sy = up ? py + 5 : py + 15
      const cx0 = px + (l ? 1 : 6), cx1 = px + T - (r ? 1 : 6)
      obox(ctx, cx0, sy, cx1 - cx0, 12, S1, S3)
      rect(ctx, cx0 + 2, sy + 1, cx1 - cx0 - 4, 2, S0)
      rect(ctx, cx0 + 1, sy + 10, cx1 - cx0 - 2, 1, S2)
      // armrests
      if (!l) { obox(ctx, x0 + 1, py + 5, 6, 22, S1, S3); rect(ctx, x0 + 2, py + 6, 4, 2, S0) }
      if (!r) { obox(ctx, x0 + w - 7, py + 5, 6, 22, S2, S3); rect(ctx, x0 + w - 6, py + 6, 4, 2, S1) }
      // throw pillow on some seats
      if (hash(x, y) > 0.7) obox(ctx, px + 12, up ? sy + 2 : sy - 3, 8, 6, "#f2c45f", S3)
      break
    }
    case "table": {
      const l = same(x - 1, y, "table"), r = same(x + 1, y, "table")
      const u = same(x, y - 1, "table"), d = same(x, y + 1, "table")
      const x0 = px + (l ? 0 : 2), y0 = py + (u ? 0 : 3)
      const w = T - (l ? 0 : 2) - (r ? 0 : 2), h = T - (u ? 0 : 3) - (d ? 0 : 4)
      if (!d) shadow(ctx, px + 16, py + 30, 15, 2)
      rect(ctx, x0, y0, w, h, INK)
      const ix = x0 + (l ? 0 : 1), iy = y0 + (u ? 0 : 1)
      const iw = w - (l ? 0 : 1) - (r ? 0 : 1), ih = h - (u ? 0 : 1) - (d ? 0 : 1)

      const isExecutive = x >= OX + MEDIA_ROOM.x && x < OX + MEDIA_ROOM.x + MEDIA_ROOM.w && y >= OY + MEDIA_ROOM.y && y < OY + MEDIA_ROOM.y + MEDIA_ROOM.h
      if (isExecutive) {
        // Glossy White Executive Conference Table (Photo 2 Reference)
        rect(ctx, ix, iy, iw, ih, "#f8fafc")
        if (!u) rect(ctx, ix, iy, iw, 2, "#ffffff")
        if (!d) { rect(ctx, ix, iy + ih - 4, iw, 4, "#cbd5e1"); rect(ctx, ix, iy + ih - 1, iw, 1, "#94a3b8") }
        // Laptops & workspace tech on table
        if (!d && u) {
          // Open laptop with lit glowing code screen
          obox(ctx, px + 6, py + 4, 11, 8, "#1e293b")
          rect(ctx, px + 7, py + 5, 9, 6, "#0284c7")
          rect(ctx, px + 8, py + 6, 7, 1, "#38bdf8")
          rect(ctx, px + 5, py + 11, 13, 2, "#94a3b8")
          // Paper notes + pen
          rect(ctx, px + 21, py + 6, 7, 9, "#ffffff")
          rect(ctx, px + 22, py + 8, 5, 1, "#94a3b8")
          rect(ctx, px + 22, py + 10, 4, 1, "#94a3b8")
        }
      } else {
        rect(ctx, ix, iy, iw, ih, W1)
        for (let gy = iy + 5; gy < iy + ih - 4; gy += 7) rect(ctx, ix, gy, iw, 1, "#bd7f49")
        if (!u) rect(ctx, ix, iy, iw, 2, W0)
        if (!d) { rect(ctx, ix, iy + ih - 4, iw, 4, W2); rect(ctx, ix, iy + ih - 1, iw, 1, W3) }
        if (hash(x, y) > 0.78 && !d && u) {
          box(ctx, px + 8, py + 6, 9, 7, "#ffffff", G2)
        }
      }
      break
    }
    case "roundTable": {
      if (same(x - 1, y, o) || same(x, y - 1, o)) break
      const cx = px + 32
      shadow(ctx, cx, py + 56, 20, 4)
      rect(ctx, cx - 4, py + 40, 8, 13, G3)
      rect(ctx, cx - 4, py + 40, 2, 13, G2)
      ell(ctx, cx, py + 53, 10, 3, G4)
      ell(ctx, cx, py + 31, 24, 18, INK)
      ell(ctx, cx, py + 33, 23, 16, G3)
      ell(ctx, cx, py + 30, 23, 16, G1)
      ell(ctx, cx - 4, py + 26, 14, 8, G0)
      // papers
      box(ctx, cx - 15, py + 20, 15, 12, "#ffffff", G2)
      rect(ctx, cx - 13, py + 23, 10, 1, G2); rect(ctx, cx - 13, py + 25, 11, 1, G2); rect(ctx, cx - 13, py + 27, 8, 1, G2)
      rect(ctx, cx - 14, py + 32, 14, 2, G2)
      // green book
      obox(ctx, cx - 1, py + 17, 15, 17, "#3b9a58", "#24563a")
      rect(ctx, cx + 1, py + 19, 11, 1, "#7fd39a"); rect(ctx, cx + 1, py + 23, 11, 1, "#7fd39a")
      rect(ctx, cx + 1, py + 27, 8, 1, "#7fd39a")
      rect(ctx, cx, py + 31, 13, 2, "#f4f6f8")
      break
    }
    case "whiteboard":
      shadow(ctx, px + 16, py + 29, 12, 2)
      rect(ctx, px + 5, py + 22, 2, 7, G4); rect(ctx, px + 25, py + 22, 2, 7, G4)
      box(ctx, px + 1, py + 1, T - 2, 22, "#ffffff", "#4f5669")
      rect(ctx, px + 2, py + 21, T - 4, 1, G1)
      line(ctx, px + 4, py + 15, px + 10, py + 9, x % 2 ? "#e05b5b" : "#4c7ef0")
      line(ctx, px + 10, py + 9, px + 17, py + 13, x % 2 ? "#e05b5b" : "#4c7ef0")
      line(ctx, px + 17, py + 13, px + 27, py + 5, x % 2 ? "#e05b5b" : "#4c7ef0")
      rect(ctx, px + 5, py + 4, 8, 1, G2); rect(ctx, px + 5, py + 6, 5, 1, G2)
      rect(ctx, px + 8, py + 23, 16, 2, G3)
      break
    case "tv":
      box(ctx, px, py + 1, T, 20, "#252a39")
      rect(ctx, px + 2, py + 3, T - 4, 16, "#3c4b78")
      rect(ctx, px + 2, py + 3, T - 4, 3, "#55679f")
      rect(ctx, px + 4 + (x % 2) * 6, py + 8, 10, 6, "#4f62a0")
      rect(ctx, px + 12, py + 21, 8, 3, "#252a39")
      rect(ctx, px + 8, py + 24, 16, 2, "#252a39")
      break
    case "counter":
      box(ctx, px, py + 2, T, 27, "#8a92a6")
      rect(ctx, px + 1, py + 3, T - 2, 9, "#e3e7ef")
      rect(ctx, px + 1, py + 3, T - 2, 1, "#ffffff")
      rect(ctx, px + 1, py + 12, T - 2, 1, "#646b7d")
      box(ctx, px + 3, py + 15, 12, 11, "#a4abbc", "#646b7d")
      box(ctx, px + 17, py + 15, 12, 11, "#a4abbc", "#646b7d")
      rect(ctx, px + 12, py + 19, 1, 3, "#e3e7ef"); rect(ctx, px + 19, py + 19, 1, 3, "#e3e7ef")
      if (x % 3 === 0) { obox(ctx, px + 7, py + 4, 18, 7, "#c2cad8", "#646b7d"); rect(ctx, px + 9, py + 6, 6, 3, "#9aa3b6") }
      if (x % 3 === 1) { obox(ctx, px + 20, py + 3, 7, 7, "#f2f2f2", "#646b7d"); rect(ctx, px + 21, py + 4, 5, 2, "#7a4a2a") }
      break
    case "fridge":
      shadow(ctx, px + 16, py + 29, 13, 2)
      obox(ctx, px + 2, py - 8, T - 4, 37, "#e2e7f0")
      rect(ctx, px + 3, py - 7, T - 6, 2, "#ffffff")
      rect(ctx, px + 3, py + 7, T - 6, 1, "#98a1b4")
      rect(ctx, px + 23, py - 3, 2, 7, "#98a1b4")
      rect(ctx, px + 23, py + 11, 2, 9, "#98a1b4")
      rect(ctx, px + 6, py - 4, 4, 4, "#f2c45f"); rect(ctx, px + 11, py - 3, 3, 3, "#e05a5a")
      break
    case "coffee":
      obox(ctx, px + 4, py - 2, 24, 30, "#3a3b47")
      rect(ctx, px + 6, py, 20, 7, "#575869")
      rect(ctx, px + 8, py + 2, 3, 2, "#e85c5c"); rect(ctx, px + 13, py + 2, 3, 2, "#5ce88a")
      rect(ctx, px + 9, py + 10, 14, 3, "#24252e")
      obox(ctx, px + 12, py + 17, 8, 8, "#ffffff")
      rect(ctx, px + 13, py + 18, 6, 2, "#7a4a2a")
      break
    case "bookshelf": {
      const l = same(x - 1, y, o), r = same(x + 1, y, o)
      const top = py - 18
      shadow(ctx, px + 16, py + 30, 16, 2)
      rect(ctx, px, top, T, 48, INK)
      const ix = px + (l ? 0 : 1), iw = T - (l ? 0 : 1) - (r ? 0 : 1)
      rect(ctx, ix, top + 1, iw, 46, N1)
      rect(ctx, ix, top + 1, iw, 3, N0)
      for (let s = 0; s < 4; s++) {
        const sy = top + 6 + s * 10
        const sx = px + (l ? 0 : 3), sw = T - (l ? 0 : 3) - (r ? 0 : 3)
        rect(ctx, sx, sy, sw, 8, N2)
        let bx = sx + 1
        let k = 0
        while (bx < sx + sw - 1) {
          const bw = 2 + Math.floor(hash(x * 11 + k, y * 7 + s) * 3)
          const bh = 5 + Math.floor(hash(x * 5 + k, s + y) * 3)
          const c = BOOKS[Math.floor(hash(x + k * 3, s * 13 + y) * BOOKS.length)]
          const ww = Math.min(bw, sx + sw - 1 - bx)
          if (hash(k + x * 2, s * 5) > 0.1) {
            rect(ctx, bx, sy + 8 - bh, ww, bh, c)
            rect(ctx, bx, sy + 8 - bh, 1, bh, "rgba(255,255,255,0.18)")
          }
          bx += ww + (hash(k, s + x) > 0.85 ? 1 : 0)
          k++
        }
        rect(ctx, ix, sy + 8, iw, 2, N0)
      }
      break
    }
    case "arcade":
      shadow(ctx, px + 16, py + 29, 12, 2)
      obox(ctx, px + 3, py - 10, 26, 39, "#5b3fa8")
      rect(ctx, px + 4, py - 9, 24, 2, "#7a5bd0")
      rect(ctx, px + 6, py - 5, 20, 13, "#1a1a26")
      rect(ctx, px + 8, py - 3, 16, 9, x % 2 ? "#ff7cb0" : "#7cf2ff")
      rect(ctx, px + 10, py - 1, 4, 2, "#ffffff")
      rect(ctx, px + 4, py + 11, 24, 7, "#7a5bd0")
      disc(ctx, px + 11, py + 14, 2, "#ff5a5a"); disc(ctx, px + 21, py + 14, 2, "#ffd65a")
      rect(ctx, px + 8, py + 21, 16, 2, "#43307e")
      break
    case "beanbag":
    case "beanbagPink": {
      const c = o === "beanbag" ? ["#2f6fc8", "#4a8fe6", "#86bbf7"] : ["#c9417f", "#e5609e", "#f6a0c8"]
      shadow(ctx, px + 16, py + 27, 12, 4)
      ell(ctx, px + 16, py + 18, 12, 10, INK)
      ell(ctx, px + 16, py + 18, 11, 9, c[0])
      ell(ctx, px + 15, py + 17, 10, 8, c[1])
      ell(ctx, px + 12, py + 14, 5, 3, c[2])
      break
    }
    case "lamp":
      shadow(ctx, px + 16, py + 29, 7, 2)
      rect(ctx, px + 15, py + 2, 2, 26, "#3a3a45")
      ell(ctx, px + 16, py + 28, 6, 2, "#3a3a45")
      tri(ctx, px + 16, py - 9, 11, 8, INK)
      tri(ctx, px + 16, py - 8, 10, 7, "#f6e7b8")
      rect(ctx, px + 10, py + 1, 12, 1, "#e2c98a")
      break
    case "printer":
      shadow(ctx, px + 16, py + 28, 13, 2)
      obox(ctx, px + 3, py + 7, 26, 20, "#d8dbe4")
      rect(ctx, px + 4, py + 8, 24, 2, "#eef0f5")
      rect(ctx, px + 6, py + 12, 20, 4, "#a9aec0")
      box(ctx, px + 8, py + 2, 16, 7, "#ffffff", G2)
      rect(ctx, px + 22, py + 20, 3, 2, "#5ce88a")
      break
    case "window":
      box(ctx, px + 1, py - 10, T - 2, 30, "#a4dcf3", "#3e4858")
      rect(ctx, px + 15, py - 9, 2, 28, "#3e4858")
      rect(ctx, px + 2, py + 4, T - 4, 2, "#3e4858")
      line(ctx, px + 4, py - 3, px + 9, py - 8, "#dff4fc"); line(ctx, px + 4, py, px + 12, py - 8, "#dff4fc")
      line(ctx, px + 19, py + 14, px + 25, py + 8, "#dff4fc")
      rect(ctx, px, py + 20, T, 2, "#e9edf0")
      break
    case "painting": painting(ctx, x, y); break
    case "cabinet":
    case "cabinetPlant": {
      shadow(ctx, px + 16, py + 29, 14, 2)
      obox(ctx, px + 2, py + 1, 28, 28, N1)
      rect(ctx, px + 3, py + 2, 26, 3, N0)
      for (let i = 0; i < 3; i++) {
        box(ctx, px + 4, py + 7 + i * 7, 24, 6, "#353c56", N2)
        rect(ctx, px + 13, py + 9 + i * 7, 6, 2, "#c4cbe0")
      }
      if (o === "cabinetPlant") {
        obox(ctx, px + 11, py - 6, 11, 9, P1)
        rect(ctx, px + 12, py - 5, 2, 6, P0)
        box(ctx, px + 10, py - 8, 13, 3, P0)
        blob(ctx, px, py - 18, [[16, 4, 5], [11, 7, 4], [22, 7, 4], [14, 0, 3], [19, 0, 3]], L1, LINK, L0, L2)
      }
      break
    }
    case "waterCooler":
      shadow(ctx, px + 16, py + 29, 9, 2)
      obox(ctx, px + 9, py + 8, 14, 21, G1)
      rect(ctx, px + 10, py + 9, 2, 18, G0)
      rect(ctx, px + 12, py + 14, 3, 2, "#e05a5a"); rect(ctx, px + 17, py + 14, 3, 2, "#4c7ef0")
      obox(ctx, px + 10, py - 6, 12, 15, "#8fd0f5", "#3a6a92")
      rect(ctx, px + 11, py - 5, 3, 12, "#c9ecfc")
      rect(ctx, px + 10, py + 1, 12, 1, "#5ea9dc")
      break
    case "pine": {
      shadow(ctx, px + 16, py + 30, 13, 4)
      ell(ctx, px + 16, py + 29, 11, 3, "#e3f3dc")
      rect(ctx, px + 14, py + 21, 4, 8, "#7a5233")
      const tiers: [number, number, number][] = [[-26, 13, 8], [-17, 14, 11], [-7, 15, 13], [2, 15, 15]]
      tiers.forEach(([ty, h, half]) => {
        tri(ctx, px + 16, py + ty - 1, h + 2, half + 1, LINK)
      })
      tiers.forEach(([ty, h, half], i) => {
        tri(ctx, px + 16, py + ty, h, half, i % 2 ? "#3c8f48" : "#43994e")
        tri(ctx, px + 14, py + ty + 3, h - 4, Math.max(2, half - 7), "#66bb63")
        rect(ctx, px + 16 - half, py + ty + h - 2, half * 2, 2, "#2f7a3d")
      })
      break
    }
    case "tree": {
      // round birch-like canopy with a pale trunk
      shadow(ctx, px + 16, py + 30, 14, 4)
      ell(ctx, px + 16, py + 29, 12, 3, "#e3f3dc")
      rect(ctx, px + 12, py + 8, 8, 21, "#3a3f4a")
      rect(ctx, px + 13, py + 8, 6, 21, "#eef0ee")
      rect(ctx, px + 13, py + 12, 3, 1, "#3a3f4a"); rect(ctx, px + 16, py + 18, 3, 1, "#3a3f4a"); rect(ctx, px + 13, py + 24, 2, 1, "#3a3f4a")
      rect(ctx, px + 17, py + 8, 2, 21, "#cfd5d2")
      blob(ctx, px, py, [[16, -14, 12], [6, -4, 10], [26, -4, 10], [11, 5, 8], [21, 5, 8], [16, -2, 9]], "#78cd57", "#2f6b36", "#a8e47c", "#4fa43f")
      break
    }
    case "bush":
      shadow(ctx, px + 16, py + 28, 13, 3)
      blob(ctx, px, py, [[10, 19, 8], [22, 19, 8], [16, 13, 9]], "#6ec657", "#2f6b36", "#a3e27a", "#4a9f3f")
      if (hash(x, y) > 0.6) for (const [fx, fy] of [[11, 15], [20, 12], [23, 20]]) { rect(ctx, px + fx, py + fy, 2, 2, "#ff8fb4"); rect(ctx, px + fx, py + fy, 1, 1, "#ffffff") }
      break
    case "flowers": {
      const palettes = [["#ff7aa8", "#ffd1e1"], ["#ffd45c", "#fff1b8"], ["#ffffff", "#ffe27a"], ["#b78cff", "#e4d6ff"], ["#ff8a5c", "#ffd0b8"]]
      for (let i = 0; i < 5; i++) {
        const fx = px + 4 + Math.floor(hash(x * 3 + i, y * 5) * 22)
        const fy = py + 6 + Math.floor(hash(x * 7, y * 3 + i) * 20)
        const [c, hi] = palettes[Math.floor(hash(x + i * 13, y + i) * palettes.length)]
        rect(ctx, fx + 1, fy + 3, 1, 3, L3)
        rect(ctx, fx + 2, fy + 4, 2, 1, L2)
        rect(ctx, fx, fy, 3, 3, c)
        rect(ctx, fx + 1, fy - 1, 1, 5, c); rect(ctx, fx - 1, fy + 1, 5, 1, c)
        rect(ctx, fx + 1, fy + 1, 1, 1, hi)
      }
      break
    }
    case "rock":
      shadow(ctx, px + 16, py + 27, 11, 3)
      blob(ctx, px, py, [[13, 20, 7], [21, 22, 5]], "#a9b2ba", "#5d6670", "#d2d9de", "#8a949d")
      break
    case "bench": {
      shadow(ctx, px + 16, py + 28, 15, 2)
      rect(ctx, px + 3, py + 18, 2, 10, "#3a3f4a"); rect(ctx, px + 27, py + 18, 2, 10, "#3a3f4a")
      rect(ctx, px + 3, py + 6, 2, 12, "#3a3f4a"); rect(ctx, px + 27, py + 6, 2, 12, "#3a3f4a")
      for (const by of [6, 10]) { box(ctx, px + 1, py + by, 30, 4, W1, W3); rect(ctx, px + 2, py + by + 1, 28, 1, W0) }
      for (const by of [16, 20]) { box(ctx, px + 1, py + by, 30, 4, W1, W3); rect(ctx, px + 2, py + by + 1, 28, 1, W0) }
      break
    }
    case "hedge": {
      const l = same(x - 1, y, o), r = same(x + 1, y, o)
      shadow(ctx, px + 16, py + 29, 16, 2)
      const x0 = px + (l ? 0 : 2), w = T - (l ? 0 : 2) - (r ? 0 : 2)
      rect(ctx, x0, py + 6, w, 23, LINK)
      rect(ctx, x0 + (l ? 0 : 1), py + 7, w - (l ? 0 : 1) - (r ? 0 : 1), 21, "#4fa443")
      rect(ctx, x0 + (l ? 0 : 1), py + 7, w - (l ? 0 : 1) - (r ? 0 : 1), 8, "#6ec657")
      for (let i = 0; i < 6; i++) {
        const hx = px + Math.floor(hash(x * 5 + i, y) * 28) + 2, hy = py + 8 + Math.floor(hash(x, y * 5 + i) * 18)
        rect(ctx, hx, hy, 2, 1, i % 2 ? "#a3e27a" : "#3d8a38")
      }
      break
    }
    case "lampPost":
      shadow(ctx, px + 16, py + 29, 6, 2)
      ell(ctx, px + 16, py + 28, 5, 2, "#2c3140")
      rect(ctx, px + 15, py - 10, 3, 38, "#2c3140")
      rect(ctx, px + 16, py - 10, 1, 38, "#4a5064")
      obox(ctx, px + 10, py - 20, 13, 11, "#2c3140")
      rect(ctx, px + 12, py - 18, 9, 7, "#ffe9a8")
      rect(ctx, px + 12, py - 18, 9, 2, "#fff6d6")
      rect(ctx, px + 9, py - 21, 15, 2, "#2c3140")
      break
    case "wallWindow": {
      // Gather-style architectural panoramic window with dark steel mullions & multi-pane glass
      const hasLeft = same(x - 1, y, "wallWindow")
      const hasRight = same(x + 1, y, "wallWindow")

      const FRAME = "#1e293b"
      const MULLION = "#0f172a"
      const SILL = "#64748b"

      // 1. Vibrant sky blue glass background
      rect(ctx, px, py + 4, T, 22, "#0284c7")
      rect(ctx, px, py + 4, T, 9, "#38bdf8")
      rect(ctx, px, py + 13, T, 7, "#0ea5e9")

      // 2. Diagonal glass glare reflections (///)
      line(ctx, px + 2, py + 21, px + 10, py + 6, "rgba(255, 255, 255, 0.55)")
      line(ctx, px + 4, py + 22, px + 13, py + 6, "rgba(255, 255, 255, 0.75)")
      line(ctx, px + 18, py + 21, px + 26, py + 6, "rgba(255, 255, 255, 0.55)")
      line(ctx, px + 20, py + 22, px + 29, py + 6, "rgba(255, 255, 255, 0.75)")

      // 3. Two horizontal transom mullions dividing the window into 3 rows of panes (Gather style)
      rect(ctx, px, py + 11, T, 1.5, MULLION)
      rect(ctx, px, py + 18, T, 1.5, MULLION)

      // 4. Vertical mullion down the middle of each tile
      rect(ctx, px + 15, py + 4, 1.5, 22, MULLION)

      // 5. Outer steel frame (top & bottom run continuously across window bays)
      rect(ctx, px, py + 3, T, 1.5, FRAME)
      rect(ctx, px, py + 25, T, 1.5, FRAME)
      if (!hasLeft) rect(ctx, px, py + 3, 2, 23, FRAME)
      if (!hasRight) rect(ctx, px + T - 2, py + 3, 2, 23, FRAME)

      // 6. Projecting window sill at bottom with soft contact shadow
      rect(ctx, px, py + 26, T, 2, SILL)
      rect(ctx, px, py + 26, T, 0.75, "#94a3b8")
      rect(ctx, px, py + 28, T, 1.5, "rgba(0, 0, 0, 0.28)")
      break
    }
    case "poster": {
      const bgs = ["#f2c45f", "#5b8def", "#e8907a", "#56b98a", "#a98ad8"]
      const bg = bgs[Math.floor(hash(x * 3, y) * bgs.length)]
      box(ctx, px + 8, py + 12, 16, 15, bg, "#2a3046")
      disc(ctx, px + 16, py + 18, 4, "#ffffff")
      disc(ctx, px + 16, py + 18, 2, bg)
      rect(ctx, px + 11, py + 23, 10, 1, "#ffffff"); rect(ctx, px + 12, py + 25, 8, 1, "rgba(255,255,255,0.6)")
      break
    }
    case "clock":
      disc(ctx, px + 16, py + 19, 7, "#2a3046")
      disc(ctx, px + 16, py + 19, 6, "#ffffff")
      rect(ctx, px + 16, py + 15, 1, 4, "#2a3046"); rect(ctx, px + 16, py + 19, 4, 1, "#e05a5a")
      rect(ctx, px + 15, py + 18, 2, 2, "#2a3046")
      break
    case "coffeeTable":
      shadow(ctx, px + 16, py + 28, 14, 2)
      rect(ctx, px + 5, py + 22, 2, 5, W3); rect(ctx, px + 25, py + 22, 2, 5, W3)
      obox(ctx, px + 3, py + 11, 26, 13, W1)
      rect(ctx, px + 4, py + 12, 24, 2, W0)
      rect(ctx, px + 4, py + 21, 24, 2, W2)
      obox(ctx, px + 7, py + 13, 9, 7, Math.floor(hash(x, y) * 2) ? "#3fa6b8" : "#e8907a")
      obox(ctx, px + 20, py + 13, 5, 6, "#ffffff"); rect(ctx, px + 21, py + 14, 3, 1, "#7a4a2a")
      break
    case "vending":
      shadow(ctx, px + 16, py + 29, 13, 2)
      obox(ctx, px + 3, py - 12, 26, 41, "#d84a4a")
      rect(ctx, px + 4, py - 11, 24, 2, "#ef7070")
      box(ctx, px + 6, py - 8, 15, 26, "#cfe7f2", "#7a2b2b")
      for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) {
        rect(ctx, px + 8 + c * 4, py - 6 + r * 5, 3, 3, BOOKS[(r * 3 + c + x) % BOOKS.length])
      }
      rect(ctx, px + 23, py - 6, 3, 8, "#2a2a33"); rect(ctx, px + 23, py + 4, 3, 2, "#5ce88a")
      rect(ctx, px + 7, py + 21, 14, 4, "#2a2a33")
      break
    case "pingpong": {
      if (same(x - 1, y, o)) break
      const w = same(x + 1, y, o) ? 62 : 30
      shadow(ctx, px + w / 2 + 1, py + 29, w / 2, 3)
      rect(ctx, px + 4, py + 22, 2, 7, G4); rect(ctx, px + w - 4, py + 22, 2, 7, G4)
      obox(ctx, px + 1, py + 6, w, 18, "#2f8f5a", "#1d4f33")
      rect(ctx, px + 2, py + 7, w - 2, 1, "#ffffff"); rect(ctx, px + 2, py + 22, w - 2, 1, "#ffffff")
      rect(ctx, px + 2, py + 7, 1, 16, "#ffffff"); rect(ctx, px + w - 1, py + 7, 1, 16, "#ffffff")
      rect(ctx, px + 2, py + 15, w - 2, 1, "rgba(255,255,255,0.6)")
      rect(ctx, px + 1 + w / 2 - 1, py + 3, 2, 22, "#2a3046")
      rect(ctx, px + 1 + w / 2 - 1, py + 3, 1, 22, "#f0f0f0")
      disc(ctx, px + 12, py + 12, 2, "#ffffff")
      obox(ctx, px + w - 12, py + 16, 6, 6, "#e05a5a")
      break
    }
    case "trash":
      shadow(ctx, px + 16, py + 28, 6, 2)
      obox(ctx, px + 11, py + 15, 10, 13, G2)
      rect(ctx, px + 12, py + 16, 2, 11, G1)
      box(ctx, px + 10, py + 13, 12, 3, G3)
      break
    case "stool":
      shadow(ctx, px + 16, py + 28, 6, 2)
      rect(ctx, px + 15, py + 18, 2, 9, G4)
      ell(ctx, px + 16, py + 27, 5, 2, G4)
      ell(ctx, px + 16, py + 17, 7, 4, INK)
      ell(ctx, px + 16, py + 17, 6, 3, W1)
      ell(ctx, px + 15, py + 16, 3, 1, W0)
      break
    case "lily":
      ell(ctx, px + 15, py + 17, 8, 5, "#2f7a3d")
      ell(ctx, px + 15, py + 16, 7, 4, "#5cb84a")
      rect(ctx, px + 15, py + 12, 1, 5, "#2f7a3d")
      if (hash(x, y) > 0.4) { disc(ctx, px + 19, py + 15, 2, "#ff9cc0"); rect(ctx, px + 18, py + 14, 1, 1, "#ffffff") }
      break
    case "cafeTable":
    case "parasol": {
      shadow(ctx, px + 16, py + 28, 10, 3)
      rect(ctx, px + 15, py + 18, 3, 9, G4)
      ell(ctx, px + 16, py + 27, 6, 2, G4)
      ell(ctx, px + 16, py + 16, 11, 7, INK)
      ell(ctx, px + 16, py + 16, 10, 6, o === "parasol" ? G0 : "#f7f7f5")
      ell(ctx, px + 14, py + 14, 5, 2, "#ffffff")
      obox(ctx, px + 12, py + 11, 5, 6, "#ffffff"); rect(ctx, px + 13, py + 12, 3, 1, "#7a4a2a")
      if (hash(x, y) > 0.5) { ell(ctx, px + 21, py + 16, 3, 2, "#e8907a") }
      if (o === "parasol") {
        rect(ctx, px + 15, py - 14, 2, 30, "#3a3f4a")
        const c1 = x % 2 ? "#e05a5a" : "#3fa6b8"
        ell(ctx, px + 16, py - 12, 19, 9, INK)
        ell(ctx, px + 16, py - 12, 18, 8, "#ffffff")
        for (let i = -18; i < 18; i += 8) {
          ctx.fillStyle = c1
          for (let dy = -8; dy < 8; dy++) {
            const yy = (dy + 0.5) / 8
            const hw = Math.round(18 * Math.sqrt(Math.max(0, 1 - yy * yy)))
            const a = Math.max(px + 16 + i, px + 16 - hw), b = Math.min(px + 16 + i + 4, px + 16 + hw)
            if (b > a) ctx.fillRect(a, py - 12 + dy, b - a, 1)
          }
        }
        rect(ctx, px + 15, py - 21, 2, 2, "#3a3f4a")
      }
      break
    }
    case "officeChair": {
      // front view: sits above a desk, facing the viewer
      const C0 = "#4c5266", C1 = "#363b4c", C2 = "#262a37"
      shadow(ctx, px + 16, py + 28, 9, 3)
      obox(ctx, px + 9, py + 1, 14, 12, C1)
      rect(ctx, px + 10, py + 2, 12, 2, C0)
      obox(ctx, px + 8, py + 12, 16, 8, C1)
      rect(ctx, px + 9, py + 13, 14, 2, C0)
      rect(ctx, px + 6, py + 10, 3, 7, C2); rect(ctx, px + 23, py + 10, 3, 7, C2)
      rect(ctx, px + 15, py + 20, 2, 5, C2)
      rect(ctx, px + 9, py + 25, 14, 2, C2)
      break
    }
  }
}

// Objects drawn once from their left-most tile across a run of tiles.
const RUNS: ReadonlySet<Obj> = new Set<Obj>(["painting", "pingpong", "roundTable", "workDesk", "reception", "displayShelf", "fishTank", "roundSmall", "loungeTable"])

/**
 * Redraws the tile rectangle [x0..x1] x [y0..y1] (inclusive), clipped to it.
 * Neighbouring tiles are re-drawn underneath the clip so that walls, rug edges,
 * tall sprites and multi-tile objects that reach into the rectangle stay correct.
 */
function drawRegion(ctx: Ctx, x0: number, y0: number, x1: number, y1: number) {
  x0 = Math.max(0, x0); y0 = Math.max(0, y0)
  x1 = Math.min(MAP_W - 1, x1); y1 = Math.min(MAP_H - 1, y1)
  if (x0 > x1 || y0 > y1) return
  const ex0 = Math.max(0, x0 - 5), ex1 = Math.min(MAP_W - 1, x1 + 5)
  const ey0 = Math.max(0, y0 - 5), ey1 = Math.min(MAP_H - 1, y1 + 6)
  ctx.save()
  ctx.beginPath()
  ctx.rect(x0 * T, y0 * T, (x1 - x0 + 1) * T, (y1 - y0 + 1) * T)
  ctx.clip()
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(x0 * T, y0 * T, (x1 - x0 + 1) * T, (y1 - y0 + 1) * T)
  for (let y = ey0; y <= ey1; y++) for (let x = ex0; x <= ex1; x++) drawFloor(ctx, floor[y][x], x, y)
  // Raised wall faces are composited after all ground tiles, so floor patches
  // cannot erase their caps or the joins between vertical and horizontal walls.
  for (let y = ey0; y <= ey1; y++) for (let x = ex0; x <= ex1; x++) if (floor[y][x] === "wall") drawWall(ctx,x,y)
  for (let y = ey0; y <= ey1; y++) for (let x = ex0; x <= ex1; x++) if (floor[y][x] === "water") waterEdge(ctx, x, y)
  const gardenX = (OX + COURTYARD.x) * T + 2, gardenY = (OY + COURTYARD.y) * T + 2
  const gardenW = COURTYARD.w * T - 4, gardenH = COURTYARD.h * T - 4
  rect(ctx, gardenX, gardenY, gardenW, 2, "#a4d8b0")
  rect(ctx, gardenX, gardenY + gardenH - 2, gardenW, 2, "#a4d8b0")
  rect(ctx, gardenX, gardenY, 2, gardenH, "#a4d8b0")
  rect(ctx, gardenX + gardenW - 2, gardenY, 2, gardenH, "#a4d8b0")
  for (const door of LAYOUT_DOORS) {
    const tiles: [number,number][] = [[OX+door.x,OY+door.y],[OX+door.x+(door.orientation==='horizontal'?1:0),OY+door.y+(door.orientation==='vertical'?1:0)]]
    for (const p of doorFrame(tiles,door.orientation,door.id.startsWith('focus-')).posts) {
      rect(ctx,p.x,p.y,p.w,p.h,'#966b4c'); rect(ctx,p.x+1,p.y+1,Math.max(1,p.w-2),p.h-2,'#e7b989')
    }
  }
  // Objects row by row so taller sprites overlap the row above correctly.
  for (let y = ey0; y <= ey1; y++) {
    let sx = ex0
    while (sx > 0 && objects[y][sx - 1] && RUNS.has(objects[y][sx - 1]!)) sx--
    for (let x = sx; x <= ex1; x++) {
      const o = objects[y][x]
      if (o) drawObject(ctx, o, x, y)
    }
  }
  ctx.restore()
}

/** Renders the whole static map into an offscreen canvas at 1 px = 1 map px. */
export function renderStaticMap(): HTMLCanvasElement {
  const c = document.createElement("canvas")
  c.width = MAP_W * T
  c.height = MAP_H * T
  drawRegion(c.getContext("2d")!, 0, 0, MAP_W - 1, MAP_H - 1)
  return c
}

/** Repaints the given tiles (plus a margin) on a canvas made by renderStaticMap. Returns the tile rect. */
export function redrawTiles(c: HTMLCanvasElement, tiles: [number, number][]): [number, number, number, number] | null {
  if (!tiles.length) return null
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const [x, y] of tiles) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y) }
  // A change can alter how neighbours draw (wall faces, rug borders, merged desks, tall sprites above).
  x0 -= 5; x1 += 5; y0 -= 6; y1 += 5
  drawRegion(c.getContext("2d")!, x0, y0, x1, y1)
  return [Math.max(0, x0), Math.max(0, y0), Math.min(MAP_W - 1, x1), Math.min(MAP_H - 1, y1)]
}

/**
 * Layer for row `y` holding the parts of up-facing seats that sit in front of
 * someone sitting on them (chair backs, sofa backs). Null when the row has none.
 */
export function renderSeatFrontRow(y: number, seats: Partial<Record<Obj, { frontFrom?: number }>>): HTMLCanvasElement | null {
  const cols: number[] = []
  for (let x = 0; x < MAP_W; x++) {
    const o = objects[y][x]
    if (o && seats[o]?.frontFrom !== undefined) cols.push(x)
  }
  if (!cols.length) return null
  const c = document.createElement("canvas")
  c.width = MAP_W * T
  c.height = T
  const ctx = c.getContext("2d")!
  ctx.imageSmoothingEnabled = false
  ctx.translate(0, -y * T)
  for (const x of cols) {
    const o = objects[y][x]!
    const from = seats[o]!.frontFrom!
    ctx.save()
    ctx.beginPath()
    ctx.rect(x * T, y * T + from, T, T - from)
    ctx.clip()
    drawObject(ctx, o, x, y)
    ctx.restore()
  }
  return c
}

/**
 * Palette thumbnail: the object on a 3x4-tile transparent canvas with its
 * anchor tile at (1, 2). Wall decor gets a strip of wall behind it.
 */
export function renderObjectThumb(o: Obj, footprint: [number, number] = [1, 1]): HTMLCanvasElement {
  const W = Math.max(4, footprint[0] + 2), H = Math.max(4, footprint[1] + 3)
  const c = document.createElement("canvas")
  c.width = W * T
  c.height = H * T
  const ctx = c.getContext("2d")!
  ctx.imageSmoothingEnabled = false
  const scratch: (Obj | null)[][] = Array.from({ length: H }, () => Array.from({ length: W }, () => null))
  for (let dy = 0; dy < footprint[1]; dy++) for (let dx = 0; dx < footprint[0]; dx++) scratch[2 + dy][1 + dx] = o
  if (o === "painting") scratch[2][2] = o
  const isDecor = o === "painting" || o === "poster" || o === "clock" || o === "wallWindow"
  if (isDecor) {
    rect(ctx, 0, 2 * T, W * T, 10, "#56616b")
    rect(ctx, 0, 2 * T + 10, W * T, 1, "#3f4851")
    rect(ctx, 0, 2 * T + 11, W * T, 18, "#7c888c")
    rect(ctx, 0, 2 * T + 28, W * T, 3, "#f3f5f6")
  }
  if (o === "lily") ell(ctx, T + 16, 2 * T + 16, 15, 11, "#76c3e6")
  const prev = grid
  grid = scratch
  try {
    drawObject(ctx, o, 1, 2)
  } finally {
    grid = prev
  }
  return c
}

/** Palette thumbnail for a floor type (one tile). */
export function renderFloorThumb(f: Floor): HTMLCanvasElement {
  const c = document.createElement("canvas")
  c.width = T
  c.height = T
  const ctx = c.getContext("2d")!
  if (f === "wall") {
    rect(ctx, 0, 0, T, 10, "#56616b")
    rect(ctx, 0, 10, T, 1, "#3f4851")
    rect(ctx, 0, 11, T, 18, "#7c888c")
    rect(ctx, 0, 11, T, 2, "#8e999d")
    rect(ctx, 0, 28, T, 4, "#f3f5f6")
  } else {
    ctx.drawImage(floorTile(f, 0, 0), 0, 0)
  }
  return c
}

/** Tiny overview of the map for the minimap. */
export function renderMinimap(scale = 2): HTMLCanvasElement {
  const c = document.createElement("canvas")
  c.width = MAP_W * scale
  c.height = MAP_H * scale
  const ctx = c.getContext("2d")!
  const colors: Record<Floor, string> = {
    grass: "#3c4a3f", path: "#5a5a5a", wall: "#9aa0b0", hall: "#4a4a55", lavender: "#55588a",
    slate: "#53585f", rug: "#4f5a5d", kitchen: "#5c6070", game: "#3e404a",
    wood: "#5e5048", carpet: "#4a5e5f", marble: "#66666a", deck: "#5a4a3e", water: "#3d6a86",
    rugWarm: "#6e4a40", rugBlue: "#46507a", stripe: "#a7b6b8", huddle: "#d6dae4", diamond: "#e9e6ef",
  }
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      ctx.fillStyle = colors[floor[y][x]]
      ctx.fillRect(x * scale, y * scale, scale, scale)
    }
  }
  return c
}

/** Stable color for letter avatars, derived from the name. */
export function nameColor(name: string): string {
  const palette = ["#f7d774", "#9fd3f7", "#f7a8c4", "#b7e4a1", "#c9b8f5", "#f8c08f", "#8fe0d4"]
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return palette[h % palette.length]
}

// Pixel-exact drawing primitives shared by the map art and the avatars.
// Everything uses integer rects / row runs (no anti-aliased paths) so sprites
// stay crisp when Phaser scales them with pixelArt: true.

export type Ctx = CanvasRenderingContext2D

export const INK = "#323a4e"
export const SHADOW = "rgba(24,32,48,0.18)"

export function rect(ctx: Ctx, x: number, y: number, w: number, h: number, c: string) {
  if (w <= 0 || h <= 0) return
  ctx.fillStyle = c
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h))
}
/** Box with a 1px outline and clipped corners (classic pixel-art box). */
export function obox(ctx: Ctx, x: number, y: number, w: number, h: number, c: string, ink = INK) {
  rect(ctx, x + 1, y, w - 2, h, ink)
  rect(ctx, x, y + 1, w, h - 2, ink)
  rect(ctx, x + 1, y + 1, w - 2, h - 2, c)
}
/** Square-cornered outlined box. */
export function box(ctx: Ctx, x: number, y: number, w: number, h: number, c: string, ink = INK) {
  rect(ctx, x, y, w, h, ink)
  rect(ctx, x + 1, y + 1, w - 2, h - 2, c)
}
/** 1px hollow rectangle. */
export function frame(ctx: Ctx, x: number, y: number, w: number, h: number, c: string) {
  rect(ctx, x, y, w, 1, c)
  rect(ctx, x, y + h - 1, w, 1, c)
  rect(ctx, x, y, 1, h, c)
  rect(ctx, x + w - 1, y, 1, h, c)
}
/** Filled ellipse built from horizontal runs, centred on pixel corner (cx, cy). */
export function ell(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, c: string) {
  ctx.fillStyle = c
  cx = Math.round(cx)
  cy = Math.round(cy)
  for (let dy = -ry; dy < ry; dy++) {
    const yy = (dy + 0.5) / ry
    const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - yy * yy)))
    if (hw > 0) ctx.fillRect(cx - hw, cy + dy, hw * 2, 1)
  }
}
export const disc = (ctx: Ctx, cx: number, cy: number, r: number, c: string) => ell(ctx, cx, cy, r, r, c)
/** Outlined cluster of discs: foliage, cushions, clouds. */
export function blob(ctx: Ctx, ox: number, oy: number, parts: [number, number, number][], fill: string, ink: string, hi?: string, lo?: string) {
  for (const [x, y, r] of parts) disc(ctx, ox + x, oy + y, r + 1, ink)
  if (lo) for (const [x, y, r] of parts) disc(ctx, ox + x, oy + y, r, lo)
  for (const [x, y, r] of parts) disc(ctx, ox + x - (lo ? 1 : 0), oy + y - (lo ? 1 : 0), r - (lo ? 1 : 0), fill)
  if (hi) for (const [x, y, r] of parts) disc(ctx, ox + x - Math.ceil(r / 3), oy + y - Math.ceil(r / 3), Math.max(1, Math.floor(r / 3)), hi)
}
/** Upward-pointing triangle from row runs. */
export function tri(ctx: Ctx, cx: number, top: number, h: number, half: number, c: string) {
  ctx.fillStyle = c
  for (let i = 0; i < h; i++) {
    const hw = Math.max(1, Math.round((half * (i + 1)) / h))
    ctx.fillRect(cx - hw, top + i, hw * 2, 1)
  }
}
export function line(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, c: string) {
  ctx.fillStyle = c
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1
  let err = dx + dy
  for (;;) {
    ctx.fillRect(x0, y0, 1, 1)
    if (x0 === x1 && y0 === y1) break
    const e2 = 2 * err
    if (e2 >= dy) { err += dy; x0 += sx }
    if (e2 <= dx) { err += dx; y0 += sy }
  }
}
/** Pixel rounded rect (r = corner radius in px). */
export function rrect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, c: string) {
  if (w <= 0 || h <= 0) return
  ctx.fillStyle = c
  r = Math.min(r, Math.floor(w / 2), Math.floor(h / 2))
  for (let i = 0; i < h; i++) {
    const d = i < r ? r - 1 - i : i >= h - r ? i - (h - r) : -1
    const inset = d < 0 ? 0 : r - Math.round(Math.sqrt(r * r - (d + 0.5) * (d + 0.5)))
    ctx.fillRect(x + inset, y + i, w - inset * 2, 1)
  }
}
export function hash(x: number, y: number) {
  let h = x * 374761393 + y * 668265263
  h = (h ^ (h >>> 13)) * 1274126177
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}

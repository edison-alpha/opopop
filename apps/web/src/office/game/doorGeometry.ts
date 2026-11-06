import { HORIZONTAL_WALL_RISE } from "./wallGeometry"
export interface DoorPost { x: number; y: number; w: number; h: number }
/** Tile walls are cut away at their centerline: openings include the exposed half-tiles. */
export function doorFrame(tiles: [number, number][], orientation: "horizontal" | "vertical", focus = false, tile = 32) {
  const minX = Math.min(...tiles.map(t => t[0])), maxX = Math.max(...tiles.map(t => t[0]))
  const minY = Math.min(...tiles.map(t => t[1])), maxY = Math.max(...tiles.map(t => t[1]))
  const left = minX * tile - tile / 2 + 3, right = (maxX + 1) * tile + tile / 2 - 3
  const centerX = (minX + 0.5) * tile, centerY = (minY + 0.5) * tile
  const top = minY * tile, bottom = (maxY + 1) * tile
  const posts: DoorPost[] = orientation === "vertical" ? [
    {x:centerX-3,y:top-2,w:6,h:4}, {x:centerX-3,y:bottom-2,w:6,h:4},
  ] : focus ? [
    {x:left-4,y:top-2-HORIZONTAL_WALL_RISE,w:4,h:2*tile+2+HORIZONTAL_WALL_RISE}, {x:right,y:top-2-HORIZONTAL_WALL_RISE,w:4,h:2*tile+2+HORIZONTAL_WALL_RISE},
  ] : [
    {x:left-4,y:centerY-14-HORIZONTAL_WALL_RISE,w:4,h:28+HORIZONTAL_WALL_RISE}, {x:right,y:centerY-14-HORIZONTAL_WALL_RISE,w:4,h:28+HORIZONTAL_WALL_RISE},
  ]
  return { left, right, top, bottom, centerX, centerY, posts }
}

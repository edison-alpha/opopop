import { HORIZONTAL_WALL_RISE } from "./wallGeometry"
export interface DoorPost { x: number; y: number; w: number; h: number }
/** Horizontal openings match the carpet width; vertical partitions use their centerline. */
export function doorFrame(tiles: [number, number][], orientation: "horizontal" | "vertical", _focus = false, tile = 32) {
  const minX = Math.min(...tiles.map(t => t[0])), maxX = Math.max(...tiles.map(t => t[0]))
  const minY = Math.min(...tiles.map(t => t[1])), maxY = Math.max(...tiles.map(t => t[1]))
  const left = minX * tile, right = (maxX + 1) * tile
  const centerX = (minX + 0.5) * tile, centerY = (minY + 0.5) * tile
  const top = minY * tile, bottom = (maxY + 1) * tile
  const posts: DoorPost[] = orientation === "vertical" ? [
    {x:centerX-3,y:top-2,w:6,h:4}, {x:centerX-3,y:bottom-2,w:6,h:4},
  ] : [
    {x:left-3,y:bottom-tile-HORIZONTAL_WALL_RISE,w:3,h:tile+HORIZONTAL_WALL_RISE},
    {x:right,y:bottom-tile-HORIZONTAL_WALL_RISE,w:3,h:tile+HORIZONTAL_WALL_RISE},
  ]

  return { left, right, top, bottom, centerX, centerY, posts }
}

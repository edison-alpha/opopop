/** Visual height above a horizontal wall's occupied floor tile. */
export const HORIZONTAL_WALL_RISE = 32
export const HORIZONTAL_WALL_HEIGHT = 32 + HORIZONTAL_WALL_RISE

/** A vertical wall above a junction must not suppress the raised horizontal face. */
export function wallShape(x: number, y: number, isWall: (x: number, y: number) => boolean, tile = 32) {
  const horizontal = isWall(x-1,y) || isWall(x+1,y)
  // A stack is one facade, anchored at its bottom row, rather than added heights.
  const hidden = horizontal && isWall(x,y+1) && (isWall(x-1,y+1) || isWall(x+1,y+1))
  const topEdge = horizontal && !hidden
  const verticalJoin = isWall(x,y-1) || isWall(x,y+1)
  // Outside corners end on the thin side partition, never overhang into the garden.
  // A doorway has no vertical join and keeps its full, carpet-aligned width.
  const start = !horizontal || (!isWall(x-1,y) && verticalJoin) ? tile/2-3 : 0
  const end = !horizontal || (!isWall(x+1,y) && verticalJoin) ? tile/2+3 : tile
  const rise = topEdge ? HORIZONTAL_WALL_RISE : 0
  return { horizontal, hidden, topEdge, start, end, rise, x:x*tile+start, y:y*tile-rise, w:end-start, h:tile+rise }
}

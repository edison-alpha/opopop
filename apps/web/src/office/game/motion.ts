/** Evaluate motion at the current frame, even before the renderer has updated rx/ry. */
export function positionAt(a: { fromX: number; fromY: number; x: number; y: number; stepStart: number }, now: number, duration: number) {
  const t = Math.max(0, Math.min(1, (now - a.stepStart) / duration))
  return { x: a.fromX + (a.x - a.fromX) * t, y: a.fromY + (a.y - a.fromY) * t, walking: t < 1 }
}

interface Position { x: number; y: number; visible: boolean }
type OverlayNode = Pick<HTMLElement, "style">
const nodes = new Map<string, OverlayNode>()
const positions = new Map<string, Position>()
function apply(node: OverlayNode, p: Position) {
  node.style.display = p.visible ? "block" : "none"
  node.style.transform = `translate3d(${p.x.toFixed(2)}px, ${p.y.toFixed(2)}px, 0)`
}
/** React owns the contents; the renderer alone owns the outer screen transform. */
export function registerMapOverlay(id: string, node: OverlayNode | null) {
  if (!node) { nodes.delete(id); positions.delete(id); return }
  nodes.set(id, node)
  const position = positions.get(id)
  if (position) apply(node, position)
  else node.style.display = "none"
}
export function positionMapOverlay(id: string, position: Position) {
  positions.set(id, position)
  const node = nodes.get(id)
  if (node) apply(node, position)
}
export function clearMapOverlayPositions() {
  positions.clear()
  for (const node of nodes.values()) node.style.display = "none"
}

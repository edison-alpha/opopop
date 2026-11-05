// Build-mode edits on top of the default map. Kept compacted (one entry per
// tile/area) and persisted to disk so the office survives server restarts.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"

import type { AreaDef, MapOp } from "../shared/protocol"

const FILE = join(process.cwd(), "data", "map-state.json")
const MAX_COORD = 500
const MAX_ENTRIES = 60_000
const ID = /^[A-Za-z]{1,24}$/

const int = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v >= 0 && v < MAX_COORD ? v : null)

function cleanArea(a: unknown): AreaDef | null {
  if (!a || typeof a !== "object") return null
  const r = a as Record<string, unknown>
  const name = String(r.name ?? "").trim().slice(0, 40)
  const x = int(r.x), y = int(r.y), w = int(r.w), h = int(r.h)
  if (!name || x === null || y === null || !w || !h || w > 120 || h > 120) return null
  return { name, x, y, w, h, private: !!r.private, meeting: !!r.meeting, label: r.label !== false }
}

/** Returns a sanitized op, or null when it is malformed. */
export function cleanOp(op: unknown): MapOp | null {
  if (!op || typeof op !== "object") return null
  const o = op as Record<string, unknown>
  switch (o.k) {
    case "obj": {
      const x = int(o.x), y = int(o.y)
      if (x === null || y === null) return null
      if (o.o !== null && !(typeof o.o === "string" && ID.test(o.o))) return null
      return { k: "obj", x, y, o: o.o as string | null }
    }
    case "floor": {
      const x = int(o.x), y = int(o.y)
      if (x === null || y === null || typeof o.f !== "string" || !ID.test(o.f)) return null
      return { k: "floor", x, y, f: o.f }
    }
    case "area": {
      const area = cleanArea(o.area)
      return area ? { k: "area", area } : null
    }
    case "areaDel": {
      const name = String(o.name ?? "").trim().slice(0, 40)
      return name ? { k: "areaDel", name } : null
    }
    case "reset":
      return { k: "reset" }
  }
  return null
}

const keyOf = (op: MapOp) =>
  op.k === "obj" ? `o:${op.x},${op.y}` : op.k === "floor" ? `f:${op.x},${op.y}` : op.k === "area" ? `a:${op.area.name}` : op.k === "areaDel" ? `a:${op.name}` : "reset"

export class MapState {
  private entries = new Map<string, MapOp>()
  private saveTimer: ReturnType<typeof setTimeout> | null = null

  constructor() {
    try {
      const raw = JSON.parse(readFileSync(FILE, "utf8")) as unknown[]
      for (const op of raw) {
        const c = cleanOp(op)
        if (c && c.k !== "reset") this.entries.set(keyOf(c), c)
      }
    } catch {
      // no saved edits yet
    }
  }

  /** Applies already-cleaned ops and returns the ones accepted (stops when the state is full). */
  apply(ops: MapOp[]): MapOp[] {
    const applied: MapOp[] = []
    for (const op of ops) {
      if (op.k === "reset") {
        this.entries.clear()
        applied.push(op)
        continue
      }
      const k = keyOf(op)
      if (!this.entries.has(k) && this.entries.size >= MAX_ENTRIES) break
      // Areas are ordered by insertion; re-adding moves an area to the end.
      if (op.k === "area" || op.k === "areaDel") this.entries.delete(k)
      this.entries.set(k, op)
      applied.push(op)
    }
    if (applied.length) this.scheduleSave()
    return applied
  }

  /** Floors first, then objects, then areas, so a replay is order-independent. */
  snapshot(): MapOp[] {
    const all = [...this.entries.values()]
    const rank = (op: MapOp) => (op.k === "floor" ? 0 : op.k === "obj" ? 1 : 2)
    return all.map((op, i) => [op, i] as const).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map(([op]) => op)
  }

  private scheduleSave() {
    if (this.saveTimer) return
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null
      try {
        mkdirSync(dirname(FILE), { recursive: true })
        writeFileSync(FILE, JSON.stringify(this.snapshot()))
      } catch (err) {
        console.error("[map] could not save edits:", err)
      }
    }, 1000)
  }
}

"use client"
// Build mode panel: place furniture/decor, paint floors and walls, create or demolish rooms.
import { Brush, Eraser, Hammer, LayoutPanelTop, Redo2, RotateCw, Sofa, Trash2, Undo2, X } from "../common/icons"
import { useEffect, useState } from "react"
import { FLOOR_LABEL, OBJECT_GROUPS, demolishOps, labelOf, rotateObj } from "../../build"
import { renderFloorThumb, renderObjectThumb } from "../../game/art"
import { FLOORS, FOOTPRINT, areas, type Floor, type Obj } from "../../game/map"
import { editMap, redoEdit, resetOfficeMap, undoEdit } from "../../session"
import { useOffice, type BuildTool } from "../../store"

const thumbCache = new Map<string, string>()

/** Crops a canvas to its non-transparent pixels (plus padding), keeping it square. */
function trimToSquare(src: HTMLCanvasElement, pad = 2): HTMLCanvasElement {
  const ctx = src.getContext("2d")!
  const { data, width, height } = ctx.getImageData(0, 0, src.width, src.height)
  let x0 = width, y0 = height, x1 = -1, y1 = -1
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (data[(y * width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
  }
  if (x1 < 0) return src
  const size = Math.max(x1 - x0 + 1, y1 - y0 + 1) + pad * 2
  const out = document.createElement("canvas")
  out.width = size
  out.height = size
  const o = out.getContext("2d")!
  o.imageSmoothingEnabled = false
  o.drawImage(src, x0, y0, x1 - x0 + 1, y1 - y0 + 1,
    Math.floor((size - (x1 - x0 + 1)) / 2), Math.floor((size - (y1 - y0 + 1)) / 2), x1 - x0 + 1, y1 - y0 + 1)
  return out
}

function objThumb(o: Obj) {
  const k = `o:${o}`
  let url = thumbCache.get(k)
  if (!url) {
    url = trimToSquare(renderObjectThumb(o, FOOTPRINT[o] ?? [1, 1])).toDataURL()
    thumbCache.set(k, url)
  }
  return url
}
function floorThumb(f: Floor) {
  const k = `f:${f}`
  let url = thumbCache.get(k)
  if (!url) {
    url = renderFloorThumb(f).toDataURL()
    thumbCache.set(k, url)
  }
  return url
}

const TOOLS: { id: BuildTool; label: string; icon: React.ReactNode; key: string }[] = [
  { id: "object", label: "Objects", icon: <Sofa size={16} />, key: "1" },
  { id: "floor", label: "Floor & walls", icon: <Brush size={16} />, key: "2" },
  { id: "erase", label: "Erase", icon: <Eraser size={16} />, key: "3" },
  { id: "room", label: "Rooms", icon: <LayoutPanelTop size={16} />, key: "4" },
]

const ROOM_FLOORS: Floor[] = ["carpet", "wood", "slate", "lavender", "marble", "kitchen", "game", "hall", "rugWarm", "rugBlue"]

export function BuildButton() {
  const office = useOffice()
  return (
    <button
      className={`mc-btn ${office.build.open ? "is-active" : ""}`}
      title="Build mode (B)"
      aria-label="Build mode"
      aria-pressed={office.build.open}
      onClick={() => { office.build.open = !office.build.open; office.emit() }}
    >
      <Hammer size={16} />
    </button>
  )
}

export function BuildPanel() {
  const office = useOffice()
  const b = office.build
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmDemolish, setConfirmDemolish] = useState<string | null>(null)
  const [query, setQuery] = useState("")

  // "B" toggles build mode from anywhere on the stage.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT")) return
      if (e.code === "KeyB" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        office.build.open = !office.build.open
        office.emit()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [office])

  if (!b.open) return null
  const set = (patch: Partial<typeof b>) => { Object.assign(office.build, patch); office.emit() }
  const q = query.trim().toLowerCase()

  return (
    <aside className="build-panel" aria-label="Build mode">
      <header className="bp-head">
        <Hammer size={16} />
        <h2>Build</h2>
        <span className="grow" />
        <button className="icon-btn" title="Undo (Ctrl+Z)" aria-label="Undo" disabled={!office.undoDepth} onClick={undoEdit}>
          <Undo2 size={16} />
        </button>
        <button className="icon-btn" title="Redo (Ctrl+Y)" aria-label="Redo" disabled={!office.redoDepth} onClick={redoEdit}>
          <Redo2 size={16} />
        </button>
        <button className="icon-btn" title="Close (Esc)" aria-label="Close build mode" onClick={() => set({ open: false })}>
          <X size={16} />
        </button>
      </header>

      <div className="bp-tools" role="tablist" aria-label="Build tools">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={b.tool === t.id}
            className={`bp-tool ${b.tool === t.id ? "is-active" : ""}`}
            title={`${t.label} (${t.key})`}
            onClick={() => set({ tool: t.id })}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div className="bp-body">
        {b.tool === "object" && (
          <>
            <div className="bp-selected">
              <img src={objThumb(b.obj)} alt="" className="bp-selected-img" />
              <div className="grow">
                <div className="bp-selected-name">{labelOf(b.obj)}</div>
                <div className="bp-hint">Click or drag on the map to place</div>
              </div>
              <button className="btn btn-ghost bp-rotate" title="Rotate / variant (R)" onClick={() => set({ obj: rotateObj(b.obj) })}>
                <RotateCw size={14} /> R
              </button>
            </div>
            <input className="input bp-search" placeholder="Search objects…" value={query} onChange={(e) => setQuery(e.target.value)} />
            {OBJECT_GROUPS.map((g) => {
              const items = g.items.filter((o) => !q || labelOf(o).toLowerCase().includes(q) || o.toLowerCase().includes(q))
              if (!items.length) return null
              return (
                <section key={g.name} className="bp-group">
                  <h3>{g.name}</h3>
                  <div className="bp-grid">
                    {items.map((o) => (
                      <button
                        key={o}
                        className={`bp-item ${b.obj === o ? "is-selected" : ""}`}
                        title={labelOf(o)}
                        aria-label={labelOf(o)}
                        aria-pressed={b.obj === o}
                        onClick={() => set({ obj: o })}
                      >
                        <img src={objThumb(o)} alt="" />
                      </button>
                    ))}
                  </div>
                </section>
              )
            })}
          </>
        )}

        {b.tool === "floor" && (
          <>
            <p className="bp-hint">Drag a rectangle on the map to paint it. Paint <b>Wall</b> to build walls, paint a floor over a wall to knock it down or add a door.</p>
            <div className="bp-grid floors">
              {FLOORS.map((f) => (
                <button
                  key={f}
                  className={`bp-item floor ${b.floor === f ? "is-selected" : ""}`}
                  title={FLOOR_LABEL[f]}
                  aria-pressed={b.floor === f}
                  onClick={() => set({ floor: f })}
                >
                  <img src={floorThumb(f)} alt="" />
                  <span>{FLOOR_LABEL[f]}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {b.tool === "erase" && (
          <div className="bp-empty">
            <Eraser size={28} />
            <p>Click an object, or drag a rectangle, to remove furniture and decorations.</p>
            <p className="bp-hint">Floors and walls stay. Use Floor &amp; walls to change those.</p>
          </div>
        )}

        {b.tool === "room" && (
          <>
            <div className="bp-form">
              <label className="field">
                <span className="field-label">Room name</span>
                <input className="input" placeholder="e.g. Finance Room" maxLength={40} value={b.room.name}
                  onChange={(e) => set({ room: { ...b.room, name: e.target.value } })} />
              </label>
              <span className="field-label">Floor</span>
              <div className="bp-grid floors compact">
                {ROOM_FLOORS.map((f) => (
                  <button key={f} className={`bp-item floor ${b.room.floor === f ? "is-selected" : ""}`} title={FLOOR_LABEL[f]}
                    aria-pressed={b.room.floor === f} onClick={() => set({ room: { ...b.room, floor: f } })}>
                    <img src={floorThumb(f)} alt="" />
                  </button>
                ))}
              </div>
              <label className="bp-check">
                <input type="checkbox" checked={b.room.private} onChange={(e) => set({ room: { ...b.room, private: e.target.checked } })} />
                Private (everyone inside can hear each other)
              </label>
              <label className="bp-check">
                <input type="checkbox" checked={b.room.meeting}
                  onChange={(e) => set({ room: { ...b.room, meeting: e.target.checked, private: e.target.checked || b.room.private } })} />
                Meeting room (opens the meeting view)
              </label>
              <p className="bp-hint">Drag a rectangle on the map (at least 3 × 3). Walls go around the edge with a door at the bottom.</p>
            </div>
            <section className="bp-group">
              <h3>Rooms &amp; zones ({areas.length})</h3>
              <ul className="bp-rooms">
                {areas.map((a) => (
                  <li key={a.name}>
                    <span className="grow">
                      <span className="bp-room-name">{a.name}</span>
                      <span className="bp-room-meta">
                        {a.w}×{a.h}{a.meeting ? " · meeting" : a.private ? " · private" : ""}
                      </span>
                    </span>
                    {confirmDemolish === a.name ? (
                      <button className="btn btn-danger bp-small" onClick={() => { editMap(demolishOps(a.name)); setConfirmDemolish(null) }}>
                        Confirm
                      </button>
                    ) : (
                      <button className="icon-btn" title="Remove room (walls, furniture and zone)" aria-label={`Remove ${a.name}`}
                        onClick={() => setConfirmDemolish(a.name)}>
                        <Trash2 size={15} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>

      <footer className="bp-foot">
        <span className="bp-hint">
          {b.hover ? `Tile ${b.hover[0]}, ${b.hover[1]} · ` : ""}Right-drag to pan · Alt+click picks · Ctrl+Z undo
        </span>
        <button
          className={`btn ${confirmReset ? "btn-danger" : "btn-ghost"} bp-small`}
          onClick={() => {
            if (!confirmReset) { setConfirmReset(true); setTimeout(() => setConfirmReset(false), 4000); return }
            setConfirmReset(false)
            resetOfficeMap()
          }}
        >
          {confirmReset ? "Click again to reset" : "Reset map"}
        </button>
      </footer>
    </aside>
  )
}

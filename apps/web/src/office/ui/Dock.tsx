"use client"
// Minimized map dock shown at the bottom of the sidebar while the chat view is open.
import { ChevronDown, ChevronUp, MapPin, PictureInPicture2 } from "./icons"
import { areaAt } from "../game/map"
import { useOffice } from "../store"
import { Toolbar } from "./Toolbar"
import { Tile } from "./VideoBar"

export function Dock({ onLeave }: { onLeave: () => void }) {
  const office = useOffice()
  const me = office.me
  if (!me || office.sidebar !== "chat") return null
  const area = areaAt(me.x, me.y)
  const ids = [me.id, ...office.nearby].slice(0, 4)

  return (
    <section className="dock" aria-label="Your space">
      <header className="dock-head">
        <span className="dock-title">
          <MapPin size={12} /> {area?.name ?? "Hallway"}
        </span>
        <span className="dock-actions">
          <button
            className="dock-icon"
            aria-label={office.dockCollapsed ? "Expand" : "Collapse"}
            onClick={() => {
              office.dockCollapsed = !office.dockCollapsed
              office.emit()
            }}
          >
            {office.dockCollapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button className="dock-icon" aria-label="Back to map" title="Back to map" onClick={() => office.openSidebar("people")}>
            <PictureInPicture2 size={14} />
          </button>
        </span>
      </header>
      {!office.dockCollapsed && (
        <div className={`dock-tiles n${ids.length}`}>
          {ids.map((id) => {
            const p = office.players.get(id)
            if (!p) return null
            const stream = id === me.id ? office.screenStream ?? office.localStream : office.streams.get(id) ?? null
            return <Tile key={id} player={p} stream={stream} isMe={id === me.id} className="is-dock" avatarSize={36} />
          })}
        </div>
      )}
      <Toolbar onLeave={onLeave} compact />
    </section>
  )
}

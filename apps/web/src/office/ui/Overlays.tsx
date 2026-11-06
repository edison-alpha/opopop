"use client"
import {
  Crosshair,
  Lock,
  LockOpen,
  Map as MapIcon,
  Maximize,
  Minus,
  PanelLeftOpen,
  Plus,
  WifiOff,
} from "./icons"
import { useEffect, useRef } from "react"
import { renderMinimap } from "../game/art"
import { MAP_H, MAP_W, TILE, areaAt, onMapChange } from "../game/map"
import { getDeskForTile, getDeskClaim, unclaimDesk } from "../game/desks"
import { toggleLock, walkTo } from "../session"
import { store, useOffice } from "../store"
import { BuildButton } from "./BuildPanel"
import { StageActions } from "./StageActions"
import { LetterAvatar } from "./LetterAvatar"

/** Conversation chip at the top-left of the stage, plus the sidebar re-open button. */
export function StageHeader() {
  const office = useOffice()
  const me = office.me
  if (!me) return null
  const area = areaAt(me.x, me.y)
  const talking = [me, ...[...office.nearby].map((id) => office.players.get(id)).filter((p) => !!p)]
  const inConvo = office.nearby.size > 0
  const label = area?.private ? area.name : inConvo ? "Hallway conversation" : area?.name ?? "Hallway"
  const locked = me.lockedWith.length > 0
  return (
    <>
      <div className="stage-header">
        {!office.sidebarOpen && (
          <button className="chip-btn" aria-label="Open sidebar" onClick={() => office.openSidebar(office.sidebar)}>
            <PanelLeftOpen size={16} />
          </button>
        )}
        <div
          className="convo-chip"
          style={{ cursor: label.endsWith("'s desk") ? "pointer" : "default" }}
          onClick={() => {
            if (!label.endsWith("'s desk")) return
            const desk = getDeskForTile(me.x, me.y)
            if (desk) {
              const claim = getDeskClaim(desk.id)
              if (claim?.userId === me.id || claim?.userName.toLowerCase() === me.name.toLowerCase()) {
                office.toast(`🪑 ${label} (Your claimed desk)`, {
                  label: "Release Desk",
                  run: () => unclaimDesk(desk.id),
                })
              } else if (claim) {
                office.toast(`🪑 ${label} · Claimed by ${claim.userName}`)
              }
            }
          }}
          title={label.endsWith("'s desk") ? "Click for desk options" : undefined}
        >
          {inConvo && (
            <span className="avatar-stack tight">
              {talking.slice(0, 3).map((p) => (
                <LetterAvatar key={p.id} name={p.name} size={18} ring />
              ))}
            </span>
          )}
          <span>{label}</span>
          {label.endsWith("'s desk") && (
            <span style={{ opacity: 0.7, fontSize: 13, marginLeft: 3 }} title="Desk details">
              ⧉
            </span>
          )}
        </div>
        {inConvo && !area?.private && (
          <button
            className={`chip-btn dark ${locked ? "is-active" : ""}`}
            aria-label={locked ? "Unlock conversation" : "Lock conversation"}
            title={locked ? "Unlock conversation" : "Lock conversation so nobody else can join"}
            aria-pressed={locked}
            onClick={toggleLock}
          >
            {locked ? <Lock size={14} /> : <LockOpen size={14} />}
          </button>
        )}
        {!office.connected && office.meId && (
          <div className="convo-chip warn">
            <WifiOff size={13} /> Reconnecting…
          </div>
        )}
      </div>
      {!(office.inMeeting && !office.meetingMinimized) && (
        <div className="stage-actions-dock">
          <StageActions />
        </div>
      )}
    </>
  )
}

const MM_SCALE = 2

export function Minimap() {
  const office = useOffice()
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!office.minimap) return
    const c = ref.current!
    const ctx = c.getContext("2d")!
    let base = renderMinimap(MM_SCALE)
    c.width = base.width
    c.height = base.height
    const off = onMapChange(() => { base = renderMinimap(MM_SCALE) })
    let raf = 0
    const draw = () => {
      raf = requestAnimationFrame(draw)
      ctx.drawImage(base, 0, 0)
      const k = MM_SCALE / TILE
      const v = store.view
      ctx.strokeStyle = "rgba(255,255,255,0.85)"
      ctx.lineWidth = 1
      ctx.strokeRect(v.x * k + 0.5, v.y * k + 0.5, v.w * k, v.h * k)
      for (const p of store.players.values()) {
        ctx.fillStyle = p.id === store.meId ? "#ffffff" : "#2fbf71"
        ctx.beginPath()
        ctx.arc((p.rx + 0.5) * MM_SCALE, (p.ry + 0.5) * MM_SCALE, p.id === store.meId ? 2.5 : 2, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    draw()
    return () => {
      cancelAnimationFrame(raf)
      off()
    }
  }, [office.minimap])

  if (!office.minimap) return null
  return (
    <button
      className="minimap"
      aria-label="Minimap. Click to walk there."
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        const tx = Math.floor(((e.clientX - r.left) / r.width) * MAP_W)
        const ty = Math.floor(((e.clientY - r.top) / r.height) * MAP_H)
        walkTo(tx, ty)
      }}
    >
      <canvas ref={ref} />
    </button>
  )
}

export function MapControls() {
  const office = useOffice()
  return (
    <div className="map-controls" aria-label="Map controls">
      <BuildButton />
      <button className="mc-btn" title="Center on me" aria-label="Center on me" onClick={() => { office.recenter = true }}>
        <Crosshair size={16} />
      </button>
      <button className="mc-btn" title="Zoom in" aria-label="Zoom in" onClick={() => office.setZoom(office.zoom + 0.25)}>
        <Plus size={16} />
      </button>
      <button className="mc-btn" title="Zoom out" aria-label="Zoom out" onClick={() => office.setZoom(office.zoom - 0.25)}>
        <Minus size={16} />
      </button>
      <button
        className={`mc-btn ${office.minimap ? "is-active" : ""}`}
        title="Toggle minimap"
        aria-label="Toggle minimap"
        onClick={() => { office.minimap = !office.minimap; office.emit() }}
      >
        <MapIcon size={16} />
      </button>
      <button
        className="mc-btn"
        title="Full screen"
        aria-label="Full screen"
        onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {})}
      >
        <Maximize size={16} />
      </button>
    </div>
  )
}

export function ToastBar() {
  const office = useOffice()
  return (
    <div className="toast-bar" role="status" aria-live="polite">
      {office.toasts.map((t) => (
        <div key={t.id} className="toast">
          <span>{t.text}</span>
          {t.action && (
            <button
              className="toast-action"
              onClick={() => {
                t.action!.run()
                office.toasts = office.toasts.filter((x) => x.id !== t.id)
                office.emit()
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

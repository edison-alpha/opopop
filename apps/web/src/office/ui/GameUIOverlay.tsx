"use client"
import React, { useEffect, useState } from "react"
import { store, useOffice } from "../store"
import { TILE, areas } from "../game/map"
import { OFFICE_DESKS, getDeskClaim, claimDesk, unclaimDesk } from "../game/desks"

export function GameUIOverlay() {
  const office = useOffice()
  const view = office.view
  const zoom = office.zoom
  const me = office.me
  const hoverTile = office.hoverTile

  // State reaktif untuk klaim meja (agar update seketika saat diklaim/lepas)
  const [claimVersion, setClaimVersion] = useState(0)

  useEffect(() => {
    const onStorage = () => setClaimVersion((v) => v + 1)
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  if (view.w === 0 || view.h === 0) return null

  const isOverview = zoom <= 0.65

  // Helper konversi koordinat map pixel ke screen coordinate
  const toScreen = (wx: number, wy: number) => ({
    x: (wx - view.x) * zoom,
    y: (wy - view.y) * zoom,
  })

  // 1. Hover indicator (4 corner brackets + dark room pill)
  const renderHoverIndicator = () => {
    if (isOverview || !hoverTile || !hoverTile.areaName || office.build.open) return null

    const wx = hoverTile.tx * TILE
    const wy = hoverTile.ty * TILE
    const { x, y } = toScreen(wx, wy)
    const tileSize = TILE * zoom
    const corner = Math.max(5, Math.min(8, 6 * zoom))

    return (
      <div
        className="pointer-events-none"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: `translate3d(${x}px, ${y}px, 0)`,
          transition: "transform 0.12s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.1s ease",
          width: tileSize,
          height: tileSize,
          zIndex: 20,
        }}
      >
        {/* 4 Corner brackets ⌜ ⌝ ⌞ ⌟ */}
        <svg
          width={tileSize}
          height={tileSize}
          className="absolute inset-0 overflow-visible"
          style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }}
        >
          {/* Top-Left ⌜ */}
          <path
            d={`M 0 ${corner} L 0 0 L ${corner} 0`}
            stroke="#9ca3af"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Top-Right ⌝ */}
          <path
            d={`M ${tileSize - corner} 0 L ${tileSize} 0 L ${tileSize} ${corner}`}
            stroke="#9ca3af"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Bottom-Left ⌞ */}
          <path
            d={`M 0 ${tileSize - corner} L 0 ${tileSize} L ${corner} ${tileSize}`}
            stroke="#9ca3af"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Bottom-Right ⌟ */}
          <path
            d={`M ${tileSize - corner} ${tileSize} L ${tileSize} ${tileSize} L ${tileSize} ${tileSize - corner}`}
            stroke="#9ca3af"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>

        {/* Dark Room Label Pill (Sesuai Referensi Gambar 1 & Gambar 2) */}
        <div
          className="absolute z-20 flex items-center px-2.5 py-1 rounded-md bg-[#111827]/95 text-white font-semibold text-[11px] shadow-lg border border-neutral-700/80 pointer-events-none whitespace-nowrap"
          style={{
            left: tileSize + 4,
            top: tileSize - 8,
            boxShadow: "0 4px 10px rgba(0, 0, 0, 0.35)",
            backdropFilter: "blur(6px)",
          }}
        >
          {hoverTile.areaName}
        </div>
      </div>
    )
  }

  // 2. Player Nametag Pills (HD, crisp vector typography, status dot & caret)
  const renderPlayerTags = () => {
    return [...office.players.values()].map((p) => {
      const isMe = p.id === office.meId
      // World position di atas kepala avatar
      const wx = (p.rx + 0.5) * TILE
      const wy = (p.ry + 1) * TILE - 36
      const { x, y } = toScreen(wx, wy)

      return (
        <div
          key={p.id}
          className="absolute z-30 pointer-events-none flex flex-col items-center -translate-x-1/2 -translate-y-full"
          style={{
            left: 0,
            top: 0,
            transform: `translate3d(${x}px, ${y}px, 0)`,
            transition: "transform 0.08s linear",
          }}
        >
          <div
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-white shadow-md backdrop-blur ${
              isMe ? "bg-[#6366f1] ring-1 ring-indigo-400" : "bg-[#18181b]/95 ring-1 ring-neutral-700"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
            <span className="truncate max-w-[130px]">{p.name}</span>
            {p.mic === false && (
              <span className="text-[10px] text-red-300 opacity-90" title="Muted">
                ✕
              </span>
            )}
          </div>
          {/* Downward triangle caret pointing to the avatar */}
          <div
            className={`w-0 h-0 border-x-4 border-x-transparent border-t-4 ${
              isMe ? "border-t-[#6366f1]" : "border-t-[#18181b]/95"
            }`}
          />
        </div>
      )
    })
  }

  // 3. Desk Badges & Move Desk Here Buttons (Sesuai Referensi Gambar 2)
  const renderDeskBadges = () => {
    if (isOverview) return null

    return OFFICE_DESKS.map((desk) => {
      const claim = getDeskClaim(desk.id)
      const isClaimed = !!claim
      const isMyDesk = isClaimed && (claim.userId === me?.id || claim.userName.toLowerCase() === me?.name.toLowerCase())

      // Jarak avatar lokal ke meja
      const dist = me ? Math.hypot(me.x - desk.chairTile[0], me.y - desk.chairTile[1]) : 999
      const isNear = dist <= 3.2

      const { x, y } = toScreen(desk.btnPos.x, desk.btnPos.y)

      return (
        <div
          key={`${desk.id}-${claimVersion}`}
          className="absolute z-25 -translate-x-1/2 -translate-y-full flex flex-col items-center"
          style={{
            left: 0,
            top: 0,
            transform: `translate3d(${x}px, ${y}px, 0)`,
          }}
        >
          {isClaimed ? (
            <button
              onClick={() => {
                if (isMyDesk) {
                  office.toast(`🪑 ${claim.userName}'s desk (Your claimed desk)`, {
                    label: "Release Desk",
                    run: () => {
                      unclaimDesk(desk.id)
                      setClaimVersion((v) => v + 1)
                    },
                  })
                } else {
                  office.toast(`🪑 ${claim.userName}'s desk · Claimed`)
                }
              }}
              className={`pointer-events-auto flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold shadow-md border cursor-pointer transition hover:scale-105 active:scale-95 ${
                isMyDesk
                  ? "bg-[#6366f1] text-white border-indigo-400"
                  : "bg-[#18181b]/95 text-neutral-100 border-neutral-700"
              }`}
            >
              <span className="w-3.5 h-3.5 rounded-full bg-white/20 text-[9px] flex items-center justify-center font-bold">
                {claim.userInitial}
              </span>
              <span>{claim.userName}&apos;s desk</span>
            </button>
          ) : isNear ? (
            <button
              onClick={() => {
                if (!me) return
                claimDesk(desk.id, { id: me.id, name: me.name })
                setClaimVersion((v) => v + 1)
                office.toast(`🪑 Claimed ${desk.displayName}! Sit down to start private focus.`)
              }}
              className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-neutral-50 text-neutral-800 text-[11px] font-bold shadow-lg border border-neutral-200 cursor-pointer transition hover:scale-105 active:scale-95 animate-pulse"
              style={{
                boxShadow: "0 6px 16px rgba(0, 0, 0, 0.15)",
              }}
            >
              <span className="text-sm">🪑</span> Move Desk Here
            </button>
          ) : (
            <div className="pointer-events-none px-2.5 py-1 rounded-md bg-[#18181b]/90 text-neutral-200 text-[11px] font-semibold shadow-md border border-neutral-700/80">
              Unclaimed desk
            </div>
          )}
        </div>
      )
    })
  }

  // 4. Zoom-Out Overview Badges (Sesuai Referensi Gambar 2)
  const renderOverviewBadges = () => {
    if (!isOverview) return null

    return areas.map((a) => {
      let icon = ""
      let label = a.name
      let isDark = false
      let isTeam = false
      let isLounge = false

      if (a.name === "Engineering" || a.name === "Marketing & Sales" || a.name === "Design Studio" || a.name === "Team") {
        icon = "👥"
        label = "Team"
        isTeam = true
      } else if (a.meeting || a.private || a.name.startsWith("Focus Booth") || a.name.startsWith("Focus")) {
        icon = "🚪"
      } else if (
        a.name === "Lounge" ||
        a.name === "Café" ||
        a.name === "Game Room" ||
        a.name === "Library" ||
        a.name === "Pantry"
      ) {
        icon =
          a.name === "Lounge"
            ? "🛋️"
            : a.name === "Café"
              ? "☕"
              : a.name === "Game Room"
                ? "🎮"
                : a.name === "Library"
                  ? "📚"
                  : "🍳"
        isLounge = true
      } else if (a.name === "Lobby") {
        isDark = true
      }

      const displayText = icon ? `${icon} ${label}` : label
      const cx = (a.x + a.w / 2) * TILE
      const cy = (a.y + a.h / 2) * TILE
      const { x, y } = toScreen(cx, cy)

      return (
        <div
          key={a.name}
          className="absolute z-20 pointer-events-none -translate-x-1/2 -translate-y-1/2"
          style={{
            left: 0,
            top: 0,
            transform: `translate3d(${x}px, ${y}px, 0)`,
            transition: "opacity 0.2s ease",
          }}
        >
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-bold shadow-md border ${
              isDark
                ? "bg-[#111827]/95 text-white border-neutral-700"
                : isTeam
                  ? "bg-white/95 text-slate-800 border-neutral-200"
                  : isLounge
                    ? "bg-pink-50/95 text-pink-900 border-pink-200"
                    : "bg-slate-50/95 text-slate-700 border-slate-200"
            }`}
          >
            {displayText}
          </div>
        </div>
      )
    })
  }

  return (
    <div
      className="game-ui-overlay"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 4,
        overflow: "hidden",
      }}
    >
      {renderHoverIndicator()}
      {renderPlayerTags()}
      {renderDeskBadges()}
      {renderOverviewBadges()}
    </div>
  )
}

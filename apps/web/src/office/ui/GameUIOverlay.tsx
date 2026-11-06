"use client"
import React, { useCallback, useEffect, useRef, useState } from "react"
import { store, useOffice, type Avatar } from "../store"
import { registerMapOverlay } from "../game/overlayPositions"
import { TILE, areas, areaAt } from "../game/map"
import { OFFICE_DESKS, getDeskClaim, claimDesk, unclaimDesk } from "../game/desks"

function HeadOverlayItem({
  player,
  isMe,
}: {
  player: Avatar
  isMe: boolean
}) {
  const office = useOffice()
  const videoRef = useRef<HTMLVideoElement>(null)

  const stream = isMe ? office.localStream : (office.streams.get(player.id) ?? null)
  const isCamOn = !!player.cam
  const hasLiveVideo = !!stream && stream.getVideoTracks().some((t) => t.readyState === "live" && t.enabled)

  useEffect(() => {
    const v = videoRef.current
    if (v && v.srcObject !== stream) {
      v.srcObject = stream
    }
  }, [stream, isCamOn])

  const bindHead = useCallback((node: HTMLDivElement | null) => registerMapOverlay("head:" + player.id, node), [player.id])

  return (
    <div
      id={`head-overlay-${player.id}`}
      ref={bindHead}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        willChange: "transform",
        pointerEvents: "none",
        zIndex: isMe ? 35 : 30,
        transition: "none",
      }}
    >
      <div style={{transform: "translate(-50%, -100%)"}}>
      {isCamOn ? (
        // Floating Video Bubble directly above avatar head (Gather-style compact screen, NO name when cam is ON)
        <div
          style={{
            position: "relative",
            width: "96px",
            height: "72px",
            borderRadius: "10px",
            backgroundColor: "#0d0f15",
            border: "2px solid #6366f1",
            boxShadow: "0 6px 20px rgba(0, 0, 0, 0.45), 0 2px 8px rgba(99, 102, 241, 0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Live Video Feed container */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "8px",
              overflow: "hidden",
              backgroundColor: "#111318",
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={isMe}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: isMe && !player.screen ? "scaleX(-1)" : "none",
                display: hasLiveVideo ? "block" : "none",
              }}
            />
            {!hasLiveVideo && (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#161922",
                }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor: "#5c52e6",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "13px",
                    fontWeight: 700,
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  }}
                >
                  {player.name ? player.name.charAt(0).toUpperCase() : "U"}
                </div>
              </div>
            )}
          </div>

          {/* Downward triangle caret pointing directly to the avatar's head */}
          <div
            style={{
              position: "absolute",
              bottom: "-6px",
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderTop: "6px solid #6366f1",
            }}
          />
        </div>
      ) : (
        // Sleek HD Vector Nametag Pill (when camera is off)
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "3px 10px",
            borderRadius: "9999px",
            backgroundColor: isMe ? "#5c52e6" : "rgba(24, 25, 29, 0.95)",
            border: isMe ? "1px solid #818cf8" : "1px solid rgba(255, 255, 255, 0.16)",
            boxShadow: "0 3px 10px rgba(0, 0, 0, 0.35)",
            color: "#ffffff",
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: "11px",
            fontWeight: 600,
            whiteSpace: "nowrap",
            letterSpacing: "-0.01em",
          }}
        >
          {/* Green Status Dot (No X!) */}
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: "#22c55e",
              boxShadow: "0 0 4px rgba(34, 197, 94, 0.6)",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              maxWidth: "140px",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {player.name}
          </span>

          {/* Downward Caret pointing to head center */}
          <div
            style={{
              position: "absolute",
              bottom: "-4px",
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "4px solid transparent",
              borderRight: "4px solid transparent",
              borderTop: isMe ? "4px solid #5c52e6" : "4px solid rgba(24, 25, 29, 0.95)",
            }}
          />
        </div>
      )}
      </div>
    </div>
  )
}

export function GameUIOverlay() {
  const office = useOffice()
  const view = office.view
  const zoom = office.zoom
  const me = office.me
  const hoverTile = office.hoverTile

  // State reaktif untuk klaim meja (agar update seketika saat diklaim/lepas)
  const [claimVersion, setClaimVersion] = useState(0)
  const bindHover = useCallback((node: HTMLDivElement | null) => registerMapOverlay("hover-tile", node), [])

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
  // Aturan User: "kalau saya emang udah ada di area tersebut dan mouse saya di area itu juga yaudah gausah dimunculin"
  const renderHoverIndicator = () => {
    if (isOverview || !hoverTile || office.build.open) return null

    // Cek area tempat pemain saat ini berdiri
    const myAreaName = office.areaName || (me ? areaAt(me.x, me.y)?.name : null)

    // JIKA kursor berada di ruangan/area yang sama dengan pemain -> SEMBUNYIKAN (tidak muncul)
    const showLabel = !!hoverTile.areaName && hoverTile.areaName !== myAreaName

    const tileSize = TILE * zoom

    // Format label persis Gather (seperti pada screenshot: "Coworking area: Central Couches")
    let displayTitle = hoverTile.areaName ?? ""
    if (hoverTile.areaName === "Central Couches") {
      displayTitle = "Coworking area: Central Couches"
    } else if (hoverTile.areaName === "Team") {
      displayTitle = "Coworking area: Team Workstations"
    } else if (hoverTile.areaName === "Lobby") {
      displayTitle = "Lobby & Reception"
    } else if (hoverTile.areaName?.startsWith("Focus Booth")) {
      displayTitle = `Private Office: ${hoverTile.areaName}`
    }

    return (
      <div
        ref={bindHover}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          willChange: "transform",
          width: tileSize,
          height: tileSize,
          zIndex: 20,
          pointerEvents: "none",
        }}
      >
        <div aria-hidden="true" style={{position:"absolute",inset:1,border:"1px dotted rgba(255,255,255,0.8)",backgroundImage:"url(/assets/office/hover-tile.png)",backgroundSize:"100% 100%",imageRendering:"pixelated",filter:"drop-shadow(0 1px 1px #0005)"}} />

        {/* Room label stays separate from the tile highlight. */}
        {showLabel && <div
          style={{
            position: "absolute",
            left: "50%",
            top: tileSize + 8,
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            padding: "5px 12px",
            borderRadius: "8px",
            backgroundColor: "rgba(24, 25, 29, 0.95)",
            border: "1px solid rgba(255, 255, 255, 0.16)",
            boxShadow: "0 4px 14px rgba(0, 0, 0, 0.45)",
            color: "#ffffff",
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: "12px",
            fontWeight: 500,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            letterSpacing: "-0.01em",
            zIndex: 30,
          }}
        >
          {displayTitle}
        </div>}
      </div>
    )
  }

  // 2. Desk Badges & Move Desk Here Buttons (Sesuai Referensi Gambar 2)
  const renderDeskBadges = () => {
    if (isOverview) return null

    return OFFICE_DESKS.map((desk) => {
      const claim = getDeskClaim(desk.id)
      const isClaimed = !!claim
      const isMyDesk = isClaimed && (claim.userId === me?.id || claim.userName.toLowerCase() === me?.name.toLowerCase())

      // Jarak avatar lokal ke meja
      const dist = me ? Math.hypot(me.x - desk.chairTile[0], me.y - desk.chairTile[1]) : 999
      const isNear = dist <= 3.2
      const isHovered = hoverTile && desk.deskTiles.some(([x, y]) => x === hoverTile.tx && y === hoverTile.ty)
      if (!isNear && !isHovered && !isMyDesk) return null

      const { x, y } = toScreen(desk.btnPos.x, desk.btnPos.y)

      return (
        <div
          key={`${desk.id}-${claimVersion}`}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            transform: `translate3d(${x}px, ${y}px, 0) translate(-50%, -100%)`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            zIndex: 25,
          }}
        >
          {!isClaimed && isNear && <span style={{ background: "#252529ed", color: "white", padding: "5px 9px", borderRadius: 7, fontSize: 13, marginBottom: 4 }}>Unclaimed desk</span>}
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
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 10px",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: 600,
                color: "#ffffff",
                backgroundColor: isMyDesk ? "#5c52e6" : "rgba(24, 25, 29, 0.94)",
                border: isMyDesk ? "1px solid #818cf8" : "1px solid rgba(255, 255, 255, 0.15)",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
                cursor: "pointer",
                pointerEvents: "auto",
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              }}
            >
              <span
                style={{
                  width: "14px",
                  height: "14px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(255,255,255,0.2)",
                  fontSize: "9px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                }}
              >
                {claim.userInitial}
              </span>
              <span>{claim.userName}&apos;s desk</span>
            </button>
          ) : isNear ? (
            <button
              onClick={() => {
                if (!me) return
                if (!claimDesk(desk.id, { id: me.id, name: me.name })) {
                  office.toast("This desk is already claimed.")
                  return
                }
                setClaimVersion((v) => v + 1)
                office.toast(`🪑 Claimed ${desk.displayName}! Sit down to start private focus.`)
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "8px",
                fontSize: "11px",
                fontWeight: 700,
                color: "#111827",
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                boxShadow: "0 4px 14px rgba(0, 0, 0, 0.18)",
                cursor: "pointer",
                pointerEvents: "auto",
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              }}
            >
              <span style={{ fontSize: "14px" }}>🪑</span> Move Desk Here
            </button>
          ) : (
            <div
              style={{
                padding: "4px 10px",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: 600,
                color: "#e2e8f0",
                backgroundColor: "rgba(24, 25, 29, 0.92)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                boxShadow: "0 2px 6px rgba(0, 0, 0, 0.25)",
                pointerEvents: "none",
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              }}
            >
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
        a.name === "Central Couches" ||
        a.name === "Café" ||
        a.name === "Game Room" ||
        a.name === "Library" ||
        a.name === "Pantry"
      ) {
        icon =
          a.name === "Central Couches"
            ? "🛋️"
            : a.name === "Café"
              ? "☕"
              : a.name === "Game Room"
                ? "🎮"
                : a.name === "Library"
                  ? "📚"
                  : "🍳"
        isLounge = true
      } else if (a.name === "Lobby" || a.name === "Media Room") {
        isDark = true
      }

      const displayText = icon ? `${icon} ${label}` : label
      const cx = (a.x + a.w / 2) * TILE
      const cy = (a.y + a.h / 2) * TILE
      const { x, y } = toScreen(cx, cy)

      return (
        <div
          key={a.name}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            transform: `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`,
            transition: "opacity 0.2s ease",
            pointerEvents: "none",
            zIndex: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 12px",
              borderRadius: "9999px",
              fontSize: "12px",
              fontWeight: 700,
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.25)",
              border: isDark
                ? "1px solid rgba(255, 255, 255, 0.15)"
                : "1px solid #e2e8f0",
              backgroundColor: isDark
                ? "rgba(24, 25, 29, 0.95)"
                : isTeam
                  ? "#ffffff"
                  : isLounge
                    ? "#fff1f2"
                    : "#f8fafc",
              color: isDark
                ? "#ffffff"
                : isTeam
                  ? "#1e293b"
                  : isLounge
                    ? "#9f1239"
                    : "#334155",
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              whiteSpace: "nowrap",
            }}
          >
            {displayText}
          </div>
        </div>
      )
    })
  }

  // 4. Player Head Overlays (Nametag Pills & Camera Video Bubbles)
  const renderPlayerOverlays = () => {
    if (isOverview || !office.preferences.nameLabels) return null

    return Array.from(office.players.values()).map((p) => (
      <HeadOverlayItem
        key={p.id}
        player={p}
        isMe={p.id === office.meId}
      />
    ))
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
      {renderDeskBadges()}
      {renderOverviewBadges()}
      {renderPlayerOverlays()}
    </div>
  )
}

"use client"
// Dev preview: seated poses on real seat sprites, and the build panel.
import { useEffect, useRef } from "react"
import { randomLook, renderObjectThumb } from "@/office/game/art"
import { drawAvatar } from "@/office/game/avatar"
import { SEATS, TILE, type Obj } from "@/office/game/map"
import { store } from "@/office/store"
import { BuildPanel } from "@/office/ui"

const SEAT_LIST: Obj[] = ["chair", "chairUp", "chairL", "chairR", "officeChair", "officeChairUp", "sofa", "sofaUp", "bench", "stool", "beanbag"]

function SeatDemo() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current!
    const S = 3
    c.width = SEAT_LIST.length * 4 * TILE * S
    c.height = 4 * TILE * S
    const ctx = c.getContext("2d")!
    ctx.imageSmoothingEnabled = false
    ctx.scale(S, S)
    ctx.fillStyle = "#f4e3cd"
    ctx.fillRect(0, 0, c.width, c.height)
    SEAT_LIST.forEach((o, i) => {
      const ox = i * 4 * TILE
      ctx.drawImage(renderObjectThumb(o), ox, 0)
      const seat = SEATS[o]!
      const dir = seat.dir === "any" ? "down" : seat.dir
      drawAvatar(ctx, randomLook(), ox + TILE + 16, 3 * TILE + 2 - seat.lift - 2, dir, 0, 1, "sit")
      if (seat.frontFrom !== undefined) {
        // chair back in front of the sitter, like the in-game seat layer
        const t = renderObjectThumb(o)
        ctx.drawImage(t, TILE, 2 * TILE + seat.frontFrom, TILE, TILE - seat.frontFrom, ox + TILE, 2 * TILE + seat.frontFrom, TILE, TILE - seat.frontFrom)
      }
    })
  }, [])
  return <canvas ref={ref} style={{ imageRendering: "pixelated", maxWidth: "100%" }} />
}

export default function BuildDev() {
  useEffect(() => {
    store.build.open = true
    store.emit()
  }, [])
  return (
    <div style={{ padding: 16, background: "#e9ebef", minHeight: "100vh" }}>
      <SeatDemo />
      <div style={{ position: "relative", height: 760, marginTop: 16 }}>
        <BuildPanel />
      </div>
    </div>
  )
}

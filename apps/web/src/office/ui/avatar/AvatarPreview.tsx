"use client"
import { useEffect, useRef } from "react"
import type { AvatarLook, Dir } from "@/shared/protocol"
import { drawAvatar } from "../../game/art"

// Avatars are drawn into a 48x50 virtual box with feet at y = 48.
const BOX = 50
const FEET = 48

/**
 * Renders a single avatar at an integer-ish pixel scale; optionally walks in place.
 * `crop="head"` zooms in on the head (used for hair/hat/glasses thumbnails).
 */
export function AvatarPreview({
  look,
  size = 64,
  dir = "down",
  animate = false,
  crop = "full",
  pose = "stand",
  className,
}: {
  look: AvatarLook
  size?: number
  dir?: Dir
  animate?: boolean
  crop?: "full" | "head"
  pose?: "stand" | "sit"
  className?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const c = ref.current!
    const ctx = c.getContext("2d")!
    const dpr = window.devicePixelRatio || 1
    const px = Math.round(size * dpr)
    c.width = px
    c.height = px
    let frame = 0
    let timer: ReturnType<typeof setInterval> | undefined
    const draw = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, px, px)
      ctx.imageSmoothingEnabled = false
      if (crop === "head") {
        const s = px / 30
        ctx.setTransform(s, 0, 0, s, px / 2 - 24 * s, px / 2 - (FEET - 31) * s)
      } else {
        const s = px / BOX
        ctx.setTransform(s, 0, 0, s, 0, 0)
      }
      drawAvatar(ctx, look, 24, FEET, dir, animate ? frame % 2 : 0, 1, pose)
    }
    draw()
    if (animate) {
      timer = setInterval(() => {
        frame++
        draw()
      }, 260)
    }
    return () => clearInterval(timer)
  }, [look, size, dir, animate, crop, pose])

  return <canvas ref={ref} className={className} style={{ width: size, height: size, imageRendering: "pixelated" }} aria-hidden />
}

/** Draws the avatar facing down at `scale`x and returns a PNG data URL. */
export function avatarPng(look: AvatarLook, scale = 8): string {
  const c = document.createElement("canvas")
  c.width = 48 * scale
  c.height = BOX * scale
  const ctx = c.getContext("2d")!
  ctx.imageSmoothingEnabled = false
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  drawAvatar(ctx, look, 24, FEET, "down", 0)
  return c.toDataURL("image/png")
}

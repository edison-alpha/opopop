"use client"
// Dev preview of the full static map, used to review the art.
import { useEffect, useRef } from "react"
import { renderStaticMap } from "@/office/game/art"

export default function MapPreview() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const c = renderStaticMap()
    c.style.imageRendering = "pixelated"
    ref.current?.replaceChildren(c)
  }, [])
  return <div ref={ref} style={{ background: "#fff" }} />
}

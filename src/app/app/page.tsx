"use client"
import dynamic from "next/dynamic"

// Canvas, WebRTC and localStorage are browser-only.
const Office = dynamic(() => import("@/office/Office"), { ssr: false })

export default function OfficePage() {
  return <Office />
}

"use client"
import type { Status } from "@/shared/protocol"
import { nameColor } from "../../game/art"

export function LetterAvatar({
  name,
  size = 32,
  status,
  ring,
}: {
  name: string
  size?: number
  status?: Status
  ring?: boolean
}) {
  return (
    <span
      className={`letter-avatar ${ring ? "has-ring" : ""}`}
      style={{ width: size, height: size, background: nameColor(name), fontSize: Math.round(size * 0.45) }}
      aria-hidden
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
      {status && <span className={`status-dot status-${status}`} />}
    </span>
  )
}

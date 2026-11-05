"use client"
// Dev preview of the avatar editor and a sheet of random avatars, used to review the art.
import type { AvatarLook } from "@/shared/protocol"
import { useState } from "react"
import { randomLook } from "@/office/game/art"
import { AvatarEditor } from "@/office/ui/AvatarEditor"
import { AvatarPreview } from "@/office/ui/AvatarPreview"

const START: AvatarLook = {
  skin: "#f1c27d", hair: "#4a2f1d", hairStyle: 0, shirt: "#ffffff", pants: "#2c3e66",
  top: 1, jacket: 1, jacketColor: "#2d2f3a", shoes: "#2d2f3a", other: 5, otherColor: "#33b5f0",
}

export default function AvatarDev() {
  const [look, setLook] = useState<AvatarLook>(START)
  const [sheet] = useState(() => Array.from({ length: 24 }, randomLook))
  return (
    <div style={{ padding: 24, background: "#e9ebef", minHeight: "100vh", display: "grid", gap: 24 }}>
      <div className="modal ae-modal" style={{ margin: "0 auto" }}>
        <header className="ae-modal-head"><h2>Edit Avatar</h2></header>
        <AvatarEditor look={look} onChange={setLook} name="bayumuktywibowo02" />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
        {sheet.map((l, i) => (
          <div key={i} style={{ background: "#f4e3cd", borderRadius: 8, display: "flex" }}>
            {(["down", "left", "up", "right"] as const).map((d) => <AvatarPreview key={d} look={l} size={72} dir={d} />)}
          </div>
        ))}
      </div>
    </div>
  )
}

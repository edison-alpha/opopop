"use client"
import { useEffect, useRef, useState } from "react"
import { mountMapPreview } from "./preview"
import { areas } from "@/office/game/map"
import { loadOfficeSprites, OFFICE_SPRITE_FRAMES, OFFICE_SPRITES_URL } from "@/office/game/sprites"

export default function MapPreview() {
  const ref = useRef<HTMLDivElement>(null)
  const [tab, setTab] = useState("map")
  const [room, setRoom] = useState("Full office")
  const [zoom, setZoom] = useState(false)
  const [ready, setReady] = useState(false)
  useEffect(() => { void loadOfficeSprites().then(() => setReady(true)) }, [])
  useEffect(() => {
    if (!ready || tab !== "map") return
    if (ref.current) return mountMapPreview(ref.current, room, zoom)
  }, [ready, tab, room, zoom])
  const control = { background: "#243744", color: "#e5eeef", border: "1px solid #435765", padding: "9px 14px", borderRadius: 8, cursor: "pointer" }
  return <main style={{ background: "#101c24", color: "#e5eeef", minHeight: "100vh", fontFamily: "system-ui" }}>
    <header style={{ padding: "22px 28px", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", borderBottom: "1px solid #334650" }}>
      <div style={{ marginRight: "auto" }}><strong style={{ fontSize: 21 }}>OPERRA · Office studio</strong><div style={{ fontSize: 13, color: "#9eb3bc", marginTop: 4 }}>14 spaces · {Object.keys(OFFICE_SPRITE_FRAMES).length} furniture sprites · Klik map lalu gunakan WASD / panah, atau klik tujuan</div></div>
      <button style={control} onClick={() => setTab("map")}>Office map</button>
      <button style={control} onClick={() => setTab("assets")}>Asset library · {Object.keys(OFFICE_SPRITE_FRAMES).length}</button>
      {tab === "map" && <><select aria-label="Preview room" style={control} value={room} onChange={e => setRoom(e.target.value)}><option>Full office</option>{areas.map(a => <option key={a.name}>{a.name}</option>)}</select><button style={control} onClick={() => setZoom(!zoom)}>{zoom ? "Fit view" : "Zoom 2×"}</button></>}
    </header>
    {tab === "map" ? <div ref={ref} style={{ overflow: "auto", maxHeight: "calc(100vh - 100px)", background: "#d2ecc7" }} aria-label="Office layout preview" /> :
      <section style={{ padding: 28, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: 14 }}>
        {Object.entries(OFFICE_SPRITE_FRAMES).map(([name, f]) => <article key={name} style={{ background: "#20313c", border: "1px solid #354a56", borderRadius: 12, padding: 14, display: "grid", justifyItems: "center", gap: 12 }}>
          <div style={{ width: 112, height: 112, display: "grid", placeItems: "center", background: "#b8d0c4", borderRadius: 7 }}><div role="img" aria-label={name} style={{ width: f.w, height: f.h, backgroundImage: `url(${OFFICE_SPRITES_URL})`, backgroundPosition: `-${f.x}px -${f.y}px`, imageRendering: "pixelated" }} /></div>
          <span style={{ fontSize: 12 }}>{name.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase())}</span>
        </article>)}
      </section>}
  </main>
}

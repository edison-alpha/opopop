"use client"
// Top-right action bar, shown on the map and in meetings:
// share a website · ambient music · invite link · mini mode · map/grid layout.
import { useState } from "react"
import { isAmbientOn, startAmbient, stopAmbient } from "../ambient"
import { copyInviteLink, sendChat } from "../session"
import { useOffice } from "../store"
import { useClickOutside } from "./Toolbar"
import { Globe, LayoutGrid, Link2, Map as MapIcon, Music, PictureInPicture2, Plus } from "./icons"

let pipVideo: HTMLVideoElement | null = null

/** Mini mode: the live map in a floating picture-in-picture window. */
async function toggleMiniMode(): Promise<string | null> {
  if (document.pictureInPictureElement) {
    await document.exitPictureInPicture()
    return null
  }
  const canvas = document.querySelector<HTMLCanvasElement>(".game-host canvas")
  if (!canvas || !("captureStream" in canvas) || !document.pictureInPictureEnabled) return "Mini mode isn't supported in this browser"
  if (!pipVideo) {
    pipVideo = document.createElement("video")
    pipVideo.muted = true
    pipVideo.playsInline = true
  }
  pipVideo.srcObject = canvas.captureStream(20)
  await pipVideo.play()
  await pipVideo.requestPictureInPicture()
  return null
}

export function StageActions({ inMeeting = false }: { inMeeting?: boolean }) {
  const office = useOffice()
  const [sharing, setSharing] = useState(false)
  const [url, setUrl] = useState("")
  const [music, setMusic] = useState(isAmbientOn())
  const ref = useClickOutside<HTMLDivElement>(sharing, () => setSharing(false))

  const gridActive = inMeeting || office.stageView === "grid"
  const shareSite = () => {
    let u = url.trim()
    if (!u) return
    if (!/^https?:\/\//i.test(u)) u = `https://${u}`
    try {
      new URL(u)
    } catch {
      office.toast("That doesn't look like a web address")
      return
    }
    sendChat(`🌐 Shared a website: ${u}`, "nearby")
    window.open(u, "_blank", "noopener,noreferrer")
    office.toast(office.nearby.size ? "Website shared with people nearby" : "Website opened. Nobody nearby to share with yet")
    setUrl("")
    setSharing(false)
  }

  return (
    <div className="stage-actions" ref={ref}>
      <div className="sa-group sa-anchor">
        <button className={`sa-btn wide ${sharing ? "is-active" : ""}`} title="Share a website" aria-label="Share a website" onClick={() => setSharing(!sharing)}>
          <Globe size={16} />
          <Plus size={13} />
        </button>
        {sharing && (
          <form className="popover sa-pop dark" onSubmit={(e) => { e.preventDefault(); shareSite() }}>
            <div className="sa-pop-title">Share a website</div>
            <p className="sa-pop-hint">Opens it for you and posts the link to people nearby.</p>
            <input className="input" autoFocus placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
            <button className="btn btn-blue" disabled={!url.trim()}>Share</button>
          </form>
        )}
      </div>
      <div className="sa-group">
        <button
          className={`sa-btn ${music ? "is-active" : ""}`}
          title={music ? "Stop background music" : "Play background music"}
          aria-label="Background music"
          aria-pressed={music}
          onClick={() => {
            if (music) stopAmbient()
            else startAmbient()
            setMusic(!music)
          }}
        >
          <Music size={16} />
        </button>
      </div>
      <div className="sa-group">
        <button className="sa-btn" title="Copy invite link" aria-label="Copy invite link" onClick={() => void copyInviteLink()}>
          <Link2 size={16} />
        </button>
      </div>
      <div className="sa-group">
        <button
          className="sa-btn"
          title="Mini mode"
          aria-label="Mini mode"
          onClick={() => void toggleMiniMode().then((err) => err && office.toast(err)).catch(() => office.toast("Couldn't open mini mode"))}
        >
          <PictureInPicture2 size={16} />
        </button>
      </div>
      <div className="sa-group">
        <button
          className={`sa-btn ${gridActive ? "" : "is-active"}`}
          title="Map view"
          aria-label="Map view"
          aria-pressed={!gridActive}
          onClick={() => {
            if (inMeeting) office.meetingMinimized = true
            office.stageView = "map"
            office.emit()
          }}
        >
          <MapIcon size={16} />
        </button>
        <button
          className={`sa-btn ${gridActive ? "is-active" : ""}`}
          title={office.inMeeting ? "Meeting view" : "Grid view"}
          aria-label={office.inMeeting ? "Meeting view" : "Grid view"}
          aria-pressed={gridActive}
          onClick={() => {
            if (office.inMeeting) office.meetingMinimized = false
            else office.stageView = "grid"
            office.emit()
          }}
        >
          <LayoutGrid size={16} />
        </button>
      </div>
    </div>
  )
}

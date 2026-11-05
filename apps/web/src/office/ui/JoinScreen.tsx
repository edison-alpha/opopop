"use client"
import type { AvatarLook } from "@/shared/protocol"
import { Mic, MicOff, Video, VideoOff } from "./icons"
import { useEffect, useRef, useState } from "react"
import { randomLook } from "../game/art"
import { AvatarEditor } from "./AvatarEditor"

const PROFILE_KEY = "oppera.profile"

interface Profile {
  name: string
  role?: string
  look: AvatarLook
}

function loadProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    return raw ? (JSON.parse(raw) as Profile) : null
  } catch {
    return null
  }
}

export function JoinScreen({
  onJoin,
}: {
  onJoin: (p: { name: string; role: string; look: AvatarLook; stream: MediaStream | null }) => void
}) {
  const [name, setName] = useState("")
  const [role, setRole] = useState("")
  const [look, setLook] = useState<AvatarLook | null>(null)
  const [step, setStep] = useState<"avatar" | "media">("avatar")
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [mic, setMic] = useState(true)
  const [cam, setCam] = useState(true)
  const [mediaError, setMediaError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const p = loadProfile()
    setName(p?.name ?? "")
    setRole(typeof p?.role === "string" ? p.role : "")
    setLook(p?.look ?? randomLook())
  }, [])

  useEffect(() => {
    if (step !== "media") return
    let cancelled = false
    navigator.mediaDevices
      ?.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: { width: 640, height: 360 } })
      .then((s) => {
        if (cancelled) s.getTracks().forEach((t) => t.stop())
        else setStream(s)
      })
      .catch(() => setMediaError("Camera and microphone are blocked. You can still join and enable them later."))
    return () => {
      cancelled = true
    }
  }, [step])

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream
  }, [stream, cam])

  useEffect(() => {
    stream?.getAudioTracks().forEach((t) => (t.enabled = mic))
  }, [mic, stream])
  useEffect(() => {
    stream?.getVideoTracks().forEach((t) => (t.enabled = cam))
  }, [cam, stream])

  if (!look) return <div className="join-screen" />

  const trimmed = name.trim()

  const finish = () => {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...loadProfile(), name: trimmed, role: role.trim(), look }))
    } catch {
      // storage unavailable; profile just won't be remembered
    }
    // A disabled camera is stopped so the device light turns off.
    if (stream && !cam) {
      for (const t of stream.getVideoTracks()) {
        t.stop()
        stream.removeTrack(t)
      }
    }
    onJoin({ name: trimmed, role: role.trim(), look, stream })
  }

  return (
    <div className="join-screen">
      <div className="join-card">
        <header className="join-header">
          <span className="brand-mark" aria-hidden>
            O
          </span>
          <span className="brand-name">OPPERA</span>
          <ol className="join-steps" aria-label="Steps">
            <li className={step === "avatar" ? "is-active" : ""}>1. Avatar</li>
            <li className={step === "media" ? "is-active" : ""}>2. Camera &amp; mic</li>
          </ol>
        </header>

        {step === "avatar" ? (
          <>
            <h1 className="join-title">Welcome! Let&apos;s set up your character</h1>
            <AvatarEditor look={look} onChange={setLook} name={trimmed || "You"} />
            <form
              className="join-footer join-identity"
              onSubmit={(e) => {
                e.preventDefault()
                if (trimmed) setStep("media")
              }}
            >
              <label className="field grow">
                <span className="field-label">Name</span>
                <input
                  className="input"
                  value={name}
                  maxLength={32}
                  autoFocus
                  placeholder="What should people call you?"
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label className="field grow">
                <span className="field-label">Role <span className="join-optional">(optional)</span></span>
                <input className="input" value={role} maxLength={48} placeholder="e.g. Designer, Developer" onChange={(e) => setRole(e.target.value)} />
              </label>
              <button className="btn btn-primary" disabled={!trimmed}>
                Next
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="join-title">Check your hair and audio before going in</h1>
            <div className="media-check">
              <div className="media-preview">
                {stream && cam ? (
                  <video ref={videoRef} autoPlay playsInline muted className="mirror" />
                ) : (
                  <img src="/assets/gather/avatar-at-office-door.png" alt="" className="media-placeholder" />
                )}
                <div className="media-preview-name">{trimmed}</div>
                <div className="media-toggles">
                  <button
                    type="button"
                    className={`round-btn ${mic ? "" : "is-off"}`}
                    aria-label={mic ? "Mute microphone" : "Unmute microphone"}
                    onClick={() => setMic(!mic)}
                    disabled={!stream}
                  >
                    {mic ? <Mic size={18} /> : <MicOff size={18} />}
                  </button>
                  <button
                    type="button"
                    className={`round-btn ${cam ? "" : "is-off"}`}
                    aria-label={cam ? "Turn camera off" : "Turn camera on"}
                    onClick={() => setCam(!cam)}
                    disabled={!stream}
                  >
                    {cam ? <Video size={18} /> : <VideoOff size={18} />}
                  </button>
                </div>
              </div>
              {mediaError && <p className="hint warn">{mediaError}</p>}
            </div>
            <div className="join-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setStep("avatar")}>
                Back
              </button>
              <button type="button" className="btn btn-primary" onClick={finish} autoFocus>
                Join the office
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

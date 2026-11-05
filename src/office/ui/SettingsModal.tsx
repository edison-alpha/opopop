"use client"
import type { AvatarLook } from "@/shared/protocol"
import { Pencil, X } from "./icons"
import { useEffect, useRef, useState } from "react"
import { listDevices, setDevice, setLook, setName } from "../session"
import { useOffice } from "../store"
import { AvatarPreview } from "./AvatarPreview"
import { EditAvatarModal, saveProfile } from "./ProfileModals"

type Tab = "profile" | "av" | "shortcuts"

const SHORTCUTS: [string, string][] = [
  ["Move", "W A S D / Arrow keys"],
  ["Walk to a spot", "Click on the map"],
  ["React", "1 – 6"],
  ["Toggle microphone", "Ctrl + Shift + A"],
  ["Toggle camera", "Ctrl + Shift + V"],
  ["Turn mic, camera and share off", "Ctrl + Shift + D"],
  ["Open chat", "Enter"],
  ["Search", "Ctrl + K"],
  ["Search people", "Ctrl + F"],
  ["Zoom", "Ctrl + Scroll"],
]

function DevicesTab() {
  const office = useOffice()
  const [d, setD] = useState<Awaited<ReturnType<typeof listDevices>>>({ audioIn: [], videoIn: [], audioOut: [] })
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    void listDevices().then(setD)
  }, [])
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = office.localStream
  })

  const hasVideo = !!office.localStream?.getVideoTracks().some((t) => t.readyState === "live")
  const select = (kind: "audioIn" | "videoIn" | "audioOut", list: MediaDeviceInfo[], label: string) => (
    <label className="field">
      <span className="field-label">{label}</span>
      <select className="input" value={office.devices[kind]} onChange={(e) => void setDevice(kind, e.target.value)}>
        <option value="">System default</option>
        {list.map((x, i) => (
          <option key={x.deviceId || i} value={x.deviceId}>
            {x.label || `${label} ${i + 1}`}
          </option>
        ))}
      </select>
    </label>
  )

  return (
    <div className="settings-av">
      <div className="settings-preview">
        {hasVideo ? <video ref={videoRef} autoPlay playsInline muted className="mirror" /> : <span className="muted">Camera is off</span>}
      </div>
      {select("videoIn", d.videoIn, "Camera")}
      {select("audioIn", d.audioIn, "Microphone")}
      {d.audioOut.length > 0 && select("audioOut", d.audioOut, "Speaker")}
      <p className="hint">Noise suppression and echo cancellation are on for your microphone.</p>
    </div>
  )
}

export function SettingsModal() {
  const office = useOffice()
  const [tab, setTab] = useState<Tab>("profile")
  const me = office.me
  const [name, setNameDraft] = useState(me?.name ?? "")
  const [look, setLookDraft] = useState<AvatarLook | null>(me?.look ?? null)
  const [editingAvatar, setEditingAvatar] = useState(false)

  useEffect(() => {
    if (office.settingsOpen && office.me) {
      setNameDraft(office.me.name)
      setLookDraft(office.me.look)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [office.settingsOpen])

  if (!office.settingsOpen || !me || !look) return null
  const close = () => {
    office.settingsOpen = false
    office.emit()
  }

  return (
    <div className="modal-backdrop" onClick={close}>
      <div className="modal settings" role="dialog" aria-label="Settings" onClick={(e) => e.stopPropagation()}>
        <nav className="settings-nav" aria-label="Settings sections">
          <h2>Settings</h2>
          {([["profile", "Profile"], ["av", "Audio & video"], ["shortcuts", "Shortcuts"]] as [Tab, string][]).map(([id, label]) => (
            <button key={id} className={`settings-tab ${tab === id ? "is-active" : ""}`} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </nav>
        <section className="settings-body">
          <div className="modal-head">
            <h3>{tab === "profile" ? "Profile" : tab === "av" ? "Audio & video" : "Keyboard shortcuts"}</h3>
            <button className="icon-btn" aria-label="Close settings" onClick={close}>
              <X size={18} />
            </button>
          </div>
          {tab === "profile" && (
            <>
              <label className="field">
                <span className="field-label">Display name</span>
                <input className="input" value={name} maxLength={32} onChange={(e) => setNameDraft(e.target.value)} />
              </label>
              <div className="field">
                <span className="field-label">Avatar</span>
                <div className="settings-avatar">
                  <button type="button" className="profile-pic-circle is-avatar" aria-label="Edit avatar" onClick={() => setEditingAvatar(true)}>
                    <AvatarPreview look={look} size={72} />
                    <span className="profile-pic-edit" aria-hidden><Pencil size={12} /></span>
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setEditingAvatar(true)}>Customize avatar</button>
                </div>
              </div>
              {editingAvatar && (
                <EditAvatarModal
                  initial={look}
                  name={name.trim() || me.name}
                  onCancel={() => setEditingAvatar(false)}
                  onDone={(l) => { setLookDraft(l); setEditingAvatar(false) }}
                />
              )}
              <div className="modal-actions">
                <button
                  className="btn btn-blue"
                  onClick={() => {
                    if (name.trim() && name !== me.name) setName(name.trim())
                    setLook(look)
                    saveProfile({ name: name.trim() || me.name, look })
                    office.toast("Profile saved")
                    close()
                  }}
                >
                  Save profile
                </button>
              </div>
            </>
          )}
          {tab === "av" && <DevicesTab />}
          {tab === "shortcuts" && (
            <dl className="shortcut-list">
              {SHORTCUTS.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      </div>
    </div>
  )
}

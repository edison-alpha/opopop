"use client"
import type { AvatarLook } from "@/shared/protocol"
import { Bell, Brush, CalendarDays, CalendarClock, Keyboard, Map as MapIcon, MessageCircle, Mic, Pencil, PictureInPicture2, Record, Settings, Smile, Users, Video, X, Zap } from "./icons"
import type { IconProps } from "./icons"
import type { ComponentType, ReactNode } from "react"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { copyInviteLink, listDevices, setDevice, setLook, setName, setRole } from "../session"
import { isRecording, startRecording, stopRecording } from "../recorder"
import { useOffice } from "../store"
import { AvatarPreview } from "./AvatarPreview"
import { EditAvatarModal, saveProfile } from "./ProfileModals"
import { toggleMiniMode } from "./StageActions"
import { Dropdown } from "./Dropdown"

const GROUPS: { label: string; items: { id: string; label: string; icon: ComponentType<IconProps> }[] }[] = [
  { label: "Preferences", items: [
    { id: "general", label: "General", icon: Settings },
    { id: "appearance", label: "Appearance", icon: Brush },
    { id: "calendar", label: "Calendar", icon: CalendarDays },
    { id: "mini", label: "Mini Mode", icon: PictureInPicture2 },
    { id: "audio", label: "Audio", icon: Mic },
    { id: "video", label: "Video", icon: Video },
    { id: "meetings", label: "Meetings", icon: CalendarClock },
    { id: "conversations", label: "Conversations", icon: MessageCircle },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "performance", label: "Performance", icon: Zap },
  ] },
  { label: "Office", items: [
    { id: "members", label: "People", icon: Users },
    { id: "chat", label: "Chat", icon: MessageCircle },
    { id: "map", label: "Map & objects", icon: MapIcon },
    { id: "recording", label: "Recording", icon: Record },
  ] },
  { label: "Account", items: [
    { id: "profile", label: "Profile", icon: Pencil },
    { id: "avatar", label: "Avatar", icon: Smile },
    { id: "shortcuts", label: "Keyboard shortcuts", icon: Keyboard },
  ] },
]
type ColorMode = "light" | "dark" | "system"

function SettingSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="settings-section"><h4>{title}</h4>{children}</section>
}

function SettingRow({ label, description, children }: { label: string; description: string; children?: ReactNode }) {
  return <div className="settings-row"><div className="settings-row-copy"><h5>{label}</h5><p>{description}</p></div>{children}</div>
}

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

function DevicesTab({ kind }: { kind: "audio" | "video" }) {
  const office = useOffice()
  const [d, setD] = useState<Awaited<ReturnType<typeof listDevices>>>({ audioIn: [], videoIn: [], audioOut: [] })
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    void listDevices().then(setD)
  }, [])
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = office.localStream
  })

  const hasVideo = !!office.localStream?.getVideoTracks().some((t) => t.readyState === "live" && t.enabled)
  const select = (kind: "audioIn" | "videoIn" | "audioOut", list: MediaDeviceInfo[], label: string) => (
    <label className="field">
      <span className="field-label">{label}</span>
      <Dropdown className="input" label={label} value={office.devices[kind]} onChange={(value) => void setDevice(kind, value)} options={[{ value: "", label: "System default" }, ...list.filter((x) => !!x.deviceId).map((x, i) => ({ value: x.deviceId, label: x.label || `${label} ${i + 1}` }))]} />
    </label>
  )

  return (
    <div className="settings-av">
      {kind === "video" && <div className="settings-preview">
        {hasVideo ? <video ref={videoRef} autoPlay playsInline muted className="mirror" /> : <span className="muted">Camera is off</span>}
      </div>}
      {kind === "video" ? select("videoIn", d.videoIn, "Camera") : <>
        {select("audioIn", d.audioIn, "Microphone")}
        {select("audioOut", d.audioOut, "Speaker")}
        <p className="hint">Noise suppression and echo cancellation are on for your microphone.</p>
      </>}
    </div>
  )
}

export function SettingsModal() {
  const office = useOffice()
  const [selectedTab, setTab] = useState("general")
  const tab = GROUPS.some((group) => group.items.some((item) => item.id === selectedTab)) ? selectedTab : "general"
  const [colorMode, setColorMode] = useState<ColorMode>("light")
  const dialogRef = useRef<HTMLDivElement>(null)
  const me = office.me
  const [name, setNameDraft] = useState(me?.name ?? "")
  const [role, setRoleDraft] = useState(me?.role ?? "")
  const [look, setLookDraft] = useState<AvatarLook | null>(me?.look ?? null)
  const [editingAvatar, setEditingAvatar] = useState(false)
  const [recordVideo, setRecordVideo] = useState(true)
  const [recordBusy, setRecordBusy] = useState(false)

  useEffect(() => {
    office.loadPreferences()
    try {
      const saved = localStorage.getItem("oppera-color-mode")
      if (saved === "light" || saved === "dark" || saved === "system") {
        setColorMode(saved)
        document.documentElement.dataset.colorMode = saved
      }
    } catch { /* Use the default appearance when storage is unavailable. */ }
  }, [office])

  const changeColorMode = (mode: ColorMode) => {
    setColorMode(mode)
    document.documentElement.dataset.colorMode = mode
    try { localStorage.setItem("oppera-color-mode", mode) } catch { /* The current session still keeps the selection. */ }
  }

  const close = () => {
    office.settingsOpen = false
    office.emit()
  }

  useEffect(() => {
    if (!office.settingsOpen) return
    const previous = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (editingAvatar) return
      if (event.key === "Escape") {
        if ((event.target as HTMLElement).closest('[role="combobox"][aria-expanded="true"]')) return
        event.preventDefault()
        event.stopPropagation()
        office.settingsOpen = false
        office.emit()
      }
      if (event.key !== "Tab") return
      const controls = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]') ?? [])].filter((el) => el.getClientRects().length > 0)
      const first = controls[0], last = controls[controls.length - 1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        event.preventDefault(); last?.focus()
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) {
        event.preventDefault(); first?.focus()
      }
    }
    document.addEventListener("keydown", onKey, true)
    return () => { document.removeEventListener("keydown", onKey, true); previous?.focus() }
  }, [office.settingsOpen, editingAvatar, office])

  useEffect(() => {
    if (!office.settingsOpen) return
    if (me) {
      setNameDraft(me.name)
      setRoleDraft(me.role ?? "")
      setLookDraft(me.look)
    } else {
      try {
        const saved = JSON.parse(localStorage.getItem("oppera.profile") ?? "{}")
        setNameDraft(typeof saved?.name === "string" ? saved.name : "")
        setRoleDraft(typeof saved?.role === "string" ? saved.role : "")
        setLookDraft(saved?.look ?? null)
      } catch { setLookDraft(null) }
    }
  }, [office.settingsOpen, me?.id])

  if (!office.settingsOpen) return null
  const active = GROUPS.flatMap((g) => g.items).find((item) => item.id === tab)!

  return createPortal(
    <div className="modal-backdrop settings-backdrop" onClick={close}>
      <div ref={dialogRef} tabIndex={-1} className="modal settings" role="dialog" aria-modal="true" aria-labelledby="settings-heading" onClick={(e) => e.stopPropagation()}>
        <nav className="settings-nav" aria-label="Settings sections">
          {GROUPS.map((group) => <div className="settings-nav-group" key={group.label}>
            <h2>{group.label}</h2>
            {group.items.map(({ id, label, icon: Icon }) => <button key={id} className={`settings-tab ${tab === id ? "is-active" : ""}`} aria-current={tab === id ? "page" : undefined} onClick={() => setTab(id)}><Icon size={18} />{label}</button>)}
          </div>)}
        </nav>
        <div className="settings-mobile-nav"><span>Settings section</span><Dropdown label="Settings section" value={tab} onChange={setTab} options={GROUPS.flatMap((g) => g.items.map((i) => ({ value: i.id, label: i.label, group: g.label })))} /></div>
        <section className="settings-body">
          <div className="settings-head">
            <h3 id="settings-heading">{active.label}</h3>
            <button className="icon-btn" aria-label="Close settings" onClick={close}>
              <X size={18} />
            </button>
          </div>
          <div className="settings-content" key={tab}>
          {tab === "general" && <SettingSection title="Language"><SettingRow label="Display language" description="Choose the language used in OPPERA"><Dropdown label="Display language" className="settings-select" value="en-US" onChange={() => {}} options={[{ value: "en-US", label: "English (US)" }]} /></SettingRow></SettingSection>}
          {tab === "appearance" && <SettingSection title="Appearance"><SettingRow label="Color mode" description="Choose between light, dark, or match your system preference"><Dropdown label="Color mode" className="settings-select" value={colorMode} onChange={(value) => changeColorMode(value as ColorMode)} options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }, { value: "system", label: "System" }]} /></SettingRow></SettingSection>}
          {(tab === "audio" || tab === "video") && <SettingSection title={tab === "audio" ? "Audio devices" : "Video devices"}><DevicesTab kind={tab} /></SettingSection>}
          {tab === "calendar" && <SettingSection title="Office calendar"><SettingRow label="Your calendar" description="View and schedule meetings in your office."><button className="btn btn-blue" onClick={() => { close(); office.openSidebar("calendar") }}>Open calendar</button></SettingRow></SettingSection>}
          {tab === "mini" && <SettingSection title="Picture-in-picture"><SettingRow label="Mini Mode" description="Keep a small, floating view of your map while using other apps."><button className="btn btn-blue" onClick={() => void toggleMiniMode().then((error) => { if (error) office.toast(error); else close() }).catch(() => office.toast("Couldn't open Mini Mode in this browser"))}>Toggle Mini Mode</button></SettingRow></SettingSection>}
          {tab === "meetings" && <SettingSection title="Meetings"><SettingRow label="Scheduled meetings" description={`${office.meetings.length} meetings are scheduled in this office.`}><button className="btn btn-blue" onClick={() => { close(); office.openSidebar("calendar") }}>Manage meetings</button></SettingRow><p className="settings-note">Walk into a meeting room to join its conversation automatically.</p></SettingSection>}
          {tab === "members" && <SettingSection title="People"><SettingRow label="Office members" description={`${office.players.size} people are online in this office.`}><button className="btn btn-blue" onClick={() => void copyInviteLink()}>Copy invite link</button></SettingRow><SettingRow label="People directory" description="Find teammates and see where they are in the office."><button className="btn btn-ghost" onClick={() => { office.stageView = "map"; office.meetingMinimized = true; office.sidebar = "people"; office.sidebarOpen = true; close() }}>View people</button></SettingRow></SettingSection>}
          {tab === "chat" && <SettingSection title="Messages"><SettingRow label="Office chat" description={`${office.channels.length} channels are available to your team.`}><button className="btn btn-blue" onClick={() => { close(); office.openSidebar("chat") }}>Open chat</button></SettingRow><SettingRow label="Unread messages" description={`${office.unreadTotal} unread messages across your conversations.`}><button className="btn btn-ghost" disabled={!office.unreadTotal} onClick={() => { office.unread = {}; office.emit() }}>Mark all read</button></SettingRow></SettingSection>}
          {tab === "map" && <SettingSection title="Office map"><SettingRow label="Center the map" description="Return the camera to your avatar."><button className="btn btn-ghost" onClick={() => { office.recenter = true; office.stageView = "map"; office.meetingMinimized = true; close() }}>Center on me</button></SettingRow><SettingRow label="Edit objects and rooms" description="Arrange furniture, update floors, and create meeting areas."><button className="btn btn-blue" onClick={() => { office.build.open = true; office.stageView = "map"; office.meetingMinimized = true; close() }}>Open builder</button></SettingRow></SettingSection>}
          {tab === "recording" && <SettingSection title="Local recording"><SettingRow label="Record video" description="Include a tab or screen you select along with conversation audio."><input className="settings-switch" type="checkbox" role="switch" aria-label="Record video" checked={recordVideo} disabled={isRecording()} onChange={(e) => setRecordVideo(e.target.checked)} /></SettingRow><SettingRow label={isRecording() ? "Recording in progress" : "Record this conversation"} description="Your recording saves to your computer when you stop."><button className="btn btn-blue" disabled={recordBusy} onClick={async () => { if (isRecording()) { stopRecording(); return }; setRecordBusy(true); try { const error = await startRecording({ video: recordVideo, name: office.areaName ?? "Conversation" }); if (error) office.toast(error) } catch { office.toast("Couldn't start recording. Check your browser permissions.") } finally { setRecordBusy(false) } }}>{recordBusy ? "Starting…" : isRecording() ? "Stop & save" : "Start recording"}</button></SettingRow></SettingSection>}
          {tab === "conversations" && <SettingSection title="Avatar indicators">
            <SettingRow label="Speech bubbles" description="Show a small speech bubble when someone is speaking.">
              <input className="settings-switch" type="checkbox" role="switch" aria-label="Show speech bubbles" checked={office.preferences.speechBubbles} onChange={(e) => office.setPreference("speechBubbles", e.target.checked)} />
            </SettingRow>
            <SettingRow label="Name labels" description="Show player names above avatars on the map.">
              <input className="settings-switch" type="checkbox" role="switch" aria-label="Show name labels" checked={office.preferences.nameLabels} onChange={(e) => office.setPreference("nameLabels", e.target.checked)} />
            </SettingRow>
          </SettingSection>}
          {tab === "notifications" && <SettingSection title="Activity">
            <SettingRow label="Unread badges" description="Show unread counts on the Chat and Notifications icons.">
              <input className="settings-switch" type="checkbox" role="switch" aria-label="Show unread badges" checked={office.preferences.unreadBadges} onChange={(e) => office.setPreference("unreadBadges", e.target.checked)} />
            </SettingRow>
            <SettingRow label="Unread notifications" description={`${office.unreadNotices} unread notifications in your activity feed.`}>
              <button className="btn btn-ghost" disabled={!office.unreadNotices} onClick={() => { office.notices = office.notices.map((n) => ({ ...n, read: true })); office.emit() }}>Mark all read</button>
            </SettingRow>
          </SettingSection>}
          {tab === "performance" && <SettingSection title="Map display"><SettingRow label="Map zoom" description="Adjust how much of the office you see."><Dropdown className="settings-select" label="Map zoom" value={String(office.zoom)} onChange={(value) => office.setZoom(Number(value))} options={[0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3].map((z) => ({ value: String(z), label: `${Math.round(z * 100)}%` }))} /></SettingRow><SettingRow label="Minimap" description="Show a small overview of your office."><input aria-label="Show minimap" className="settings-switch" type="checkbox" role="switch" checked={office.minimap} onChange={(e) => { office.minimap = e.target.checked; office.emit() }} /></SettingRow></SettingSection>}
          <div className={tab === "profile" || tab === "avatar" || tab === "shortcuts" ? "settings-section" : undefined}>
          {(tab === "profile" || tab === "avatar") && !look && <p className="settings-note">Join the office to set up your profile and avatar.</p>}
          {(tab === "profile" || tab === "avatar") && look && (
            <>
              {tab === "profile" && <label className="field">
                <span className="field-label">Display name</span>
                <input className="input" value={name} maxLength={32} onChange={(e) => setNameDraft(e.target.value)} />
              </label>}
              {tab === "profile" && <label className="field">
                <span className="field-label">Role</span>
                <input className="input" value={role} maxLength={48} placeholder="e.g. Designer, Developer" onChange={(e) => setRoleDraft(e.target.value)} />
              </label>}
              {tab === "avatar" && <div className="field">
                <span className="field-label">Avatar</span>
                <div className="settings-avatar">
                  <button type="button" className="profile-pic-circle is-avatar" aria-label="Edit avatar" onClick={() => setEditingAvatar(true)}>
                    <AvatarPreview look={look} size={72} />
                    <span className="profile-pic-edit" aria-hidden><Pencil size={12} /></span>
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setEditingAvatar(true)}>Customize avatar</button>
                </div>
              </div>}
              {editingAvatar && (
                <EditAvatarModal
                  initial={look}
                  name={name.trim() || me?.name || "You"}
                  onCancel={() => setEditingAvatar(false)}
                  onDone={(l) => { setLookDraft(l); setEditingAvatar(false) }}
                />
              )}
              <div className="modal-actions">
                <button
                  className="btn btn-blue"
                  disabled={!name.trim()}
                  onClick={() => {
                    if (me) {
                      if (name.trim() && name !== me.name) setName(name.trim())
                      if (role.trim() !== (me.role ?? "")) setRole(role)
                      setLook(look)
                    }
                    saveProfile({ name: name.trim() || me?.name || "Guest", role: role.trim(), look })
                    office.toast("Profile saved")
                    close()
                  }}
                >
                  {tab === "avatar" ? "Save avatar" : "Save profile"}
                </button>
              </div>
            </>
          )}
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
          </div>
          </div>
        </section>
      </div>
    </div>, document.body
  )
}

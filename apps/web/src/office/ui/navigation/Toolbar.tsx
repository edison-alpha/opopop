"use client"
import type { Status } from "@/shared/protocol"
import { isRecording, startRecording, stopRecording } from "../../recorder"
import {
  CalendarDays, Check, ChevronUp, CircleDashed, DoorOpen, Hand, Mic, MicOff, MonitorUp, MonitorX, Record, Smile, StopRecording, Video, VideoOff,
} from "../common/icons"
import { useEffect, useRef, useState } from "react"
import { REACTION_KEYS } from "../../game/constants"
import {
  allMediaOff,
  listDevices,
  react,
  setDevice,
  setName,
  setStatus,
  setStatusText,
  startScreenShare,
  stopScreenShare,
  toggleAway,
  toggleCam,
  toggleHand,
  toggleMic,
} from "../../session"
import { useOffice } from "../../store"
import { LetterAvatar } from "../avatar/LetterAvatar"
import { EditProfileModal, MyAvatarModal } from "../modals/ProfileModals"

const STATUSES: { id: Status; label: string; hint: string }[] = [
  { id: "available", label: "Active", hint: "People can walk up and talk to you" },
  { id: "busy", label: "Busy", hint: "Audio and video stay off when people approach" },
  { id: "away", label: "Away", hint: "Shown as stepped away" },
]

export function useClickOutside<T extends HTMLElement>(open: boolean, close: () => void) {
  const ref = useRef<T>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close()
    window.addEventListener("mousedown", onDown)
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("mousedown", onDown)
      window.removeEventListener("keydown", onKey)
    }
  }, [open, close])
  return ref
}

function ProfileMenu({ onClose, onEditAvatar, onEditProfile }: { onClose: () => void; onEditAvatar: () => void; onEditProfile: () => void }) {
  const office = useOffice()
  const me = office.me!
  const [name, setNameDraft] = useState(me.name)
  const [text, setText] = useState(me.statusText)

  return (
    <div className="popover profile-menu" role="dialog" aria-label="Your status">
      <div className="profile-menu-head">
        <LetterAvatar name={me.name} size={40} status={me.status} />
        <input
          className="input"
          value={name}
          maxLength={32}
          aria-label="Display name"
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={() => name.trim() && name !== me.name && setName(name.trim())}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        />
      </div>
      <input
        className="input"
        value={text}
        maxLength={80}
        placeholder="What are you up to?"
        aria-label="Status message"
        onChange={(e) => setText(e.target.value)}
        onBlur={() => text !== me.statusText && setStatusText(text)}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      />
      <div className="menu-group">
        {STATUSES.map((s) => (
          <button key={s.id} className={`menu-item ${me.status === s.id ? "is-selected" : ""}`} onClick={() => setStatus(s.id)}>
            <span className={`status-dot status-${s.id}`} />
            <span>
              <span className="menu-item-label">{s.label}</span>
              <span className="menu-item-hint">{s.hint}</span>
            </span>
          </button>
        ))}
      </div>
      <button className="btn btn-blue full" onClick={onEditProfile}>
        Edit profile
      </button>
      <button className="btn btn-ghost full" onClick={onEditAvatar}>
        Edit avatar
      </button>
      <button className="btn btn-ghost full" onClick={() => { onClose(); void allMediaOff() }}>
        Turn everything off
      </button>
    </div>
  )
}

function DeviceMenu({ kind }: { kind: "audio" | "video" }) {
  const office = useOffice()
  const [lists, setLists] = useState<{ inputs: MediaDeviceInfo[]; outputs: MediaDeviceInfo[] }>({ inputs: [], outputs: [] })
  useEffect(() => {
    void listDevices().then((d) => setLists({ inputs: kind === "audio" ? d.audioIn : d.videoIn, outputs: kind === "audio" ? d.audioOut : [] }))
  }, [kind])
  const current = kind === "audio" ? office.devices.audioIn : office.devices.videoIn
  const label = (d: MediaDeviceInfo, i: number) => d.label || `${kind === "audio" ? "Microphone" : "Camera"} ${i + 1}`
  return (
    <div className="popover device-menu dark" role="menu">
      <div className="menu-title">{kind === "audio" ? "Select microphone" : "Select camera"}</div>
      {lists.inputs.length === 0 && <div className="menu-empty">No devices found. Allow access first.</div>}
      {lists.inputs.map((d, i) => (
        <button key={d.deviceId || i} role="menuitemradio" aria-checked={current === d.deviceId} className="menu-row"
          onClick={() => void setDevice(kind === "audio" ? "audioIn" : "videoIn", d.deviceId)}>
          <span className="check">{(current === d.deviceId || (!current && i === 0)) && <Check size={14} />}</span>
          <span className="device-label">{label(d, i)}</span>
        </button>
      ))}
      {lists.outputs.length > 0 && (
        <>
          <div className="menu-title">Select speaker</div>
          {lists.outputs.map((d, i) => (
            <button key={d.deviceId || i} role="menuitemradio" aria-checked={office.devices.audioOut === d.deviceId} className="menu-row"
              onClick={() => void setDevice("audioOut", d.deviceId)}>
              <span className="check">{(office.devices.audioOut === d.deviceId || (!office.devices.audioOut && i === 0)) && <Check size={14} />}</span>
              <span className="device-label">{d.label || `Speaker ${i + 1}`}</span>
            </button>
          ))}
        </>
      )}
    </div>
  )
}

function RecordMenu({ onClose }: { onClose: () => void }) {
  const office = useOffice()
  const me = office.me!
  const [video, setVideo] = useState(true)
  const [busy, setBusy] = useState(false)
  const people = [me, ...[...office.nearby].map((id) => office.players.get(id)).filter((p) => !!p)]
  const title = office.areaName ? `${office.areaName} meeting` : `Meeting with ${people.map((p) => p.name).slice(0, 2).join(", ")}`
  const recording = isRecording()
  return (
    <div className="popover record-menu dark" role="dialog" aria-label="Record this meeting">
      <div className="rec-head">
        <strong>Record this meeting</strong>
        <span className="rec-badge">Beta</span>
      </div>
      {!recording && (
        <label className="rec-check">
          <input type="checkbox" checked={video} onChange={(e) => setVideo(e.target.checked)} />
          Record video (this tab)
        </label>
      )}
      <div className="rec-card">
        <div className="rec-card-title">
          <span className="rec-cal"><CalendarDays size={14} /></span>
          {title}
        </div>
        <div className="rec-people">
          {people.slice(0, 8).map((p) => <LetterAvatar key={p.id} name={p.name} size={22} />)}
        </div>
        <p>Audio from you and everyone you can hear is included. The file saves to your computer when you stop.</p>
      </div>
      {recording ? (
        <button className="btn btn-danger full" onClick={() => { stopRecording(); onClose() }}>
          <StopRecording size={18} /> Stop &amp; save
        </button>
      ) : (
        <button
          className="btn btn-blue full"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            const err = await startRecording({ video, name: title })
            setBusy(false)
            if (err) office.toast(err)
            onClose()
          }}
        >
          <Record size={15} /> Record
        </button>
      )}
    </div>
  )
}

type Menu = "profile" | "react" | "mic" | "cam" | "record" | null

export function Toolbar({ onLeave, compact = false }: { onLeave: () => void; compact?: boolean }) {
  const office = useOffice()
  const me = office.me
  const [menu, setMenu] = useState<Menu>(null)
  const [modal, setModal] = useState<"avatar" | "profile" | null>(null)
  const ref = useClickOutside<HTMLDivElement>(menu !== null, () => setMenu(null))

  // Desktop-app shortcuts: Ctrl/Cmd+Shift+A (mic), Ctrl/Cmd+Shift+V (camera), Ctrl/Cmd+Shift+D (all off).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.shiftKey && e.code === "KeyA") { e.preventDefault(); void toggleMic() }
      else if (mod && e.shiftKey && e.code === "KeyV") { e.preventDefault(); void toggleCam() }
      else if (mod && e.shiftKey && e.code === "KeyD") { e.preventDefault(); void allMediaOff() }
      else if (e.key === "Enter" && document.activeElement === document.body) {
        office.sidebar = "chat"
        office.sidebarOpen = true
        office.conversation = office.nearby.size ? "nearby" : office.conversation
        office.emit()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [office])

  if (!me) return null
  const toggle = (m: Menu) => setMenu(menu === m ? null : m)

  return (
    <>
      <div className={`toolbar ${compact ? "is-compact" : ""}`} ref={ref} role="toolbar" aria-label="Office controls">
        <div className="tb-anchor">
          <button className="tb-avatar" aria-label="Your status" onClick={() => toggle("profile")}>
            <LetterAvatar name={me.name} size={compact ? 30 : 40} status={me.status} />
          </button>
          {menu === "profile" && (
            <ProfileMenu
              onClose={() => setMenu(null)}
              onEditAvatar={() => { setMenu(null); setModal("avatar") }}
              onEditProfile={() => { setMenu(null); setModal("profile") }}
            />
          )}
        </div>

        <div className="tb-split tb-anchor">
          <button className={`tb-btn ${me.mic ? "" : "is-off"}`} onClick={() => void toggleMic()}
            title={`${me.mic ? "Mute" : "Unmute"} (Ctrl+Shift+A)`} aria-label={me.mic ? "Mute microphone" : "Unmute microphone"}>
            {me.mic ? <Mic size={22} /> : <MicOff size={22} />}
          </button>
          <button className="tb-caret" aria-label="Microphone settings" aria-haspopup="menu" aria-expanded={menu === "mic"} onClick={() => toggle("mic")}><ChevronUp size={12} /></button>
          {menu === "mic" && <DeviceMenu kind="audio" />}
        </div>

        <div className="tb-split tb-anchor">
          <button className={`tb-btn ${me.cam ? "" : "is-off"}`} onClick={() => void toggleCam()}
            title={`${me.cam ? "Stop video" : "Start video"} (Ctrl+Shift+V)`} aria-label={me.cam ? "Turn camera off" : "Turn camera on"}>
            {me.cam ? <Video size={22} /> : <VideoOff size={22} />}
          </button>
          <button className="tb-caret" aria-label="Camera settings" aria-haspopup="menu" aria-expanded={menu === "cam"} onClick={() => toggle("cam")}><ChevronUp size={12} /></button>
          {menu === "cam" && <DeviceMenu kind="video" />}
        </div>

        <div className="tb-anchor">
          <button className={`tb-btn ${menu === "react" ? "is-active" : ""}`} onClick={() => toggle("react")} title="React (1–6)" aria-label="Reactions">
            <Smile size={22} />
          </button>
          {menu === "react" && (
            <div className="popover react-menu dark" role="menu">
              {REACTION_KEYS.map((emoji, i) => (
                <button key={emoji} role="menuitem" className="react-btn" onClick={() => { react(emoji); setMenu(null) }}>
                  <span>{emoji}</span>
                  <kbd>{i + 1}</kbd>
                </button>
              ))}
            </div>
          )}
        </div>

        <button className={`tb-btn ${me.screen ? "is-share" : ""}`} onClick={() => (me.screen ? stopScreenShare() : void startScreenShare())}
          title={me.screen ? "Stop sharing" : "Share screen"} aria-label={me.screen ? "Stop sharing" : "Share screen"}>
          {me.screen ? <MonitorX size={22} /> : <MonitorUp size={22} />}
        </button>

        {!compact && (
          <button className={`tb-btn ${me.hand ? "is-hand" : ""}`} onClick={toggleHand}
            title={me.hand ? "Lower hand" : "Raise hand"} aria-label={me.hand ? "Lower hand" : "Raise hand"} aria-pressed={me.hand}>
            <Hand size={22} />
          </button>
        )}

        {!compact && (
          <div className="tb-split tb-anchor">
            <button
              className={`tb-btn ${isRecording() ? "is-recording" : ""}`}
              title={isRecording() ? "Stop recording" : "Record"}
              aria-label={isRecording() ? "Stop recording" : "Record this meeting"}
              onClick={() => (isRecording() ? stopRecording() : toggle("record"))}
            >
              {isRecording() ? <StopRecording size={22} /> : <Record size={22} />}
            </button>
            <button className="tb-caret" aria-label="Recording options" aria-haspopup="dialog" aria-expanded={menu === "record"} onClick={() => toggle("record")}><ChevronUp size={12} /></button>
            {menu === "record" && <RecordMenu onClose={() => setMenu(null)} />}
          </div>
        )}

        {!office.meetingViewOpen && <button className={`tb-btn ${me.status === "away" ? "is-active" : ""}`} onClick={toggleAway}
          title={me.status === "away" ? "I'm back" : "Step away"} aria-label={me.status === "away" ? "Set as active" : "Set as away"} aria-pressed={me.status === "away"}>
          <CircleDashed size={22} />
        </button>}

        <span className="tb-divider" />

        <button className="tb-btn tb-leave" onClick={onLeave} title="Leave office" aria-label="Leave office">
          <DoorOpen size={22} />
        </button>
      </div>
      {modal === "avatar" && <MyAvatarModal onClose={() => setModal(null)} />}
      {modal === "profile" && <EditProfileModal onClose={() => setModal(null)} />}
    </>
  )
}

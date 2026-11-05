"use client"
// "Edit Profile" (picture, avatar, name, time zone) and "Edit Avatar" modals.
import type { AvatarLook } from "@/shared/protocol"
import { Pencil, X } from "./icons"
import { useMemo, useState } from "react"
import { setLook, setName } from "../session"
import { useOffice } from "../store"
import { AvatarEditor } from "./AvatarEditor"
import { AvatarPreview } from "./AvatarPreview"
import { LetterAvatar } from "./LetterAvatar"

const PROFILE_KEY = "oppera.profile"

interface StoredProfile {
  name?: string
  look?: AvatarLook
  timeZone?: string
}

function readProfile(): StoredProfile {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "{}") as StoredProfile
  } catch {
    return {}
  }
}
/** Merges into the remembered profile (name, look, time zone). */
export function saveProfile(patch: StoredProfile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...readProfile(), ...patch }))
  } catch {
    // storage unavailable; the profile just won't be remembered
  }
}

function offsetLabel(tz: string): string {
  try {
    const part = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "longOffset" })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")?.value
    const off = !part || part === "GMT" ? "+00:00" : part.replace("GMT", "")
    return `(UTC${off}) ${tz}`
  } catch {
    return tz
  }
}

export function EditAvatarModal({
  initial,
  name,
  onCancel,
  onDone,
}: {
  initial: AvatarLook
  name?: string
  onCancel: () => void
  onDone: (look: AvatarLook) => void
}) {
  const [look, setDraft] = useState<AvatarLook>(initial)
  return (
    <div className="modal-backdrop ae-backdrop" onClick={onCancel}>
      <div className="modal ae-modal" role="dialog" aria-label="Edit avatar" onClick={(e) => e.stopPropagation()}>
        <header className="ae-modal-head">
          <h2>Edit Avatar</h2>
          <button className="icon-btn" aria-label="Close" onClick={onCancel}>
            <X size={18} />
          </button>
        </header>
        <AvatarEditor look={look} onChange={setDraft} name={name} />
        <footer className="ae-modal-foot">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-blue" onClick={() => onDone(look)}>Done</button>
        </footer>
      </div>
    </div>
  )
}

/** Edit avatar for the signed-in player; saves straight to the session. */
export function MyAvatarModal({ onClose }: { onClose: () => void }) {
  const office = useOffice()
  const me = office.me
  if (!me) return null
  return (
    <EditAvatarModal
      initial={me.look}
      name={me.name}
      onCancel={onClose}
      onDone={(look) => {
        setLook(look)
        saveProfile({ name: me.name, look })
        onClose()
      }}
    />
  )
}

export function EditProfileModal({ onClose }: { onClose: () => void }) {
  const office = useOffice()
  const me = office.me!
  const [name, setNameDraft] = useState(me.name)
  const [look, setLookDraft] = useState<AvatarLook>(me.look)
  const [timeZone, setTimeZone] = useState(() => readProfile().timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [editingAvatar, setEditingAvatar] = useState(false)
  const zones = useMemo(() => {
    const all = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") ?? [timeZone]
    return (all.includes(timeZone) ? all : [timeZone, ...all]).map((z) => ({ z, label: offsetLabel(z) }))
  }, [timeZone])

  const trimmed = name.trim()
  const save = () => {
    if (!trimmed) return
    if (trimmed !== me.name) setName(trimmed)
    if (JSON.stringify(look) !== JSON.stringify(me.look)) setLook(look)
    saveProfile({ name: trimmed, look, timeZone })
    office.toast("Profile saved")
    onClose()
  }

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal profile-modal" role="dialog" aria-label="Edit profile" onClick={(e) => e.stopPropagation()}>
          <header className="ae-modal-head">
            <h2>Edit Profile</h2>
            <button className="icon-btn" aria-label="Close" onClick={onClose}>
              <X size={18} />
            </button>
          </header>
          <div className="profile-modal-body">
            <div className="profile-pics">
              <div className="profile-pic">
                <span className="profile-pic-label">Profile picture</span>
                <span className="profile-pic-circle">
                  <LetterAvatar name={trimmed || me.name} size={88} />
                </span>
              </div>
              <div className="profile-pic">
                <span className="profile-pic-label">Avatar</span>
                <button type="button" className="profile-pic-circle is-avatar" aria-label="Edit avatar" onClick={() => setEditingAvatar(true)}>
                  <AvatarPreview look={look} size={72} />
                  <span className="profile-pic-edit" aria-hidden>
                    <Pencil size={12} />
                  </span>
                </button>
              </div>
            </div>
            <label className="field">
              <span className="field-label">
                Full name<span className="req">*</span>
              </span>
              <input className="input" value={name} maxLength={32} onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && save()} />
            </label>
            <label className="field">
              <span className="field-label">Time zone</span>
              <select className="input" value={timeZone} onChange={(e) => setTimeZone(e.target.value)}>
                {zones.map(({ z, label }) => (
                  <option key={z} value={z}>{label}</option>
                ))}
              </select>
            </label>
          </div>
          <footer className="ae-modal-foot">
            <button className="btn btn-blue" disabled={!trimmed} onClick={save}>Save</button>
          </footer>
        </div>
      </div>
      {editingAvatar && (
        <EditAvatarModal
          initial={look}
          name={trimmed || me.name}
          onCancel={() => setEditingAvatar(false)}
          onDone={(l) => {
            setLookDraft(l)
            setEditingAvatar(false)
          }}
        />
      )}
    </>
  )
}

"use client"
import { ChevronDown, Layers, Link2, MapPin, MessageCircle, PanelLeftClose, UserPlus } from "./icons"
import { useEffect, useRef, useState } from "react"
import { areaAt } from "../game/map"
import { conversationGroups, copyInviteLink, openConversation, walkToPlayer, wave } from "../session"
import { useOffice, type Avatar } from "../store"
import { LetterAvatar } from "./LetterAvatar"

const STATUS_LABEL = { available: "Active", busy: "Busy", away: "Away" } as const

export function SidebarHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  const office = useOffice()
  return (
    <header className="sb-head">
      <h2>{title}</h2>
      <div className="sb-head-actions">
        {children}
        <button
          className="icon-btn"
          aria-label="Collapse sidebar"
          onClick={() => {
            office.sidebarOpen = false
            office.emit()
          }}
        >
          <PanelLeftClose size={18} />
        </button>
      </div>
    </header>
  )
}

export function InviteCard() {
  const office = useOffice()
  const others = [...office.players.values()].filter((p) => p.id !== office.meId)
  return (
    <section className="invite-card">
      <h3>Experience OPPERA together</h3>
      <p>Invite your closest collaborators.</p>
      <div className="avatar-stack">
        {others.slice(0, 1).map((p) => (
          <LetterAvatar key={p.id} name={p.name} size={30} ring />
        ))}
        {["#bfe8c6", "#f8b8b0", "#e8b9e6", "#b9d8f4"].slice(0, Math.max(0, 5 - Math.min(1, others.length))).map((c, i) => (
          <span key={i} className="letter-avatar ghost has-ring" style={{ width: 30, height: 30, background: c }}>
            <UserPlus size={14} />
          </span>
        ))}
      </div>
      <div className="split-btn">
        <button className="btn btn-blue" onClick={() => void copyInviteLink()}>
          <UserPlus size={15} /> Invite
        </button>
        <button className="btn btn-blue split" aria-label="Copy invite link" title="Copy invite link" onClick={() => void copyInviteLink()}>
          <Link2 size={15} />
        </button>
      </div>
    </section>
  )
}

export function SidebarSearch({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.code === "KeyF") {
        e.preventDefault()
        ref.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])
  return (
    <label className="sb-search">
      <input ref={ref} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      <span className="kbd-pair" aria-hidden>
        <kbd>Ctrl</kbd>
        <kbd>F</kbd>
      </span>
    </label>
  )
}

function PersonRow({ p }: { p: Avatar }) {
  const office = useOffice()
  const isMe = p.id === office.meId
  const area = areaAt(p.x, p.y)?.name
  const selected = office.selected === p.id
  return (
    <li
      className={`person ${selected ? "is-selected" : ""}`}
      onClick={() => {
        office.selected = selected ? null : p.id
        office.emit()
      }}
    >
      <LetterAvatar name={p.name} size={36} status={p.status} />
      <div className="person-info">
        <div className="person-name">
          {p.name}
          {p.hand && <span aria-label="Hand raised"> ✋</span>}
        </div>
        <div className="person-sub">
          {p.statusText || STATUS_LABEL[p.status]}
          {area && selected ? ` · ${area}` : ""}
        </div>
      </div>
      {!isMe && (
        <div className="person-actions" onClick={(e) => e.stopPropagation()}>
          <button className="icon-btn sm" title="Wave" aria-label={`Wave at ${p.name}`} onClick={() => wave(p.id)}>
            <span aria-hidden>👋</span>
          </button>
          <button className="icon-btn sm" title="Message" aria-label={`Message ${p.name}`} onClick={() => openConversation(p.id)}>
            <MessageCircle size={15} />
          </button>
          <button className="icon-btn sm" title="Walk to" aria-label={`Walk to ${p.name}`} onClick={() => walkToPlayer(p.id)}>
            <MapPin size={15} />
          </button>
        </div>
      )}
    </li>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <>
      <button className="sb-section" aria-expanded={open} onClick={() => setOpen(!open)}>
        {label} <ChevronDown size={14} className={open ? "" : "rot"} />
      </button>
      {open && children}
    </>
  )
}

export function PeopleView() {
  const office = useOffice()
  const [q, setQ] = useState("")

  const people = [...office.players.values()]
    .filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => (a.id === office.meId ? -1 : b.id === office.meId ? 1 : a.name.localeCompare(b.name)))
  const groups = conversationGroups()

  return (
    <>
      <SidebarHeader title="OPPERA HQ" />
      <button className="floor-chip" title="Floors">
        <Layers size={14} /> Floor 1 <ChevronDown size={14} />
      </button>
      <div className="sb-scroll">
        <InviteCard />
        <SidebarSearch value={q} onChange={setQ} placeholder="Search people" />

        {groups.length > 0 && (
          <Section label="Hallway conversations">
            <div className="convo-cards">
              {groups.map((g) => {
                const area = areaAt(g[0].x, g[0].y)
                return (
                  <button
                    key={g.map((p) => p.id).join()}
                    className="convo-card"
                    title={`${area?.private ? area.name : "Hallway conversation"}: ${g.map((p) => p.name).join(", ")}`}
                    onClick={() => walkToPlayer(g[0].id === office.meId && g[1] ? g[1].id : g[0].id)}
                  >
                    <span className="convo-stack">
                      {g.slice(0, 4).map((p) => (
                        <LetterAvatar key={p.id} name={p.name} size={24} ring />
                      ))}
                    </span>
                    {g.some((p) => p.lockedWith.length) && <span className="convo-lock">🔒</span>}
                  </button>
                )
              })}
            </div>
          </Section>
        )}

        <Section label={`Online (${office.players.size})`}>
          <ul className="people-list">
            {people.map((p) => (
              <PersonRow key={p.id} p={p} />
            ))}
            {people.length === 0 && <li className="empty">No one matches “{q}”.</li>}
          </ul>
        </Section>
      </div>
    </>
  )
}

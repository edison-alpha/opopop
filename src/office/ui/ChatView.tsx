"use client"
import { ChevronDown, Hash, Info, Plus, Radio, Send, SquarePen, X } from "./icons"
import { useState } from "react"
import { createChannel, messagesFor, openConversation } from "../session"
import { useOffice } from "../store"
import { InviteCard, SidebarSearch } from "./PeopleView"
import { LetterAvatar } from "./LetterAvatar"

function NewChannelModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("")
  const [topic, setTopic] = useState("")
  const slug = name.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9_-]/g, "")
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form
        className="modal narrow"
        role="dialog"
        aria-label="Create a channel"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          if (!slug) return
          createChannel(slug, topic.trim())
          openConversation(`#${slug}`)
          onClose()
        }}
      >
        <div className="modal-head">
          <h2 className="modal-title">Create a channel</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}><X size={18} /></button>
        </div>
        <label className="field">
          <span className="field-label">Name</span>
          <div className="input-prefix">
            <Hash size={14} />
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. design" autoFocus maxLength={40} />
          </div>
        </label>
        <label className="field" style={{ marginTop: 12 }}>
          <span className="field-label">Description (optional)</span>
          <input className="input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="What is this channel about?" maxLength={140} />
        </label>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-blue" disabled={!slug}>Create</button>
        </div>
      </form>
    </div>
  )
}

function Collapsible({ label, children, action }: { label: string; children: React.ReactNode; action?: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <>
      <div className="sb-section-row">
        <button className="sb-section" aria-expanded={open} onClick={() => setOpen(!open)}>
          {label} <ChevronDown size={14} className={open ? "" : "rot"} />
        </button>
        {action}
      </div>
      {open && children}
    </>
  )
}

/** Sidebar contents while the chat view is open. */
export function ChatView() {
  const office = useOffice()
  const [creating, setCreating] = useState(false)
  const [q, setQ] = useState("")

  const dms = new Set<string>()
  for (const m of office.chat) if (m.scope === "dm") dms.add(m.from === office.meId ? m.to! : m.from)
  if (office.meId) dms.add(office.meId)
  const needle = q.trim().toLowerCase()
  const matches = (s: string) => !needle || s.toLowerCase().includes(needle)
  const drafts = Object.keys(office.drafts)

  const Item = ({ conv, icon, label, sub }: { conv: string; icon: React.ReactNode; label: React.ReactNode; sub?: string }) => {
    const active = office.conversation === conv
    const unread = office.unread[conv] ?? 0
    return (
      <li>
        <button className={`nav-item ${active ? "is-active" : ""} ${unread ? "is-unread" : ""}`} onClick={() => openConversation(conv)}>
          <span className="nav-icon">{icon}</span>
          <span className="nav-label">{label}</span>
          {sub && <span className="nav-sub">{sub}</span>}
          {unread > 0 && <span className="pill-badge">{unread}</span>}
        </button>
      </li>
    )
  }

  return (
    <>
      <header className="sb-head">
        <h2>Chat</h2>
        <div className="sb-head-actions">
          <button className="icon-btn" aria-label="New message" title="New message" onClick={() => office.openSidebar("people")}>
            <SquarePen size={18} />
          </button>
          <button className="icon-btn" aria-label="About chat" title="Messages in channels are visible to everyone in the office">
            <Info size={18} />
          </button>
        </div>
      </header>
      <div className="sb-scroll">
        <InviteCard />
        <SidebarSearch value={q} onChange={setQ} placeholder="Search or navigate..." />

        <ul className="nav-list">
          <Item conv={drafts[0] ?? office.conversation} icon={<Send size={15} />} label="Drafts" sub={drafts.length ? String(drafts.length) : undefined} />
        </ul>

        <Collapsible
          label="Channels"
          action={<button className="icon-btn sm" aria-label="Create channel" title="Create channel" onClick={() => setCreating(true)}><Plus size={15} /></button>}
        >
          <ul className="nav-list">
            {office.channels.filter((c) => matches(c.name)).map((c) => (
              <Item key={c.name} conv={`#${c.name}`} icon={<Hash size={16} />} label={c.name} />
            ))}
            {matches("nearby") && (
              <Item conv="nearby" icon={<Radio size={15} />} label="nearby" sub={office.nearby.size ? String(office.nearby.size) : undefined} />
            )}
          </ul>
        </Collapsible>

        <Collapsible label="Direct messages">
          <ul className="nav-list">
            {[...dms].map((id) => {
              const p = office.players.get(id)
              const name = p?.name ?? messagesFor(id).find((m) => m.from === id)?.fromName ?? "Guest"
              if (!matches(name)) return null
              return (
                <Item
                  key={id}
                  conv={id}
                  icon={<LetterAvatar name={name} size={20} status={p?.status} />}
                  label={<>{name}{id === office.meId && <span className="muted"> (you)</span>}</>}
                />
              )
            })}
            {[...office.players.values()]
              .filter((p) => !dms.has(p.id) && matches(p.name))
              .map((p) => (
                <Item key={p.id} conv={p.id} icon={<LetterAvatar name={p.name} size={20} status={p.status} />} label={p.name} />
              ))}
          </ul>
        </Collapsible>
      </div>
      {creating && <NewChannelModal onClose={() => setCreating(false)} />}
    </>
  )
}

"use client"
import { ArrowUpRight, Hash, MoreVertical, Radio, Users } from "../common/icons"
import { useEffect, useRef, useState } from "react"
import type { ChatMsg } from "@/shared/protocol"
import { conversationTitle, copyInviteLink, messagesFor } from "../../session"
import { useOffice } from "../../store"
import { Composer } from "./Composer"
import { LetterAvatar } from "../avatar/LetterAvatar"
import { Markdown } from "./markdown"

function time(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}
function dayLabel(ts: number) {
  const d = new Date(ts)
  if (d.toDateString() === new Date().toDateString()) return "Today"
  if (d.toDateString() === new Date(Date.now() - 86400000).toDateString()) return "Yesterday"
  return d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })
}

/** Collapses consecutive join lines into "A and B joined". */
function groupMessages(msgs: ChatMsg[]) {
  const out: { head: ChatMsg; items: ChatMsg[]; joins?: string[] }[] = []
  for (const m of msgs) {
    const prev = out.at(-1)
    if (m.system) {
      if (prev?.joins && m.ts - prev.head.ts < 30 * 60000) prev.joins.push(m.fromName)
      else out.push({ head: m, items: [], joins: [m.fromName] })
      continue
    }
    if (prev && !prev.joins && prev.head.from === m.from && m.ts - prev.items.at(-1)!.ts < 5 * 60000) prev.items.push(m)
    else out.push({ head: m, items: [m] })
  }
  return out
}

function joinText(names: string[]) {
  if (names.length === 1) return <><strong>{names[0]}</strong> joined</>
  if (names.length === 2) return <><strong>{names[0]}</strong> and <strong>{names[1]}</strong> joined</>
  return <><strong>{names[0]}</strong>, <strong>{names[1]}</strong> and {names.length - 2} others joined</>
}

function Welcome({ conv }: { conv: string }) {
  const office = useOffice()
  if (conv.startsWith("#")) {
    const ch = office.channels.find((c) => `#${c.name}` === conv)
    return (
      <div className="chat-welcome">
        <h3>Gather round in #{conv.slice(1)}</h3>
        {ch?.topic && <p>📣 {ch.topic}</p>}
        {conv === "#general" && (
          <div className="welcome-cards">
            <button className="welcome-card pink" onClick={() => office.openSidebar("calendar")}>
              <ArrowUpRight size={14} className="corner" />
              <img src="/assets/gather/avatar-at-office-door.png" alt="" />
              <span>Tips to onboard your team into OPPERA</span>
            </button>
            <button className="welcome-card green" onClick={() => void copyInviteLink()}>
              <ArrowUpRight size={14} className="corner" />
              <img src="/assets/gather/avatar-at-desk.png" alt="" />
              <span>Invite your teammates to the office</span>
            </button>
          </div>
        )}
      </div>
    )
  }
  if (conv === "nearby") {
    return (
      <div className="chat-welcome">
        <h3>Nearby chat</h3>
        <p>Messages here reach only the people you&apos;re talking to right now.</p>
      </div>
    )
  }
  const name = conversationTitle(conv)
  return (
    <div className="chat-welcome">
      <LetterAvatar name={name} size={56} />
      <h3>{conv === office.meId ? "Your notes" : name}</h3>
      <p>{conv === office.meId ? "Jot down notes and links for yourself." : `This is the beginning of your conversation with ${name}.`}</p>
    </div>
  )
}

/** Full-width chat view shown in place of the map. */
export function ChatMain() {
  const office = useOffice()
  const conv = office.conversation
  const msgs = messagesFor(conv)
  const listRef = useRef<HTMLDivElement>(null)
  const [members, setMembers] = useState(false)
  const online = [...office.players.values()]
  const names = online.map((p) => p.name)
  const isChannel = conv.startsWith("#")
  const title = conversationTitle(conv)

  useEffect(() => {
    if (office.unread[conv]) {
      office.unread = { ...office.unread, [conv]: 0 }
      office.emit()
    }
  }, [conv, msgs.length, office])

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [msgs.length, conv])

  const groups = groupMessages(msgs)
  let lastDay = ""

  return (
    <section className="chat-main" aria-label={`Chat: ${title}`}>
      <header className="chat-main-head">
        <h2>
          {isChannel ? <Hash size={18} /> : conv === "nearby" ? <Radio size={18} /> : <LetterAvatar name={title} size={24} />}
          {title}
        </h2>
        <div className="chat-main-actions">
          <div className="presence-pill" title={`${online.length} online`}>
            <span className="avatar-stack tight">
              {online.slice(0, 3).map((p) => <LetterAvatar key={p.id} name={p.name} size={20} ring />)}
            </span>
            <span>{online.length}</span>
            <span className="dot-online" />
          </div>
          <button className="pill-btn" onClick={() => setMembers(!members)} aria-pressed={members}>
            <Users size={14} /> {online.length}
          </button>
          <button className="icon-btn" aria-label="More options"><MoreVertical size={18} /></button>
        </div>
      </header>

      <div className="chat-main-body">
        <div className="chat-scroll" ref={listRef}>
          <div className="chat-scroll-inner">
            <Welcome conv={conv} />
            {groups.map((g) => {
              const day = dayLabel(g.head.ts)
              const divider = day !== lastDay ? day : null
              lastDay = day
              return (
                <div key={g.head.id}>
                  {divider && msgs.length > 3 && <div className="day-divider"><span>{divider}</span></div>}
                  <div className="msg">
                    <LetterAvatar name={g.head.fromName} size={36} />
                    <div className="msg-main">
                      <div className="msg-head">
                        <strong>{g.head.from === office.meId ? g.head.fromName : g.head.fromName}</strong>
                        <time>{time(g.head.ts)}</time>
                      </div>
                      {g.joins ? (
                        <div className="msg-system">{joinText(g.joins)}</div>
                      ) : (
                        g.items.map((m) => (
                          <div key={m.id} className="msg-body">
                            {m.text && <Markdown text={m.text} mentionNames={names} />}
                            {m.image && (
                              <a href={m.image} target="_blank" rel="noreferrer">
                                <img className="msg-image" src={m.image} alt="Shared image" />
                              </a>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        {members && (
          <aside className="members-panel" aria-label="Members">
            <div className="members-head">Members · {online.length}</div>
            <ul>
              {online.map((p) => (
                <li key={p.id}>
                  <LetterAvatar name={p.name} size={28} status={p.status} />
                  <span>{p.name}{p.id === office.meId && <span className="muted"> (you)</span>}</span>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>

      <div className="chat-main-composer">
        <Composer conv={conv} placeholder={`Message ${isChannel ? title : title}`} />
      </div>
    </section>
  )
}

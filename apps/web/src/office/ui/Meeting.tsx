"use client"
import { useEffect, useRef, useState } from "react"
import { messagesFor } from "../session"
import { useOffice } from "../store"
import { Composer } from "./Composer"
import { Info, Maximize2, MessageCircle, MicOff, Users, X } from "./icons"
import { LetterAvatar } from "./LetterAvatar"
import { StageActions } from "./StageActions"
import { Tile } from "./VideoBar"

function useElapsed(since: number) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const s = Math.max(0, Math.floor((now - since) / 1000))
  const mm = String(Math.floor(s / 60)).padStart(2, "0")
  const ss = String(s % 60).padStart(2, "0")
  return s >= 3600 ? `${Math.floor(s / 3600)}:${mm.padStart(2, "0")}:${ss}` : `${mm}:${ss}`
}

/** Grid columns that keep tiles as large as possible for n participants. */
function columnsFor(n: number) {
  if (n <= 1) return 1
  if (n <= 4) return 2
  if (n <= 9) return 3
  return 4
}

type Panel = "chat" | "people" | "info" | null

function MeetingChat({ room }: { room: string }) {
  const office = useOffice()
  const msgs = messagesFor("nearby")
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [msgs.length])
  return (
    <>
      <div className="mtg-chat-list" ref={listRef}>
        {msgs.length === 0 && <p className="mtg-empty">Messages here go to everyone in {room}.</p>}
        {msgs.map((m) => (
          <div key={m.id} className="mtg-msg">
            <LetterAvatar name={m.fromName} size={24} />
            <div>
              <div className="mtg-msg-head">
                <strong>{m.from === office.meId ? "You" : m.fromName}</strong>
                <span>{new Date(m.ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
              </div>
              {m.text && <div className="mtg-msg-text">{m.text}</div>}
              {m.image && <img className="mtg-msg-img" src={m.image} alt="Shared image" />}
            </div>
          </div>
        ))}
      </div>
      <div className="mtg-composer">
        <Composer conv="nearby" placeholder={`Message ${room}`} compact />
      </div>
    </>
  )
}

/** Full-screen meeting layout shown while inside a meeting room. */
export function MeetingView() {
  const office = useOffice()
  const elapsed = useElapsed(office.meetingSince)
  const [panel, setPanel] = useState<Panel>("chat")
  const me = office.me

  if (!me || !office.inMeeting || office.meetingMinimized) return null

  const room = office.areaName ?? "Meeting"
  const ids = [me.id, ...office.nearby]
  const participants = ids.map((id) => office.players.get(id)).filter((p) => !!p)
  const presenter = participants.find((p) => p.screen)
  const streamOf = (id: string) =>
    id === me.id ? office.screenStream ?? office.localStream : office.streams.get(id) ?? null
  const toggle = (p: Panel) => setPanel(panel === p ? null : p)

  return (
    <section className="mtg" aria-label={`${room} meeting`}>
      <header className="mtg-top">
        <div className="mtg-chip">
          <Users size={15} />
          <strong>{room}</strong>
        </div>
        <span className="mtg-time" title="Time in this meeting">
          <span className="live-dot" aria-hidden /> {elapsed}
        </span>
        <span className="grow" />
        <StageActions inMeeting />
      </header>

      <div className="mtg-body">
        <div className="mtg-main">
          {presenter ? (
            <div className="meeting-presenting">
              <div className="meeting-stage">
                <Tile player={presenter} stream={streamOf(presenter.id)} isMe={presenter.id === me.id} className="is-stage" />
              </div>
              <div className="meeting-strip">
                {participants
                  .filter((p) => p.id !== presenter.id)
                  .map((p) => (
                    <Tile key={p.id} player={p} stream={streamOf(p.id)} isMe={p.id === me.id} className="is-strip" />
                  ))}
              </div>
            </div>
          ) : (
            <div className="meeting-grid" style={{ ["--cols" as string]: columnsFor(participants.length) }}>
              {participants.map((p) => (
                <Tile key={p.id} player={p} stream={streamOf(p.id)} isMe={p.id === me.id} className="is-grid" avatarSize={40} />
              ))}
            </div>
          )}
        </div>

        {panel && (
          <aside className="mtg-panel" aria-label={panel === "chat" ? "Meeting chat" : panel === "people" ? "Participants" : "Meeting info"}>
            <header className="mtg-panel-head">
              <h3>{panel === "chat" ? "Meeting Chat" : panel === "people" ? `Participants (${participants.length})` : "Meeting info"}</h3>
              <button className="mtg-icon" aria-label="Close panel" onClick={() => setPanel(null)}>
                <X size={16} />
              </button>
            </header>
            {panel === "chat" && <MeetingChat room={room} />}
            {panel === "people" && (
              <ul className="mtg-people">
                {participants.map((p) => (
                  <li key={p.id}>
                    <LetterAvatar name={p.name} size={28} status={p.status} />
                    <span className="grow">{p.name}{p.id === me.id ? " (you)" : ""}</span>
                    {!p.mic && <MicOff size={15} className="mic-off" />}
                  </li>
                ))}
              </ul>
            )}
            {panel === "info" && (
              <div className="mtg-info">
                <div><span>Room</span><strong>{room}</strong></div>
                <div><span>Duration</span><strong>{elapsed}</strong></div>
                <div><span>People</span><strong>{participants.length}</strong></div>
                <p className="mtg-empty">Anyone who walks into {room} joins this meeting automatically. Leave the room to leave the meeting.</p>
              </div>
            )}
          </aside>
        )}
      </div>

      <footer className="mtg-foot">
        <span className="grow" />
        <button className={`mtg-icon ${panel === "info" ? "is-active" : ""}`} title="Meeting info" aria-label="Meeting info" onClick={() => toggle("info")}>
          <Info size={18} />
        </button>
        <button className={`mtg-icon ${panel === "people" ? "is-active" : ""}`} title="Participants" aria-label="Participants" onClick={() => toggle("people")}>
          <Users size={18} />
          <span className="mtg-badge">{participants.length}</span>
        </button>
        <button className={`mtg-icon ${panel === "chat" ? "is-active" : ""}`} title="Meeting chat" aria-label="Meeting chat" onClick={() => toggle("chat")}>
          <MessageCircle size={18} />
        </button>
      </footer>
    </section>
  )
}

/** Floating button to reopen the meeting layout after minimizing it. */
export function MeetingRestore() {
  const office = useOffice()
  if (!office.inMeeting || !office.meetingMinimized) return null
  return (
    <button
      className="btn btn-primary meeting-restore"
      onClick={() => {
        office.meetingMinimized = false
        office.emit()
      }}
    >
      <Maximize2 size={16} /> Open meeting view
    </button>
  )
}

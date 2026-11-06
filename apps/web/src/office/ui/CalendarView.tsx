"use client"
import type { Meeting } from "@/shared/protocol"
import { CalendarPlus, Clock, DoorOpen, MapPin, Search, Trash2, Users, X, Link2 } from "./icons"
import { useState, useEffect } from "react"
import { areaAt, meetingRooms } from "../game/map"
import { createMeeting, deleteMeeting, joinMeeting, walkToArea } from "../session"
import { useOffice } from "../store"
import { LetterAvatar } from "./LetterAvatar"
import { SidebarHeader } from "./PeopleView"
import { Dropdown } from "./Dropdown"
import { calendarService, type CalendarEvent } from "../services/calendar"

const fmtTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
const fmtDay = (ts: number) => {
  const d = new Date(ts)
  const today = new Date()
  const tomorrow = new Date(Date.now() + 86400000)
  if (d.toDateString() === today.toDateString()) return "Today"
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow"
  return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })
}

function pad(n: number) {
  return String(n).padStart(2, "0")
}

export function NewMeetingForm({ onClose }: { onClose: () => void }) {
  const rooms = meetingRooms()
  const soon = new Date(Math.ceil(Date.now() / (15 * 60000)) * 15 * 60000)
  const [title, setTitle] = useState("")
  const [room, setRoom] = useState(rooms[0]?.name ?? "")
  const [date, setDate] = useState(`${soon.getFullYear()}-${pad(soon.getMonth() + 1)}-${pad(soon.getDate())}`)
  const [timeStr, setTimeStr] = useState(`${pad(soon.getHours())}:${pad(soon.getMinutes())}`)
  const [duration, setDuration] = useState(30)
  const [description, setDescription] = useState("")

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const start = new Date(`${date}T${timeStr}`).getTime()
    if (!title.trim() || !Number.isFinite(start)) return
    createMeeting({ title: title.trim(), room, start, durationMin: duration, description: description.trim() })
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" role="dialog" aria-label="New meeting" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="modal-head">
          <h2 className="modal-title">New meeting</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="form-grid">
          <label className="field span-2">
            <span className="field-label">Title</span>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Weekly sync" autoFocus maxLength={80} />
          </label>
          <label className="field">
            <span className="field-label">Date</span>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">Start time</span>
            <input className="input" type="time" value={timeStr} onChange={(e) => setTimeStr(e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">Duration</span>
            <Dropdown className="input" label="Duration" value={String(duration)} onChange={(value) => setDuration(Number(value))} options={[15, 30, 45, 60, 90, 120].map((d) => ({ value: String(d), label: d < 60 ? `${d} min` : `${d / 60} hr` }))} />
          </label>
          <label className="field">
            <span className="field-label">Room</span>
            <Dropdown className="input" label="Meeting room" value={room} onChange={setRoom} options={rooms.map((r) => ({ value: r.name, label: r.name }))} />
          </label>
          <label className="field span-2">
            <span className="field-label">Agenda (optional)</span>
            <textarea className="input textarea" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
          </label>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-blue" disabled={!title.trim()}>
            Schedule
          </button>
        </div>
      </form>
    </div>
  )
}

function MeetingCard({ m }: { m: Meeting }) {
  const office = useOffice()
  const now = Date.now()
  const end = m.start + m.durationMin * 60000
  const live = now >= m.start && now < end
  const past = now >= end
  const inRoom = [...office.players.values()].filter((p) => areaAt(p.x, p.y)?.name === m.room)

  const handleWalk = () => {
    walkToArea(m.room)
    office.toast(`Walking to ${m.room}...`)
  }

  return (
    <li className={`meeting-card ${live ? "is-live" : ""} ${past ? "is-past" : ""}`}>
      <div className="meeting-card-time">
        <span>{fmtTime(m.start)}</span>
        <span className="muted">{fmtTime(end)}</span>
      </div>
      <div className="meeting-card-body">
        <div className="meeting-card-title">
          {live && <span className="live-chip">Live</span>}
          {m.title}
        </div>
        <div className="meeting-card-meta">
          <MapPin size={12} /> {m.room} · by {m.createdBy === office.meId ? "you" : m.createdByName}
        </div>
        {m.description && <p className="meeting-card-desc">{m.description}</p>}
        {inRoom.length > 0 && (
          <div className="meeting-card-people">
            {inRoom.slice(0, 5).map((p) => (
              <LetterAvatar key={p.id} name={p.name} size={20} ring />
            ))}
            <span className="muted small">{inRoom.length} in room</span>
          </div>
        )}
        <div className="meeting-card-actions">
          {!past && (
            <button className="btn btn-blue sm" onClick={handleWalk}>
              <DoorOpen size={14} /> Join
            </button>
          )}
          {m.createdBy === office.meId && (
            <button className="icon-btn sm" aria-label="Delete meeting" title="Delete meeting" onClick={() => deleteMeeting(m.id)}>
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </li>
  )
}

export function CalendarView() {
  const office = useOffice()
  const [creating, setCreating] = useState(false)
  const [tab, setTab] = useState<"scheduled" | "notes">("scheduled")
  const [search, setSearch] = useState("")
  const [notes, setNotes] = useState(() => {
    try {
      return localStorage.getItem("oppera.meeting_notes") || ""
    } catch {
      return ""
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem("oppera.meeting_notes", notes)
    } catch {}
  }, [notes])

  // Filter meetings by search query
  const filteredMeetings = office.meetings.filter(
    (m) =>
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.room.toLowerCase().includes(search.toLowerCase()) ||
      (m.description && m.description.toLowerCase().includes(search.toLowerCase()))
  )

  const groups = new Map<string, Meeting[]>()
  for (const m of filteredMeetings) {
    const k = fmtDay(m.start)
    groups.set(k, [...(groups.get(k) ?? []), m])
  }

  return (
    <>
      <SidebarHeader title="Calendar">
        <button className="icon-btn" aria-label="New meeting" title="New meeting" onClick={() => setCreating(true)}>
          <CalendarPlus size={18} />
        </button>
      </SidebarHeader>

      {/* Search Input dengan Badge Ctrl F */}
      <div className="calendar-search-wrap">
        <Search size={14} className="calendar-search-icon" />
        <input
          className="calendar-search-input"
          placeholder="Search events"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="calendar-search-kbd">Ctrl F</span>
      </div>

      {/* Segmented Tabs: Scheduled & Meeting Notes */}
      <div className="calendar-segmented-tabs">
        <button
          className={`calendar-tab-btn ${tab === "scheduled" ? "is-active" : ""}`}
          onClick={() => setTab("scheduled")}
        >
          Scheduled
        </button>
        <button
          className={`calendar-tab-btn ${tab === "notes" ? "is-active" : ""}`}
          onClick={() => setTab("notes")}
        >
          Meeting Notes
        </button>
      </div>

      <div className="sb-scroll">
        {tab === "scheduled" ? (
          <>
            <button className="btn btn-blue full new-meeting" style={{ margin: "0 14px 12px", width: "calc(100% - 28px)" }} onClick={() => setCreating(true)}>
              <CalendarPlus size={16} /> Schedule a meeting
            </button>

            {/* List Jadwal */}
            {filteredMeetings.length === 0 ? (
              <div className="calendar-empty-grass">
                <p style={{ margin: 0 }}>Go touch grass, no meetings today!</p>
              </div>
            ) : (
              [...groups].map(([day, list]) => (
                <div key={day} className="day-group">
                  <div className="day-label">{day}</div>
                  <ul className="meeting-list">
                    {list.map((m) => (
                      <MeetingCard key={m.id} m={m} />
                    ))}
                  </ul>
                </div>
              ))
            )}

            {/* Ruang Rapat / Meeting Rooms */}
            <div className="sb-section static">Meeting rooms</div>
            <ul className="room-list">
              {meetingRooms().map((r) => {
                const people = [...office.players.values()].filter((p) => areaAt(p.x, p.y)?.name === r.name)
                const busy = office.meetings.find((m) => m.room === r.name && Date.now() >= m.start && Date.now() < m.start + m.durationMin * 60000)
                return (
                  <li key={r.name} className="room-row">
                    <span className={`room-dot ${people.length ? "is-occupied" : ""}`} />
                    <div className="room-info">
                      <div className="room-name">{r.name}</div>
                      <div className="room-sub">
                        <Users size={12} /> {people.length ? `${people.length} inside` : "Empty"}
                        {busy ? ` · ${busy.title}` : ""}
                      </div>
                    </div>
                    <button className="btn btn-ghost sm" onClick={() => joinMeeting(r.name)}>
                      Go
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        ) : (
          <div style={{ padding: "0 14px 14px" }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted)", marginBottom: "8px" }}>
              Quick Meeting Notes
            </div>
            <textarea
              className="input textarea"
              rows={12}
              placeholder="Jot down notes, action items, or agendas for your meetings..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ width: "100%", resize: "vertical", fontSize: "13px" }}
            />
          </div>
        )}
      </div>

      {creating && <NewMeetingForm onClose={() => setCreating(false)} />}
    </>
  )
}

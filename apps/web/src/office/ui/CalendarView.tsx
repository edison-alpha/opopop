"use client"
import type { Meeting } from "@/shared/protocol"
import { CalendarPlus, Clock, DoorOpen, MapPin, Trash2, Users, X } from "./icons"
import { useState } from "react"
import { areaAt, meetingRooms } from "../game/map"
import { createMeeting, deleteMeeting, joinMeeting } from "../session"
import { useOffice } from "../store"
import { LetterAvatar } from "./LetterAvatar"
import { SidebarHeader } from "./PeopleView"
import { Dropdown } from "./Dropdown"

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

function NewMeetingForm({ onClose }: { onClose: () => void }) {
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
            <button className="btn btn-blue sm" onClick={() => joinMeeting(m.room)}>
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

  const groups = new Map<string, Meeting[]>()
  for (const m of office.meetings) {
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

      <div className="sb-scroll">
        <button className="btn btn-blue full new-meeting" onClick={() => setCreating(true)}>
          <CalendarPlus size={16} /> Schedule a meeting
        </button>

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

        <div className="sb-section static">Schedule</div>
        {office.meetings.length === 0 ? (
          <div className="empty-block">
            <Clock size={22} />
            <p>No meetings scheduled. Book a room so everyone knows where to go.</p>
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
      </div>
      {creating && <NewMeetingForm onClose={() => setCreating(false)} />}
    </>
  )
}

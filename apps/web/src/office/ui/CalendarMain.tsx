"use client"
import { useEffect, useState } from "react"
import { useOffice } from "../store"
import { calendarService, type CalendarEvent } from "../services/calendar"
import { walkToArea } from "../session"
import { NewMeetingForm } from "./CalendarView"
import {
  CalendarDays,
  CalendarPlus,
  ChevronDown,
  Clock,
  DoorOpen,
  MapPin,
  Plus,
  RotateCw,
  X,
  Link2,
} from "./icons"

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function startOfWeek(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day
  return new Date(date.setDate(diff))
}

function formatHour(h: number): string {
  if (h === 0) return "12 AM"
  if (h < 12) return `${h} AM`
  if (h === 12) return "12 PM"
  return `${h - 12} PM`
}

export function CalendarMain() {
  const office = useOffice()
  const [viewDate, setViewDate] = useState(() => new Date())
  const [now, setNow] = useState(() => new Date())
  const [creating, setCreating] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [icsInput, setIcsInput] = useState(calendarService.icsUrl)
  const [syncing, setSyncing] = useState(false)

  // Update current time marker every 30 seconds
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  const sunday = startOfWeek(viewDate)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday)
    d.setDate(sunday.getDate() + i)
    return d
  })

  const monthTitle = viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  const allEvents = calendarService.getAllEvents(office.meetings)

  // Pisahkan all-day events vs time slot events
  const allDayEvents = allEvents.filter((e) => e.allDay)
  const timeEvents = allEvents.filter((e) => !e.allDay)

  const handlePrevWeek = () => {
    const d = new Date(viewDate)
    d.setDate(d.getDate() - 7)
    setViewDate(d)
  }

  const handleNextWeek = () => {
    const d = new Date(viewDate)
    d.setDate(d.getDate() + 7)
    setViewDate(d)
  }

  const handleToday = () => {
    setViewDate(new Date())
  }

  const handleSync = async () => {
    setSyncing(true)
    await calendarService.syncIcsCalendar()
    await calendarService.fetchGoogleEvents()
    setSyncing(false)
    office.toast("Calendar refreshed")
  }

  // Deep Link: Auto-walk to room
  const handleWalkToRoom = (room?: string) => {
    if (!room) return
    walkToArea(room)
    setSelectedEvent(null)
    office.openSidebar("people")
    office.toast(`Walking to ${room}...`)
  }

  // Hitung posisi garis waktu merah saat ini
  const isCurrentWeek = weekDays.some((d) => d.toDateString() === now.toDateString())
  const currentDayIndex = now.getDay()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const currentTop = (currentMinutes / 60) * 60 // 60px per jam

  const currentTimeLabel = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })

  return (
    <div className="calendar-main">
      {/* Top Header Navigation */}
      <header className="calendar-topbar">
        <div className="calendar-nav-left">
          <button className="calendar-nav-btn" onClick={handlePrevWeek} aria-label="Previous week">
            ‹
          </button>
          <button className="calendar-nav-btn" onClick={handleNextWeek} aria-label="Next week">
            ›
          </button>
          <button className="calendar-today-btn" onClick={handleToday}>
            Today
          </button>
          <h2 className="calendar-month-title">{monthTitle}</h2>
        </div>

        <div className="calendar-nav-right">
          <button className="calendar-sync-indicator" onClick={handleSync} title="Refresh calendar">
            <RotateCw size={14} className={syncing ? "spin" : ""} />
            <span>{syncing ? "Syncing..." : "Just now"}</span>
          </button>

          <button className="calendar-filter-dropdown" onClick={() => setShowConnectModal(true)}>
            <span className="cal-dot" />
            <span>{calendarService.isConnected ? "Google & OPPERA" : "1 calendar"}</span>
            <ChevronDown size={14} />
          </button>

          <button className="calendar-new-btn" onClick={() => setCreating(true)}>
            <Plus size={16} /> New Meeting
          </button>
        </div>
      </header>

      {/* Week Day Header */}
      <div className="calendar-week-header">
        <div className="calendar-gutter-corner" />
        {weekDays.map((d, i) => {
          const isToday = d.toDateString() === now.toDateString()
          return (
            <div key={i} className={`calendar-day-header ${isToday ? "is-today" : ""}`}>
              <span className="day-name">{DAYS[d.getDay()]}</span>
              <span className="day-num">{d.getDate()}</span>
            </div>
          )
        })}
      </div>

      {/* All-Day Events Section (Banner Hackathon dll) */}
      <div className="calendar-allday-row">
        <div className="calendar-allday-gutter" />
        <div className="calendar-allday-grid">
          {allDayEvents.map((e) => (
            <div
              key={e.id}
              className="calendar-allday-pill"
              onClick={() => setSelectedEvent(e)}
              title={`${e.title} (${e.room || "Room"})`}
            >
              <span>{e.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Time Grid (24 Jam) */}
      <div className="calendar-scroll-area">
        <div className="calendar-time-body">
          {/* Time Gutter Kiri */}
          <div className="calendar-time-gutter">
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="calendar-hour-cell">
                {h > 0 ? formatHour(h) : ""}
              </div>
            ))}
          </div>

          {/* 7 Kolom Hari */}
          {weekDays.map((d, dayIndex) => {
            const isToday = isCurrentWeek && dayIndex === currentDayIndex
            const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
            const dayEnd = dayStart + 86400000

            // Event yang jatuh di hari ini
            const dayEvents = timeEvents.filter((e) => e.start < dayEnd && e.end > dayStart)

            return (
              <div key={dayIndex} className="calendar-day-col">
                {/* Garis Horizontal tiap jam */}
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} className="calendar-grid-line" />
                ))}

                {/* Garis Merah Penunjuk Waktu Saat Ini */}
                {isToday && (
                  <div className="calendar-now-indicator" style={{ top: `${currentTop}px` }}>
                    <div className="calendar-now-badge">{currentTimeLabel}</div>
                    <div className="calendar-now-dot" />
                  </div>
                )}

                {/* Kartu Event */}
                {dayEvents.map((e) => {
                  const s = new Date(Math.max(e.start, dayStart))
                  const startMin = s.getHours() * 60 + s.getMinutes()
                  const durationMin = Math.max(15, (Math.min(e.end, dayEnd) - s.getTime()) / 60000)
                  const top = (startMin / 60) * 60
                  const height = Math.max(26, (durationMin / 60) * 60)

                  const isOppera = e.source === "oppera"

                  return (
                    <div
                      key={e.id}
                      className={`calendar-grid-card ${isOppera ? "is-oppera" : ""}`}
                      style={{ top: `${top}px`, height: `${height}px` }}
                      onClick={() => setSelectedEvent(e)}
                    >
                      <div className="calendar-card-title">{e.title}</div>
                      <div className="calendar-card-time">
                        {new Date(e.start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </div>
                      {e.room && (
                        <div className="calendar-card-room">
                          <MapPin size={10} /> {e.room}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal Form New Meeting */}
      {creating && <NewMeetingForm onClose={() => setCreating(false)} />}

      {/* Modal Detail Event & Deep-link Walk to Room */}
      {selectedEvent && (
        <div className="modal-backdrop" onClick={() => setSelectedEvent(null)}>
          <div className="modal" role="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2 className="modal-title">{selectedEvent.title}</h2>
              <button className="icon-btn" onClick={() => setSelectedEvent(null)}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", margin: "16px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--muted)" }}>
                <Clock size={16} />
                <span>
                  {new Date(selectedEvent.start).toLocaleString([], {
                    dateStyle: "medium",
                    timeStyle: selectedEvent.allDay ? undefined : "short",
                  })}{" "}
                  -{" "}
                  {new Date(selectedEvent.end).toLocaleString([], {
                    timeStyle: selectedEvent.allDay ? undefined : "short",
                  })}
                </span>
              </div>
              {selectedEvent.room && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                  <MapPin size={16} />
                  <span>Room: <strong>{selectedEvent.room}</strong></span>
                </div>
              )}
              {selectedEvent.description && (
                <p style={{ fontSize: "13px", color: "var(--text)", background: "var(--panel-2)", padding: "10px", borderRadius: "8px", margin: 0 }}>
                  {selectedEvent.description}
                </p>
              )}
              <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                Source: {selectedEvent.source === "google" ? "Google Calendar" : "OPPERA Meeting"}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setSelectedEvent(null)}>
                Close
              </button>
              {selectedEvent.room && (
                <button className="btn btn-blue" onClick={() => handleWalkToRoom(selectedEvent.room)}>
                  <DoorOpen size={16} /> Walk to room
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Hubungkan Google Calendar */}
      {showConnectModal && (
        <div className="modal-backdrop" onClick={() => setShowConnectModal(false)}>
          <div className="modal" role="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2 className="modal-title">Connect Google Calendar</h2>
              <button className="icon-btn" onClick={() => setShowConnectModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", margin: "16px 0" }}>
              <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>
                Sinkronkan jadwal meeting Anda dari Google Calendar ke dalam kantor virtual OPPERA.
              </p>

              <label className="field">
                <span className="field-label">Google Calendar iCal (.ics) Secret Address</span>
                <input
                  className="input"
                  placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
                  value={icsInput}
                  onChange={(e) => setIcsInput(e.target.value)}
                />
              </label>
              <div style={{ fontSize: "11px", color: "var(--muted)", lineHeight: 1.4 }}>
                💡 <strong>Cara dapatkan link iCal Google Calendar:</strong>
                <br />
                Buka Google Calendar di web ➜ Klik titik tiga di kalender Anda ➜ Settings and sharing ➜ Scroll ke bawah ke bagian <em>"Secret address in iCal format"</em> ➜ Salin link dan tempel di sini.
              </div>
            </div>
            <div className="modal-actions">
              {calendarService.isConnected && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    calendarService.disconnect()
                    setIcsInput("")
                    setShowConnectModal(false)
                    office.toast("Disconnected from Google Calendar")
                  }}
                >
                  Disconnect
                </button>
              )}
              <button
                className="btn btn-blue"
                onClick={() => {
                  calendarService.setIcsUrl(icsInput)
                  setShowConnectModal(false)
                  office.toast("Google Calendar synced!")
                }}
              >
                <Link2 size={16} /> Save &amp; Sync
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

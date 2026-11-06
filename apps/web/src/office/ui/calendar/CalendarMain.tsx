"use client"
import { useEffect, useState } from "react"
import { useOffice } from "../../store"
import { calendarService, type CalendarEvent } from "../../services/calendar"
import { walkToArea } from "../../session"
import { NewMeetingForm } from "./CalendarView"

import { CalendarTopbar } from "./CalendarTopbar"
import { CalendarWeekHeader } from "./CalendarWeekHeader"
import { CalendarAllDayRow } from "./CalendarAllDayRow"
import { CalendarTimeGrid } from "./CalendarTimeGrid"
import { CalendarDetailModal } from "./CalendarDetailModal"
import { ConnectGoogleModal } from "./ConnectGoogleModal"

function startOfWeek(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day
  return new Date(date.setDate(diff))
}

export function CalendarMain() {
  const office = useOffice()
  const [viewDate, setViewDate] = useState(() => new Date())
  const [now, setNow] = useState(() => new Date())
  const [creating, setCreating] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showConnectModal, setShowConnectModal] = useState(false)
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

  // Current time position calculation
  const isCurrentWeek = weekDays.some((d) => d.toDateString() === now.toDateString())
  const currentDayIndex = now.getDay()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const currentTop = (currentMinutes / 60) * 60 // 60px per hour
  const currentTimeLabel = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })

  return (
    <div className="calendar-main">
      {/* 1. Header Navigation Bar */}
      <CalendarTopbar
        monthTitle={monthTitle}
        syncing={syncing}
        isConnected={calendarService.isConnected}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
        onToday={handleToday}
        onSync={handleSync}
        onOpenConnectModal={() => setShowConnectModal(true)}
        onNewMeeting={() => setCreating(true)}
      />

      {/* 2. Week Day Header (Fixed height & uniform 28px circles for all days) */}
      <CalendarWeekHeader weekDays={weekDays} now={now} />

      {/* 3. All-Day Multi-day Events Section */}
      <CalendarAllDayRow allDayEvents={allDayEvents} onSelectEvent={setSelectedEvent} />

      {/* 4. Time Grid Scroll Area (24 Hours + Current Time Line) */}
      <CalendarTimeGrid
        weekDays={weekDays}
        timeEvents={timeEvents}
        isCurrentWeek={isCurrentWeek}
        currentDayIndex={currentDayIndex}
        currentTop={currentTop}
        currentTimeLabel={currentTimeLabel}
        onSelectEvent={setSelectedEvent}
      />

      {/* 5. Modals */}
      {creating && <NewMeetingForm onClose={() => setCreating(false)} />}

      {selectedEvent && (
        <CalendarDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onWalkToRoom={handleWalkToRoom}
        />
      )}

      {showConnectModal && (
        <ConnectGoogleModal
          initialIcsUrl={calendarService.icsUrl}
          isConnected={calendarService.isConnected}
          onClose={() => setShowConnectModal(false)}
          onSaveIcs={(url) => {
            calendarService.setIcsUrl(url)
            office.toast("Google Calendar synced!")
          }}
          onDisconnect={() => {
            calendarService.disconnect()
            office.toast("Disconnected from Google Calendar")
          }}
        />
      )}
    </div>
  )
}

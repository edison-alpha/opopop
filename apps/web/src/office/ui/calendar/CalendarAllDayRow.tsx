"use client"
import type { CalendarEvent } from "../../services/calendar"

interface CalendarAllDayRowProps {
  allDayEvents: CalendarEvent[]
  onSelectEvent: (event: CalendarEvent) => void
}

export function CalendarAllDayRow({ allDayEvents, onSelectEvent }: CalendarAllDayRowProps) {
  if (allDayEvents.length === 0) return null

  return (
    <div className="calendar-allday-row">
      <div className="calendar-allday-gutter" />
      <div className="calendar-allday-grid">
        {allDayEvents.map((e) => (
          <div
            key={e.id}
            className="calendar-allday-pill"
            onClick={() => onSelectEvent(e)}
            title={`${e.title} (${e.room || "Room"})`}
          >
            <span>{e.title}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

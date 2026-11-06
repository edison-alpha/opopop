"use client"
import type { CalendarEvent } from "../../services/calendar"
import { MapPin } from "../icons"

interface CalendarEventCardProps {
  event: CalendarEvent
  top: number
  height: number
  onSelect: (event: CalendarEvent) => void
}

export function CalendarEventCard({ event, top, height, onSelect }: CalendarEventCardProps) {
  const isOppera = event.source === "oppera"

  return (
    <div
      className={`calendar-grid-card ${isOppera ? "is-oppera" : ""}`}
      style={{ top: `${top}px`, height: `${height}px` }}
      onClick={() => onSelect(event)}
    >
      <div className="calendar-card-title">{event.title}</div>
      <div className="calendar-card-time">
        {new Date(event.start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
      </div>
      {event.room && (
        <div className="calendar-card-room">
          <MapPin size={10} /> {event.room}
        </div>
      )}
    </div>
  )
}

"use client"
import type { CalendarEvent } from "../../services/calendar"
import { CalendarEventCard } from "./CalendarEventCard"
import { CurrentTimeIndicator } from "./CurrentTimeIndicator"

interface CalendarTimeGridProps {
  weekDays: Date[]
  timeEvents: CalendarEvent[]
  isCurrentWeek: boolean
  currentDayIndex: number
  currentTop: number
  currentTimeLabel: string
  onSelectEvent: (event: CalendarEvent) => void
}

function formatHour(h: number): string {
  if (h === 0) return "12 AM"
  if (h < 12) return `${h} AM`
  if (h === 12) return "12 PM"
  return `${h - 12} PM`
}

export function CalendarTimeGrid({
  weekDays,
  timeEvents,
  isCurrentWeek,
  currentDayIndex,
  currentTop,
  currentTimeLabel,
  onSelectEvent,
}: CalendarTimeGridProps) {
  return (
    <div className="calendar-scroll-area">
      <div className="calendar-time-body">
        {/* Left Time Gutter (24 Hours) */}
        <div className="calendar-time-gutter">
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="calendar-hour-cell">
              {h > 0 ? formatHour(h) : ""}
            </div>
          ))}
        </div>

        {/* 7 Day Columns */}
        {weekDays.map((d, dayIndex) => {
          const isToday = isCurrentWeek && dayIndex === currentDayIndex
          const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
          const dayEnd = dayStart + 86400000

          // Events that overlap this day
          const dayEvents = timeEvents.filter((e) => e.start < dayEnd && e.end > dayStart)

          return (
            <div key={dayIndex} className="calendar-day-col">
              {/* Horizontal Hour Lines */}
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="calendar-grid-line" />
              ))}

              {/* Current Time Indicator (Red line & badge) */}
              {isToday && (
                <CurrentTimeIndicator top={currentTop} timeLabel={currentTimeLabel} />
              )}

              {/* Event Cards */}
              {dayEvents.map((e) => {
                const s = new Date(Math.max(e.start, dayStart))
                const startMin = s.getHours() * 60 + s.getMinutes()
                const durationMin = Math.max(15, (Math.min(e.end, dayEnd) - s.getTime()) / 60000)
                const top = (startMin / 60) * 60
                const height = Math.max(26, (durationMin / 60) * 60)

                return (
                  <CalendarEventCard
                    key={e.id}
                    event={e}
                    top={top}
                    height={height}
                    onSelect={onSelectEvent}
                  />
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

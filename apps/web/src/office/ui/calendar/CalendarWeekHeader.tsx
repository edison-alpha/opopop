"use client"

interface CalendarWeekHeaderProps {
  weekDays: Date[]
  now: Date
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function CalendarWeekHeader({ weekDays, now }: CalendarWeekHeaderProps) {
  return (
    <div className="calendar-week-header">
      <div className="calendar-gutter-corner" />
      {weekDays.map((d, i) => {
        const isToday = d.toDateString() === now.toDateString()
        return (
          <div key={i} className={`calendar-day-header ${isToday ? "is-today" : ""}`}>
            <span className="day-name">{DAYS[d.getDay()]}</span>
            <div className="day-num-box">
              <span className="day-num">{d.getDate()}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

"use client"

interface CurrentTimeIndicatorProps {
  top: number
  timeLabel: string
}

export function CurrentTimeIndicator({ top, timeLabel }: CurrentTimeIndicatorProps) {
  return (
    <div className="calendar-now-indicator" style={{ top: `${top}px` }}>
      <div className="calendar-now-badge">{timeLabel}</div>
      <div className="calendar-now-dot" />
    </div>
  )
}

"use client"
import { ChevronDown, Plus, RotateCw } from "../common/icons"

interface CalendarTopbarProps {
  monthTitle: string
  syncing: boolean
  isConnected: boolean
  onPrevWeek: () => void
  onNextWeek: () => void
  onToday: () => void
  onSync: () => void
  onOpenConnectModal: () => void
  onNewMeeting: () => void
}

function ChevronLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

export function CalendarTopbar({
  monthTitle,
  syncing,
  isConnected,
  onPrevWeek,
  onNextWeek,
  onToday,
  onSync,
  onOpenConnectModal,
  onNewMeeting,
}: CalendarTopbarProps) {
  return (
    <header className="calendar-topbar">
      <div className="calendar-nav-left">
        <button className="calendar-nav-btn" onClick={onPrevWeek} aria-label="Previous week" title="Previous week">
          <ChevronLeftIcon />
        </button>
        <button className="calendar-nav-btn" onClick={onNextWeek} aria-label="Next week" title="Next week">
          <ChevronRightIcon />
        </button>
        <button className="calendar-today-btn" onClick={onToday}>
          Today
        </button>
        <h2 className="calendar-month-title">{monthTitle}</h2>
      </div>

      <div className="calendar-nav-right">
        <button className="calendar-sync-indicator" onClick={onSync} title="Refresh calendar">
          <RotateCw size={13} className={syncing ? "spin" : ""} />
          <span>{syncing ? "Syncing..." : "Just now"}</span>
        </button>

        <button className="calendar-filter-dropdown" onClick={onOpenConnectModal}>
          <span className="cal-dot" />
          <span>{isConnected ? "Google & OPPERA" : "1 calendar"}</span>
          <ChevronDown size={14} />
        </button>

        <button className="calendar-new-btn" onClick={onNewMeeting}>
          <Plus size={16} /> New Meeting
        </button>
      </div>
    </header>
  )
}

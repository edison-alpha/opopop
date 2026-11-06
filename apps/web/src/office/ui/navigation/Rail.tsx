"use client"
import { Bell, CalendarDays, Map as MapIcon, MessageCircle, Search, Settings, UserPlus, Video } from "../common/icons"
import { Link } from "react-router-dom"
import { copyInviteLink } from "../../session"
import { useOffice, type SidebarView } from "../../store"

function RailButton({
  view,
  label,
  icon,
  badge,
}: {
  view: SidebarView
  label: string
  icon: React.ReactNode
  badge?: number
}) {
  const office = useOffice()
  const active = office.sidebarOpen && office.sidebar === view
  return (
    <button
      className={`rail-btn ${active ? "is-active" : ""}`}
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={() => office.openSidebar(view)}
    >
      {icon}
      {!!badge && <span className="rail-badge">{badge > 9 ? "9+" : badge}</span>}
    </button>
  )
}

export function Rail() {
  const office = useOffice()
  return (
    <nav className="rail" aria-label="Main">
      <Link to="/" className="rail-logo" aria-label="OPPERA home">
        <svg viewBox="0 0 64 64" width="22" height="22" aria-hidden>
          <circle cx="32" cy="32" r="14" fill="none" stroke="#fff" strokeWidth="8" />
        </svg>
      </Link>
      <button
        className="rail-btn rail-search"
        aria-label="Search (Ctrl K)"
        title="Search"
        onClick={() => {
          office.paletteOpen = true
          office.emit()
        }}
      >
        <Search size={20} />
      </button>
      <span className="rail-kbd" aria-hidden>
        <kbd>Ctrl</kbd>
        <kbd>K</kbd>
      </span>
      <div className="rail-group">
        <RailButton view="people" label="Map & people" icon={<MapIcon size={20} />} />
        <RailButton view="chat" label="Chat" icon={<MessageCircle size={20} />} badge={office.preferences.unreadBadges ? office.unreadTotal : 0} />
        <RailButton view="calendar" label="Calendar" icon={<CalendarDays size={20} />} />
        <RailButton view="notifications" label="Notifications" icon={<Bell size={20} />} badge={office.preferences.unreadBadges ? office.unreadNotices : 0} />
      </div>
      {(office.inMeeting || office.stageView === "grid") && (
        <div className="rail-group">
          <button
            className={`rail-meeting ${office.meetingViewOpen ? "is-open" : ""}`}
            aria-label="Open meeting"
            title={office.areaName ?? "Meeting"}
            onClick={() => {
              const close = office.meetingViewOpen
              office.meetingMinimized = close
              office.stageView = close ? "map" : "grid"
              if (!close) office.sidebar = "people"
              office.emit()
            }}
          >
            <span className="rail-meeting-icon"><Video size={20} /></span>
            <span className="rail-meeting-label">Meeting</span>
          </button>
        </div>
      )}
      <div className="rail-bottom">
        <button className="rail-btn" aria-label="Invite people" title="Invite people" onClick={() => void copyInviteLink()}>
          <UserPlus size={20} />
        </button>
        <button
          className="rail-btn"
          type="button"
          aria-label="Settings"
          aria-haspopup="dialog"
          aria-expanded={office.settingsOpen}
          title="Settings"
          onClick={() => {
            office.settingsOpen = true
            office.emit()
          }}
        >
          <Settings size={20} />
        </button>
      </div>
    </nav>
  )
}

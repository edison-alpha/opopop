"use client"
import { BellOff, CalendarClock, LogIn, LogOut, MessageCircle } from "./icons"
import { useEffect } from "react"
import { useOffice, type Notice } from "../store"
import { SidebarHeader } from "./PeopleView"

const ICON: Record<Notice["icon"], React.ReactNode> = {
  wave: <span aria-hidden>👋</span>,
  join: <LogIn size={16} />,
  leave: <LogOut size={16} />,
  meeting: <CalendarClock size={16} />,
  chat: <MessageCircle size={16} />,
}

function ago(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return "just now"
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export function NotificationsView() {
  const office = useOffice()

  // Opening the panel marks everything as read once it has been seen.
  useEffect(() => {
    const t = setTimeout(() => {
      if (office.notices.some((n) => !n.read)) {
        office.notices = office.notices.map((n) => ({ ...n, read: true }))
        office.emit()
      }
    }, 1200)
    return () => clearTimeout(t)
  }, [office, office.notices.length])

  return (
    <>
      <SidebarHeader title="Notifications">
        {office.notices.length > 0 && (
          <button
            className="link-btn"
            onClick={() => {
              office.notices = []
              office.emit()
            }}
          >
            Clear
          </button>
        )}
      </SidebarHeader>
      {office.notices.length === 0 ? (
        <div className="empty-block">
          <BellOff size={22} />
          <p>You&apos;re all caught up. Waves, messages and meeting reminders show up here.</p>
        </div>
      ) : (
        <ul className="notice-list">
          {office.notices.map((n) => (
            <li key={n.id} className={`notice ${n.read ? "" : "is-unread"}`}>
              <span className="notice-icon">{ICON[n.icon]}</span>
              <div className="notice-body">
                <div className="notice-text">{n.text}</div>
                <div className="notice-time">{ago(n.ts)}</div>
                {n.action && (
                  <button className="link-btn" onClick={n.action.run}>
                    {n.action.label}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

"use client"
import { useOffice } from "../../store"
import { CalendarView } from "../calendar/CalendarView"
import { ChatView } from "../chat/ChatView"
import { Dock } from "./Dock"
import { NotificationsView } from "../common/NotificationsView"
import { PeopleView } from "../common/PeopleView"

export function Sidebar({ onLeave }: { onLeave: () => void }) {
  const office = useOffice()
  if (office.meetingViewOpen && office.sidebar === "people") return null
  // The chat view always shows its sidebar so the map dock stays reachable.
  if (!office.sidebarOpen && office.sidebar !== "chat") return null
  return (
    <aside className="sidebar" aria-label="Sidebar">
      {office.sidebar === "people" && <PeopleView />}
      {office.sidebar === "chat" && <ChatView />}
      {office.sidebar === "calendar" && <CalendarView />}
      {office.sidebar === "notifications" && <NotificationsView />}
      <Dock onLeave={onLeave} />
    </aside>
  )
}

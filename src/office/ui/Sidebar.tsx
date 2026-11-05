"use client"
import { useOffice } from "../store"
import { CalendarView } from "./CalendarView"
import { ChatView } from "./ChatView"
import { Dock } from "./Dock"
import { NotificationsView } from "./NotificationsView"
import { PeopleView } from "./PeopleView"

export function Sidebar({ onLeave }: { onLeave: () => void }) {
  const office = useOffice()
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

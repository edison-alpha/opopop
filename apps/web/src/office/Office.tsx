"use client"
import type { AvatarLook } from "@/shared/protocol"
import { PhaserGame } from "./game/PhaserGame"
import { useEffect, useState } from "react"
import { SPAWN } from "./game/map"
import { joinOffice, leaveOffice } from "./session"
import { store, useOffice } from "./store"
import { BuildPanel } from "./ui/BuildPanel"
import { CalendarMain } from "./ui/CalendarMain"
import { ChatMain } from "./ui/ChatMain"
import { CommandPalette } from "./ui/CommandPalette"
import { JoinScreen } from "./ui/JoinScreen"
import { MeetingRestore, MeetingView } from "./ui/Meeting"
import { MapControls, Minimap, StageHeader, ToastBar } from "./ui/Overlays"
import { GameUIOverlay } from "./ui/GameUIOverlay"
import { Rail } from "./ui/Rail"
import { SettingsModal } from "./ui/SettingsModal"
import { Sidebar } from "./ui/Sidebar"
import { Toolbar } from "./ui/Toolbar"
import { Spotlight, VideoBar } from "./ui/VideoBar"

function Stage({ onLeave }: { onLeave: () => void }) {
  const office = useOffice()
  const chat = office.sidebar === "chat"
  const calendar = office.sidebar === "calendar"
  return (
    <main className={`stage ${chat ? "is-chat" : ""} ${calendar ? "is-calendar" : ""}`}>
      {/* The map keeps running underneath the chat/calendar so movement and audio continue. */}
      <PhaserGame />
      <GameUIOverlay />
      {chat ? (
        <ChatMain />
      ) : calendar ? (
        <CalendarMain />
      ) : (
        <>
          <StageHeader />
          <VideoBar />
          <MeetingView onLeave={onLeave} />
          <MeetingRestore />
          <Minimap />
          <MapControls />
          <BuildPanel />
          {!office.meetingViewOpen && <Toolbar onLeave={onLeave} />}
        </>
      )}
      <ToastBar />
      <Spotlight />
    </main>
  )
}

export default function Office() {
  const [joined, setJoined] = useState(false)
  const office = useOffice()

  useEffect(() => () => leaveOffice(), [])

  const onJoin = ({ name, role, look, stream }: { name: string; role: string; look: AvatarLook; stream: MediaStream | null }) => {
    leaveOffice()
    store.localStream = stream
    joinOffice(name, look, SPAWN, role)
    setJoined(true)
  }
  const onLeave = () => {
    leaveOffice()
    setJoined(false)
  }

  if (!joined) return <JoinScreen onJoin={onJoin} />

  return (
    <div className={`office ${office.meetingViewOpen ? "is-meeting" : ""}`}>
      <Rail />
      <Sidebar onLeave={onLeave} />
      <Stage onLeave={onLeave} />
      <CommandPalette />
      <SettingsModal />
    </div>
  )
}

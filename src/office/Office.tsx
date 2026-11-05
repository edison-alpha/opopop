"use client"
import type { AvatarLook } from "@/shared/protocol"
import dynamic from "next/dynamic"
import { useEffect, useState } from "react"
import { SPAWN } from "./game/map"
import { joinOffice, leaveOffice } from "./session"
import { store, useOffice } from "./store"
import { BuildPanel } from "./ui/BuildPanel"
import { ChatMain } from "./ui/ChatMain"
import { CommandPalette } from "./ui/CommandPalette"
import { JoinScreen } from "./ui/JoinScreen"
import { MeetingRestore, MeetingView } from "./ui/Meeting"
import { MapControls, Minimap, StageHeader, ToastBar } from "./ui/Overlays"
import { Rail } from "./ui/Rail"
import { SettingsModal } from "./ui/SettingsModal"
import { Sidebar } from "./ui/Sidebar"
import { Toolbar } from "./ui/Toolbar"
import { ConversationGrid, Spotlight, VideoBar } from "./ui/VideoBar"

// Phaser touches window at import time, so load it on the client only.
const PhaserGame = dynamic(() => import("./game/PhaserGame").then((m) => m.PhaserGame), { ssr: false })

function Stage({ onLeave }: { onLeave: () => void }) {
  const office = useOffice()
  const chat = office.sidebar === "chat"
  return (
    <main className={`stage ${chat ? "is-chat" : ""}`}>
      {/* The map keeps running underneath the chat so movement and audio continue. */}
      <PhaserGame />
      {chat ? (
        <ChatMain />
      ) : (
        <>
          <StageHeader />
          <VideoBar />
          <ConversationGrid />
          <MeetingView />
          <MeetingRestore />
          <Minimap />
          <MapControls />
          <BuildPanel />
          <Toolbar onLeave={onLeave} />
        </>
      )}
      <ToastBar />
      <Spotlight />
    </main>
  )
}

export default function Office() {
  const [joined, setJoined] = useState(false)

  useEffect(() => () => leaveOffice(), [])

  const onJoin = ({ name, look, stream }: { name: string; look: AvatarLook; stream: MediaStream | null }) => {
    leaveOffice()
    store.localStream = stream
    joinOffice(name, look, SPAWN)
    setJoined(true)
  }
  const onLeave = () => {
    leaveOffice()
    setJoined(false)
  }

  if (!joined) return <JoinScreen onJoin={onJoin} />

  return (
    <div className="office">
      <Rail />
      <Sidebar onLeave={onLeave} />
      <Stage onLeave={onLeave} />
      <CommandPalette />
      <SettingsModal />
    </div>
  )
}

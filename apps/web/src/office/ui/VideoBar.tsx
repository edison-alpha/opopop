"use client"
import { MicOff, Monitor } from "./icons"
import { useEffect, useRef } from "react"
import { areaAt } from "../game/map"
import { volumeFor } from "../session"
import { useOffice, type Avatar } from "../store"
import { LetterAvatar } from "./LetterAvatar"

type SinkVideo = HTMLVideoElement & { setSinkId?: (id: string) => Promise<void> }

export function Tile({
  player,
  stream,
  isMe,
  className = "",
  avatarSize = 40,
}: {
  player: Avatar
  stream: MediaStream | null
  isMe: boolean
  className?: string
  avatarSize?: number
}) {
  const office = useOffice()
  const ref = useRef<SinkVideo>(null)
  const showVideo = !!stream && (player.cam || player.screen)

  useEffect(() => {
    const v = ref.current
    if (v && v.srcObject !== stream) v.srcObject = stream
  })
  useEffect(() => {
    const v = ref.current
    if (!v || isMe) return
    v.volume = volumeFor(player.id)
    if (office.devices.audioOut && v.setSinkId) void v.setSinkId(office.devices.audioOut).catch(() => {})
  })

  return (
    <button
      type="button"
      className={`video-tile ${player.screen ? "is-screen" : ""} ${className}`}
      onClick={() => {
        office.spotlight = player.id
        office.emit()
      }}
      aria-label={`Expand ${player.name}`}
    >
      {/* Kept mounted so remote audio keeps playing while the camera is off. */}
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={isMe}
        className={`${isMe && !player.screen ? "mirror" : ""} ${showVideo ? "" : "is-hidden"}`}
      />
      {!showVideo && (
        <div className="video-tile-avatar">
          <LetterAvatar name={player.name} size={avatarSize} />
        </div>
      )}
      {player.hand && <span className="tile-hand" aria-label="Hand raised">✋</span>}
      <div className="video-tile-name">
        {!player.mic && <MicOff size={12} className="mic-off" />}
        {player.screen && <Monitor size={12} />}
        <span>{player.name}</span>
      </div>
    </button>
  )
}

export function VideoBar() {
  const office = useOffice()
  const me = office.me
  if (!me || office.sidebar === "chat") return null
  if (office.inMeeting && !office.meetingMinimized) return null
  if (office.stageView === "grid") return null
  if (office.nearby.size === 0 && !office.inMeeting) return null

  const area = areaAt(me.x, me.y)
  const myStream = office.screenStream ?? office.localStream
  return (
    <div className="video-dock" aria-label="People you are talking to">
      <div className="video-bar">
        <Tile player={me} stream={myStream} isMe />
        {[...office.nearby].map((id) => {
          const p = office.players.get(id)
          if (!p) return null
          return <Tile key={id} player={p} stream={office.streams.get(id) ?? null} isMe={false} />
        })}
      </div>
      <div className="video-caption">
        {area?.private ? `Only people in ${area.name} can hear you` : "Nearby people may listen in"}
      </div>
    </div>
  )
}

/** Grid layout of the current conversation (stage "grid" view). */
export function ConversationGrid() {
  const office = useOffice()
  const me = office.me
  if (!me || office.stageView !== "grid" || office.sidebar === "chat") return null
  if (office.inMeeting && !office.meetingMinimized) return null
  const ids = [me.id, ...office.nearby]
  const cols = ids.length <= 1 ? 1 : ids.length <= 4 ? 2 : ids.length <= 9 ? 3 : 4
  return (
    <div className="convo-grid" style={{ ["--cols" as string]: cols }}>
      {ids.map((id) => {
        const p = office.players.get(id)
        if (!p) return null
        const stream = id === me.id ? office.screenStream ?? office.localStream : office.streams.get(id) ?? null
        return <Tile key={id} player={p} stream={stream} isMe={id === me.id} className="is-grid" avatarSize={72} />
      })}
      {ids.length === 1 && <p className="meeting-alone">Walk up to someone to start a conversation.</p>}
    </div>
  )
}

export function Spotlight() {
  const office = useOffice()
  const ref = useRef<HTMLVideoElement>(null)
  const id = office.spotlight
  const p = id ? office.players.get(id) : null
  const isMe = id === office.meId
  const stream = isMe ? office.screenStream ?? office.localStream : id ? office.streams.get(id) ?? null : null

  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream
  }, [stream])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && office.spotlight) {
        office.spotlight = null
        office.emit()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [office])

  if (!p) return null
  const close = () => {
    office.spotlight = null
    office.emit()
  }
  return (
    <div className="spotlight" role="dialog" aria-label={`${p.name}'s video`} onClick={close}>
      <div className="spotlight-frame" onClick={(e) => e.stopPropagation()}>
        {stream && (p.cam || p.screen) ? (
          <video ref={ref} autoPlay playsInline muted className={isMe && !p.screen ? "mirror" : ""} />
        ) : (
          <div className="spotlight-avatar">
            <LetterAvatar name={p.name} size={120} />
          </div>
        )}
        <div className="spotlight-name">
          {p.name}
          {p.screen ? " · sharing screen" : ""}
        </div>
        <button type="button" className="btn btn-ghost spotlight-close" onClick={close}>
          Close
        </button>
      </div>
    </div>
  )
}

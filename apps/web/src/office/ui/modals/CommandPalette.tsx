"use client"
import { CalendarPlus, DoorOpen, MapPin, MessageCircle, Mic, Search, Settings, Video } from "../common/icons"
import { useEffect, useMemo, useRef, useState } from "react"
import { areas } from "../../game/map"
import { openConversation, toggleCam, toggleMic, walkToArea, walkToPlayer } from "../../session"
import { useOffice } from "../../store"
import { LetterAvatar } from "../avatar/LetterAvatar"

interface Item {
  id: string
  group: string
  label: string
  hint?: string
  icon: React.ReactNode
  run: () => void
}

export function CommandPalette() {
  const office = useOffice()
  const [q, setQ] = useState("")
  const [index, setIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.code === "KeyK") {
        e.preventDefault()
        office.paletteOpen = !office.paletteOpen
        office.emit()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [office])

  useEffect(() => {
    if (office.paletteOpen) {
      setQ("")
      setIndex(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [office.paletteOpen])

  const close = () => {
    office.paletteOpen = false
    office.emit()
  }

  const items = useMemo<Item[]>(() => {
    const people: Item[] = [...office.players.values()]
      .filter((p) => p.id !== office.meId)
      .flatMap((p) => [
        { id: `walk-${p.id}`, group: "People", label: p.name, hint: "Walk to", icon: <LetterAvatar name={p.name} size={22} status={p.status} />, run: () => walkToPlayer(p.id) },
        { id: `dm-${p.id}`, group: "People", label: `Message ${p.name}`, icon: <MessageCircle size={16} />, run: () => openConversation(p.id) },
      ])
    const places: Item[] = areas.map((a) => ({
      id: `area-${a.name}`, group: "Places", label: a.name, hint: a.meeting ? "Meeting room" : a.private ? "Private" : "Go",
      icon: a.meeting ? <DoorOpen size={16} /> : <MapPin size={16} />, run: () => walkToArea(a.name),
    }))
    const actions: Item[] = [
      { id: "mic", group: "Actions", label: "Toggle microphone", hint: "Ctrl+Shift+A", icon: <Mic size={16} />, run: () => void toggleMic() },
      { id: "cam", group: "Actions", label: "Toggle camera", hint: "Ctrl+Shift+V", icon: <Video size={16} />, run: () => void toggleCam() },
      { id: "meet", group: "Actions", label: "Schedule a meeting", icon: <CalendarPlus size={16} />, run: () => office.openSidebar("calendar") },
      { id: "settings", group: "Actions", label: "Open settings", icon: <Settings size={16} />, run: () => { office.settingsOpen = true; office.emit() } },
    ]
    const all = [...people, ...places, ...actions]
    const needle = q.trim().toLowerCase()
    return needle ? all.filter((i) => i.label.toLowerCase().includes(needle)) : all
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, office.players.size, office.getVersion()])

  if (!office.paletteOpen) return null

  const run = (i: Item | undefined) => {
    if (!i) return
    close()
    i.run()
  }

  let lastGroup = ""
  return (
    <div className="modal-backdrop top" onClick={close}>
      <div className="palette" role="dialog" aria-label="Search" onClick={(e) => e.stopPropagation()}>
        <label className="palette-input">
          <Search size={18} />
          <input
            ref={inputRef}
            value={q}
            placeholder="Search people, places and actions"
            onChange={(e) => { setQ(e.target.value); setIndex(0) }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setIndex((i) => Math.min(items.length - 1, i + 1)) }
              else if (e.key === "ArrowUp") { e.preventDefault(); setIndex((i) => Math.max(0, i - 1)) }
              else if (e.key === "Enter") run(items[index])
              else if (e.key === "Escape") close()
            }}
          />
          <kbd>Esc</kbd>
        </label>
        <ul className="palette-list" role="listbox">
          {items.length === 0 && <li className="empty">No results</li>}
          {items.map((it, i) => {
            const header = it.group !== lastGroup ? it.group : null
            lastGroup = it.group
            return (
              <li key={it.id}>
                {header && <div className="palette-group">{header}</div>}
                <button
                  role="option"
                  aria-selected={i === index}
                  className={`palette-item ${i === index ? "is-active" : ""}`}
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => run(it)}
                >
                  <span className="palette-icon">{it.icon}</span>
                  <span className="palette-label">{it.label}</span>
                  {it.hint && <span className="palette-hint">{it.hint}</span>}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

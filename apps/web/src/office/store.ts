"use client"
// Mutable office state read by the renderer every frame; React subscribes via a version counter.
import { useSyncExternalStore } from "react"
import type { Channel, ChatMsg, Dir, Meeting, PlayerState } from "@/shared/protocol"
import type { Floor, Obj } from "./game/map"

export interface Avatar extends PlayerState {
  /** Rendered position in tiles (interpolated). */
  rx: number
  ry: number
  fromX: number
  fromY: number
  stepStart: number
  stepFrame: number
  reaction: { emoji: string; at: number } | null
}

export type SidebarView = "people" | "chat" | "calendar" | "notifications"
/** "#channel" | "nearby" | a player id for direct messages */
export type Conversation = string

interface Preferences {
  speechBubbles: boolean
  nameLabels: boolean
  unreadBadges: boolean
}

export interface Toast {
  id: number
  text: string
  action?: { label: string; run: () => void }
}

export interface Notice {
  id: number
  text: string
  ts: number
  icon: "wave" | "join" | "leave" | "meeting" | "chat"
  read: boolean
  action?: { label: string; run: () => void }
}

export const STEP_MS = 140

export type BuildTool = "object" | "floor" | "erase" | "room"

export interface BuildState {
  open: boolean
  tool: BuildTool
  obj: Obj
  floor: Floor
  room: { name: string; floor: Floor; private: boolean; meeting: boolean }
  /** Hovered tile, for the panel's coordinate readout. */
  hover: [number, number] | null
}

class OfficeStore {
  meId: string | null = null
  players = new Map<string, Avatar>()
  chat: ChatMsg[] = []
  meetings: Meeting[] = []
  channels: Channel[] = []
  /** Unsent composer text per conversation. */
  drafts: Record<string, string> = {}
  nearby = new Set<string>()
  areaName: string | null = null
  connected = false

  // Layout
  sidebar: SidebarView = "people"
  sidebarOpen = true
  conversation: Conversation = "#general"
  selected: string | null = null
  paletteOpen = false
  settingsOpen = false
  preferences: Preferences = { speechBubbles: true, nameLabels: true, unreadBadges: true }
  minimap = true
  /** Stage layout: the map, or a grid of the people you're talking to. */
  stageView: "map" | "grid" = "map"
  dockCollapsed = false

  // Camera
  zoom = 1
  recenter = false
  view = { x: 0, y: 0, w: 0, h: 0 }
  hoverTile: { tx: number; ty: number; areaName: string | null } | null = null

  // Feedback
  toasts: Toast[] = []
  notices: Notice[] = []
  /** Unread counts per conversation id. */
  unread: Record<string, number> = {}

  // Media
  spotlight: string | null = null
  streams = new Map<string, MediaStream>()
  localStream: MediaStream | null = null
  screenStream: MediaStream | null = null
  devices = { audioIn: "", videoIn: "", audioOut: "" }

  // Build mode
  build: BuildState = {
    open: false,
    tool: "object",
    obj: "plant",
    floor: "wood",
    room: { name: "", floor: "carpet", private: false, meeting: false },
    hover: null,
  }
  undoDepth = 0
  redoDepth = 0

  // Meeting layout
  inMeeting = false
  meetingMinimized = false
  meetingSince = 0

  private version = 0
  private listeners = new Set<() => void>()

  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }
  getVersion = () => this.version
  emit() {
    this.version++
    for (const l of this.listeners) l()
  }

  get me(): Avatar | null {
    return this.meId ? this.players.get(this.meId) ?? null : null
  }

  get meetingViewOpen() {
    return this.sidebar !== "chat" && ((this.inMeeting && !this.meetingMinimized) || this.stageView === "grid")
  }

  get unreadTotal() {
    return Object.values(this.unread).reduce((a, b) => a + b, 0)
  }
  get unreadNotices() {
    return this.notices.filter((n) => !n.read).length
  }

  upsert(p: PlayerState) {
    const existing = this.players.get(p.id)
    if (existing) {
      Object.assign(existing, p)
      return existing
    }
    const a: Avatar = {
      ...p,
      hand: p.hand ?? false,
      lockedWith: p.lockedWith ?? [],
      rx: p.x,
      ry: p.y,
      fromX: p.x,
      fromY: p.y,
      stepStart: 0,
      stepFrame: 0,
      reaction: null,
    }
    this.players.set(p.id, a)
    return a
  }

  /** Starts a one-tile step animation toward (x,y). */
  stepTo(a: Avatar, x: number, y: number, dir: Dir, now: number) {
    const far = Math.abs(a.x - x) + Math.abs(a.y - y) > 1
    a.fromX = far ? x : a.rx
    a.fromY = far ? y : a.ry
    a.x = x
    a.y = y
    a.dir = dir
    a.stepStart = now
    a.stepFrame ^= 1
  }

  setHoverTile(tx: number | null, ty: number | null, areaName?: string | null) {
    if (tx === null || ty === null) {
      if (this.hoverTile !== null) {
        this.hoverTile = null
        this.emit()
      }
      return
    }
    if (this.hoverTile && this.hoverTile.tx === tx && this.hoverTile.ty === ty && this.hoverTile.areaName === (areaName ?? null)) {
      return
    }
    this.hoverTile = { tx, ty, areaName: areaName ?? null }
    this.emit()
  }

  setZoom(z: number) {
    this.zoom = Math.min(2.5, Math.max(0.4, Math.round(z * 4) / 4))
    this.emit()
  }

  loadPreferences() {
    try {
      const saved = JSON.parse(localStorage.getItem("oppera-preferences") ?? "{}")
      if (!saved || typeof saved !== "object") return
      for (const key of Object.keys(this.preferences) as (keyof Preferences)[]) {
        if (typeof saved[key] === "boolean") this.preferences[key] = saved[key]
      }
      this.emit()
    } catch { /* Keep defaults if local preferences cannot be read. */ }
  }

  setPreference(key: keyof Preferences, value: boolean) {
    this.preferences = { ...this.preferences, [key]: value }
    try { localStorage.setItem("oppera-preferences", JSON.stringify(this.preferences)) } catch { /* Apply in this session even when storage is unavailable. */ }
    this.emit()
  }

  toast(text: string, action?: Toast["action"]) {
    const t = { id: Date.now() + Math.random(), text, action }
    this.toasts = [...this.toasts.slice(-2), t]
    this.emit()
    setTimeout(() => {
      this.toasts = this.toasts.filter((x) => x.id !== t.id)
      this.emit()
    }, action ? 8000 : 3500)
  }

  notify(text: string, icon: Notice["icon"], action?: Notice["action"]) {
    this.notices = [{ id: Date.now() + Math.random(), text, ts: Date.now(), icon, read: false, action }, ...this.notices].slice(0, 100)
    this.emit()
  }

  openSidebar(view: SidebarView) {
    if (this.sidebarOpen && this.sidebar === view) this.sidebarOpen = false
    else {
      this.sidebar = view
      this.sidebarOpen = true
    }
    this.emit()
  }

  reset() {
    this.meId = null
    this.players.clear()
    this.chat = []
    this.meetings = []
    this.channels = []
    this.drafts = {}
    this.nearby = new Set()
    this.areaName = null
    this.conversation = "#general"
    this.stageView = "map"
    this.selected = null
    this.unread = {}
    this.notices = []
    this.toasts = []
    this.streams.clear()
    this.spotlight = null
    this.inMeeting = false
    this.meetingMinimized = false
    this.connected = false
    this.build = { ...this.build, open: false, hover: null }
    this.undoDepth = 0
    this.redoDepth = 0
    this.emit()
  }
}

export const store = new OfficeStore()

export function useOffice() {
  useSyncExternalStore(store.subscribe, store.getVersion, store.getVersion)
  return store
}

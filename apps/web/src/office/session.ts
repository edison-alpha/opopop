"use client"
// Glue between the socket, WebRTC and the store, plus every user action in the office.
import type { AvatarLook, ChatScope, Dir, MapOp, NewMeeting, PlayerPatch, ServerMsg, Status } from "@/shared/protocol"
import {
  MAP_H, MAP_W, applyOps, areaAt, areaCenter, areas, findPath, inverseOf, isBlocked, walkableNeighbor,
} from "./game/map"
import { Rtc } from "./net/rtc"
import { Socket } from "./net/socket"
import { STEP_MS, store, type Avatar } from "./store"

/** Open-space conversation radius in tiles (Chebyshev distance). */
export const PROXIMITY = 3

let socket: Socket | null = null
let rtc: Rtc | null = null
let path: [number, number][] = []
let lastStepAt = 0
let reminderTimer: ReturnType<typeof setInterval> | null = null
// Build-mode history: each entry is the list of ops that reverses one edit.
let undoStack: MapOp[][] = []
let redoStack: MapOp[][] = []
const HISTORY = 100
const reminded = new Set<string>()

export const convOf = (scope: ChatScope, from: string, to?: string, channel?: string) =>
  scope === "dm" ? (from === store.meId ? to! : from) : scope === "channel" ? `#${channel}` : "nearby"

function onServer(msg: ServerMsg) {
  const now = performance.now()
  switch (msg.t) {
    case "welcome":
      store.meId = msg.id
      for (const p of msg.players) store.upsert(p)
      store.chat = msg.history
      store.meetings = msg.meetings ?? []
      store.channels = msg.channels ?? []
      // The shared office = default map + everyone's build-mode edits.
      applyOps([{ k: "reset" }, ...(msg.mapOps ?? [])])
      undoStack = []
      redoStack = []
      pushPatch({ mic: isTrackOn("audio"), cam: isTrackOn("video") })
      break
    case "map:edit":
      applyOps(msg.ops)
      break
    case "joined":
      store.upsert(msg.player)
      store.notify(`${msg.player.name} joined the office`, "join")
      break
    case "left": {
      const p = store.players.get(msg.id)
      store.players.delete(msg.id)
      rtc?.close(msg.id, false)
      if (p) store.notify(`${p.name} left the office`, "leave")
      break
    }
    case "moved": {
      const p = store.players.get(msg.id)
      if (p) store.stepTo(p, msg.x, msg.y, msg.dir, now)
      break
    }
    case "updated": {
      const p = store.players.get(msg.id)
      if (p) Object.assign(p, msg.patch)
      break
    }
    case "chat": {
      const m = msg.msg
      store.chat = [...store.chat, m]
      const conv = convOf(m.scope, m.from, m.to, m.channel)
      const viewing = store.sidebar === "chat" && store.conversation === conv
      if (m.from !== store.meId && !viewing && !m.system) {
        store.unread = { ...store.unread, [conv]: (store.unread[conv] ?? 0) + 1 }
        if (m.scope === "dm") {
          store.notify(`${m.fromName}: ${m.text}`, "chat", { label: "Reply", run: () => openConversation(m.from) })
          store.toast(`💬 ${m.fromName}: ${m.text.slice(0, 60)}`, { label: "Reply", run: () => openConversation(m.from) })
        }
      }
      break
    }
    case "react": {
      const p = store.players.get(msg.id)
      if (p) p.reaction = { emoji: msg.emoji, at: now }
      break
    }
    case "signal":
      void rtc?.handle(msg.from, msg.data as never)
      break
    case "wave": {
      const p = store.players.get(msg.from)
      if (p) {
        const action = { label: "Wave back", run: () => wave(p.id) }
        store.toast(`👋 ${p.name} waved at you`, action)
        store.notify(`${p.name} waved at you`, "wave", action)
      }
      break
    }
    case "meetings":
      store.meetings = msg.meetings
      break
    case "channels":
      store.channels = msg.channels
      break
  }
  store.emit()
}

function isTrackOn(kind: "audio" | "video") {
  const t = kind === "audio" ? store.localStream?.getAudioTracks()[0] : store.localStream?.getVideoTracks()[0]
  return !!t && t.enabled && t.readyState === "live"
}

function pushPatch(patch: PlayerPatch) {
  const me = store.me
  if (me) Object.assign(me, patch)
  socket?.send({ t: "update", patch })
  store.emit()
}

/** Raises a reminder when a meeting is about to start (1 min) or starts. */
function checkReminders() {
  const now = Date.now()
  for (const m of store.meetings) {
    const key = m.id
    if (reminded.has(key)) continue
    if (m.start - now <= 60_000 && now < m.start + m.durationMin * 60_000) {
      reminded.add(key)
      const join = { label: "Join", run: () => joinMeeting(m.room) }
      const when = m.start > now ? "starts in 1 minute" : "is happening now"
      store.toast(`📅 ${m.title} ${when} · ${m.room}`, join)
      store.notify(`${m.title} ${when} in ${m.room}`, "meeting", join)
    }
  }
}

export function joinOffice(name: string, look: AvatarLook, spawn: { x: number; y: number }, role = "") {
  store.reset()
  socket = new Socket(onServer, (open) => {
    store.connected = open
    if (!open && !socket?.isUserClosed) store.toast("Connection lost. Reload to rejoin.")
    store.emit()
  })
  rtc = new Rtc((to, data) => socket?.send({ t: "signal", to, data }))
  socket.connect()
  // Spread arrivals around the spawn point so avatars don't stack.
  let sx = spawn.x
  let sy = spawn.y
  for (let i = 0; i < 20; i++) {
    const x = spawn.x + Math.floor(Math.random() * 7) - 3
    const y = spawn.y + Math.floor(Math.random() * 3) - 1
    if (!isBlocked(x, y)) {
      sx = x
      sy = y
      break
    }
  }
  socket.send({ t: "join", name, role, look, x: sx, y: sy })
  reminded.clear()
  reminderTimer = setInterval(checkReminders, 5000)
}

export function leaveOffice() {
  rtc?.closeAll()
  socket?.close()
  stopScreenShare(false)
  for (const t of store.localStream?.getTracks() ?? []) t.stop()
  store.localStream = null
  if (reminderTimer) clearInterval(reminderTimer)
  reminderTimer = null
  socket = null
  rtc = null
  path = []
  undoStack = []
  redoStack = []
  store.reset()
}

// ───── Movement ─────

const DIRS: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }

/** Tries one step; returns true if the avatar moved. */
export function tryStep(dir: Dir): boolean {
  const me = store.me
  if (!me) return false
  const now = performance.now()
  if (now - lastStepAt < STEP_MS) return false
  const [dx, dy] = DIRS[dir]
  const nx = me.x + dx
  const ny = me.y + dy
  lastStepAt = now
  // Avatars may pass through each other, so only the map blocks movement.
  if (isBlocked(nx, ny)) {
    if (me.dir !== dir) {
      me.dir = dir
      socket?.send({ t: "move", x: me.x, y: me.y, dir })
    }
    return false
  }
  store.stepTo(me, nx, ny, dir, now)
  socket?.send({ t: "move", x: nx, y: ny, dir })
  return true
}

export function cancelPath() {
  path = []
}

export function walkTo(tx: number, ty: number) {
  const me = store.me
  if (!me || tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return
  path = findPath(me.x, me.y, tx, ty) ?? []
}

export function walkToPlayer(id: string) {
  const other = store.players.get(id)
  if (!other) return
  const n = walkableNeighbor(other.x, other.y)
  if (n) walkTo(n[0], n[1])
}

export function walkToArea(name: string) {
  const a = areas.find((x) => x.name === name)
  const c = a && areaCenter(a)
  if (c) walkTo(c[0], c[1])
}

/** Called every frame by the renderer; advances click-to-move paths. */
export function advancePath() {
  const me = store.me
  if (!me || path.length === 0) return
  const [nx, ny] = path[0]
  const dir: Dir = nx > me.x ? "right" : nx < me.x ? "left" : ny > me.y ? "down" : "up"
  if (performance.now() - lastStepAt < STEP_MS) return
  if (tryStep(dir)) path.shift()
  else path = []
}

// ───── Proximity ─────

export function computeNearby(): Set<string> {
  const me = store.me
  const out = new Set<string>()
  if (!me) return out
  const myArea = areaAt(me.x, me.y)
  for (const p of store.players.values()) {
    if (p.id === me.id) continue
    if (canTalk(me, p, myArea)) out.add(p.id)
  }
  return out
}

/** Whether two players are connected by proximity, private areas, busy status and locks. */
function canTalk(a: Avatar, b: Avatar, aArea = areaAt(a.x, a.y)): boolean {
  if (a.status === "busy" || b.status === "busy") return false
  if (a.lockedWith.length && !a.lockedWith.includes(b.id)) return false
  if (b.lockedWith.length && !b.lockedWith.includes(a.id)) return false
  const bArea = areaAt(b.x, b.y)
  if (aArea?.private || bArea?.private) return !!aArea && aArea === bArea
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) <= PROXIMITY
}

/** Groups of 2+ people currently talking to each other (connected components). */
export function conversationGroups(): Avatar[][] {
  const list = [...store.players.values()]
  const seen = new Set<string>()
  const groups: Avatar[][] = []
  for (const start of list) {
    if (seen.has(start.id)) continue
    const group: Avatar[] = []
    const queue = [start]
    seen.add(start.id)
    while (queue.length) {
      const cur = queue.shift()!
      group.push(cur)
      for (const other of list) {
        if (!seen.has(other.id) && canTalk(cur, other)) {
          seen.add(other.id)
          queue.push(other)
        }
      }
    }
    if (group.length > 1) groups.push(group)
  }
  return groups
}

export function updateProximity() {
  const me = store.me
  if (!me) return
  const next = computeNearby()
  const area = areaAt(me.x, me.y)
  const areaName = area?.name ?? null
  const changed =
    next.size !== store.nearby.size || [...next].some((id) => !store.nearby.has(id)) || areaName !== store.areaName
  rtc?.sync(next)
  if (areaName !== store.areaName) {
    store.inMeeting = !!area?.meeting
    // Start collapsed in the top video bar; the full meeting view opens only on request.
    store.meetingMinimized = true
    store.meetingSince = Date.now()
  }
  if (changed) {
    store.nearby = next
    store.areaName = areaName
    store.emit()
  }
}

/** 0..1 audio volume for a peer based on distance (private areas are always full volume). */
export function volumeFor(id: string): number {
  const me = store.me
  const p = store.players.get(id)
  if (!me || !p) return 1
  if (areaAt(me.x, me.y)?.private) return 1
  const d = Math.hypot(p.x - me.x, p.y - me.y)
  return Math.max(0.15, Math.min(1, 1.25 - d / (PROXIMITY + 1)))
}

// ───── Media ─────

export async function toggleMic() {
  const t = store.localStream?.getAudioTracks()[0]
  if (!t || t.readyState !== "live") {
    await acquire("audio")
    return
  }
  t.enabled = !t.enabled
  pushPatch({ mic: t.enabled })
  store.toast(t.enabled ? "Microphone on" : "Microphone muted")
}

export async function toggleCam() {
  const t = store.localStream?.getVideoTracks()[0]
  if (!t || t.readyState !== "live") {
    await acquire("video")
    return
  }
  // Fully stop the camera when turning it off so the device light goes out.
  t.stop()
  store.localStream?.removeTrack(t)
  pushPatch({ cam: false })
  await rtc?.refreshTracks()
}

/** Turns mic, camera and screen share off in one go. */
export async function allMediaOff() {
  const a = store.localStream?.getAudioTracks()[0]
  if (a) a.enabled = false
  const v = store.localStream?.getVideoTracks()[0]
  if (v) {
    v.stop()
    store.localStream?.removeTrack(v)
  }
  stopScreenShare(false)
  pushPatch({ mic: false, cam: false, screen: false })
  await rtc?.refreshTracks()
  store.toast("Mic, camera, and screen share turned off")
}

async function acquire(kind: "audio" | "video") {
  try {
    const s = await navigator.mediaDevices.getUserMedia(
      kind === "audio"
        ? { audio: { echoCancellation: true, noiseSuppression: true, deviceId: store.devices.audioIn || undefined } }
        : { video: { width: 640, height: 360, deviceId: store.devices.videoIn || undefined } },
    )
    if (!store.localStream) store.localStream = new MediaStream()
    for (const old of kind === "audio" ? store.localStream.getAudioTracks() : store.localStream.getVideoTracks()) {
      old.stop()
      store.localStream.removeTrack(old)
    }
    for (const t of s.getTracks()) store.localStream.addTrack(t)
    pushPatch({ mic: isTrackOn("audio"), cam: isTrackOn("video") })
    await rtc?.refreshTracks()
  } catch {
    store.toast(kind === "video" ? "Camera permission was denied" : "Microphone permission was denied")
  }
}

export async function listDevices() {
  try {
    const all = await navigator.mediaDevices.enumerateDevices()
    return {
      audioIn: all.filter((d) => d.kind === "audioinput"),
      videoIn: all.filter((d) => d.kind === "videoinput"),
      audioOut: all.filter((d) => d.kind === "audiooutput"),
    }
  } catch {
    return { audioIn: [], videoIn: [], audioOut: [] }
  }
}

/** Switches an input/output device; live inputs are re-acquired on the new device. */
export async function setDevice(kind: "audioIn" | "videoIn" | "audioOut", deviceId: string) {
  store.devices = { ...store.devices, [kind]: deviceId }
  store.emit()
  if (kind === "audioIn" && store.localStream?.getAudioTracks()[0]) {
    const wasOn = isTrackOn("audio")
    await acquire("audio")
    const t = store.localStream?.getAudioTracks()[0]
    if (t && !wasOn) {
      t.enabled = false
      pushPatch({ mic: false })
    }
  } else if (kind === "videoIn" && isTrackOn("video")) {
    await acquire("video")
  }
}

export async function startScreenShare() {
  try {
    const s = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
    store.screenStream = s
    s.getVideoTracks()[0].addEventListener("ended", () => stopScreenShare(true))
    pushPatch({ screen: true })
    await rtc?.refreshTracks()
  } catch {
    // user cancelled the picker
  }
}

export function stopScreenShare(notify = true) {
  if (!store.screenStream) return
  for (const t of store.screenStream.getTracks()) t.stop()
  store.screenStream = null
  if (notify) pushPatch({ screen: false })
  void rtc?.refreshTracks()
}

// ───── Chat ─────

export function openConversation(conv: string) {
  store.sidebar = "chat"
  store.sidebarOpen = true
  store.conversation = conv
  if (store.unread[conv]) store.unread = { ...store.unread, [conv]: 0 }
  store.emit()
}

export function sendChat(text: string, conv: string, image?: string) {
  if (conv.startsWith("#")) socket?.send({ t: "chat", text, image, scope: "channel", channel: conv.slice(1) })
  else if (conv === "nearby") socket?.send({ t: "chat", text, image, scope: "nearby", recipients: [...store.nearby] })
  else socket?.send({ t: "chat", text, image, scope: "dm", to: conv })
  if (store.drafts[conv]) {
    const { [conv]: _, ...rest } = store.drafts
    store.drafts = rest
  }
}

export function messagesFor(conv: string) {
  return store.chat.filter((m) => convOf(m.scope, m.from, m.to, m.channel) === conv)
}

export function createChannel(name: string, topic: string) {
  socket?.send({ t: "channel:create", name, topic })
}

export function conversationTitle(conv: string) {
  if (conv.startsWith("#")) return conv.slice(1)
  if (conv === "nearby") return "Nearby"
  return store.players.get(conv)?.name ?? messagesFor(conv).find((m) => m.from === conv)?.fromName ?? "Guest"
}

// ───── Social ─────

export function react(emoji: string) {
  const me = store.me
  if (me) me.reaction = { emoji, at: performance.now() }
  socket?.send({ t: "react", emoji })
  store.emit()
}

export function wave(id: string) {
  socket?.send({ t: "wave", to: id })
  const p = store.players.get(id)
  if (p) store.toast(`You waved at ${p.name}`)
}

export function setStatus(status: Status) {
  pushPatch({ status })
}

export function toggleHand() {
  const me = store.me
  if (!me) return
  pushPatch({ hand: !me.hand })
  if (!me.hand) return
  react("✋")
}

export function toggleAway() {
  const me = store.me
  if (!me) return
  const away = me.status !== "away"
  pushPatch({ status: away ? "away" : "available" })
  store.toast(away ? "You're shown as away" : "Welcome back")
}

/** Locks the current conversation so nobody else can join it. */
export function toggleLock() {
  const me = store.me
  if (!me) return
  if (me.lockedWith.length) {
    pushPatch({ lockedWith: [] })
    store.toast("Conversation unlocked")
  } else {
    if (store.nearby.size === 0) {
      store.toast("Start a conversation first, then lock it")
      return
    }
    pushPatch({ lockedWith: [...store.nearby] })
    store.toast("Conversation locked. Others can't join.")
  }
}
export function setStatusText(statusText: string) {
  pushPatch({ statusText })
}
export function setName(name: string) {
  pushPatch({ name })
}

export function setRole(role: string) {
  pushPatch({ role: role.trim().slice(0, 48) })
}
export function setLook(look: AvatarLook) {
  pushPatch({ look })
}

// ───── Build mode ─────

/** Applies ops locally, shares them with everyone, and returns the ops that undo them. */
function commit(ops: MapOp[]): MapOp[] {
  const inverse: MapOp[] = []
  for (const op of ops) {
    const inv = inverseOf(op)
    if (inv) inverse.unshift(inv)
    applyOps([op])
  }
  socket?.send({ t: "map:edit", ops })
  return inverse
}

/**
 * One undoable build edit (a click, a room...). No-ops are dropped.
 * `merge` folds it into the previous undo step (used while drag-painting).
 */
export function editMap(ops: MapOp[], merge = false) {
  const changed = ops.filter((op) => {
    const inv = inverseOf(op)
    return !inv || JSON.stringify(inv) !== JSON.stringify(op)
  })
  if (!changed.length) return
  const inverse = commit(changed)
  if (merge && undoStack.length) undoStack[undoStack.length - 1] = [...inverse, ...undoStack[undoStack.length - 1]]
  else undoStack.push(inverse)
  if (undoStack.length > HISTORY) undoStack.shift()
  redoStack = []
  syncHistory()
}

export function undoEdit() {
  const ops = undoStack.pop()
  if (!ops) return
  redoStack.push(commit(ops))
  syncHistory()
}

export function redoEdit() {
  const ops = redoStack.pop()
  if (!ops) return
  undoStack.push(commit(ops))
  syncHistory()
}

/** Restores the default office for everyone. */
export function resetOfficeMap() {
  applyOps([{ k: "reset" }])
  socket?.send({ t: "map:edit", ops: [{ k: "reset" }] })
  undoStack = []
  redoStack = []
  syncHistory()
  store.toast("Office map reset to the default layout")
}

function syncHistory() {
  store.undoDepth = undoStack.length
  store.redoDepth = redoStack.length
  store.emit()
}

// ───── Meetings ─────

export function createMeeting(m: NewMeeting) {
  socket?.send({ t: "meeting:create", meeting: m })
  store.toast(`Meeting “${m.title}” scheduled`)
}

export function deleteMeeting(id: string) {
  socket?.send({ t: "meeting:delete", id })
}

export function joinMeeting(room: string) {
  walkToArea(room)
  store.toast(`Walking to ${room}…`)
}

export async function copyInviteLink() {
  const url = `${location.origin}/app`
  try {
    await navigator.clipboard.writeText(url)
    store.toast("Invite link copied to clipboard")
  } catch {
    store.toast(`Share this link: ${url}`)
  }
}

// Dev-only hook used by the end-to-end browser tests.
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  ;(window as unknown as { __oppera: unknown }).__oppera = {
    store, walkTo, walkToArea, sendChat, react, startScreenShare, createMeeting,
  }
}

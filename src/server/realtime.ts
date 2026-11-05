import { randomUUID } from "node:crypto"
import { WebSocket, type WebSocketServer } from "ws"

import type { Channel, ChatMsg, ClientMsg, MapOp, Meeting, PlayerState, ServerMsg } from "../shared/protocol"
import { MapState, cleanOp } from "./mapState"

const MAX_OPS_PER_EDIT = 5000

const HISTORY_PER_CHANNEL = 300
const MAX_TEXT = 4000
const MAX_IMAGE = 600_000
const MAX_MEETINGS = 200
const MAX_CHANNELS = 50

const clampStr = (s: unknown, n: number) => String(s ?? "").slice(0, n)
const channelName = (s: unknown) =>
  clampStr(s, 40)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")

export function attachRealtime(wss: WebSocketServer) {
  const players = new Map<string, PlayerState>()
  const sockets = new Map<string, WebSocket>()
  const channels: Channel[] = [
    { name: "general", topic: "Share company-wide updates, wins, announcements" },
    { name: "social", topic: "Hang out, share photos, and get to know each other" },
  ]
  const history = new Map<string, ChatMsg[]>(channels.map((c) => [c.name, []]))
  let meetings: Meeting[] = []
  const map = new MapState()

  const send = (ws: WebSocket | undefined, msg: ServerMsg) => {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg))
  }
  const broadcast = (msg: ServerMsg, except?: string) => {
    const data = JSON.stringify(msg)
    for (const [id, ws] of sockets) {
      if (id !== except && ws.readyState === WebSocket.OPEN) ws.send(data)
    }
  }
  const pushHistory = (m: ChatMsg) => {
    const list = history.get(m.channel!) ?? []
    list.push(m)
    if (list.length > HISTORY_PER_CHANNEL) list.shift()
    history.set(m.channel!, list)
  }
  const allHistory = () => [...history.values()].flat().sort((a, b) => a.ts - b.ts)
  /** Meetings that ended more than a day ago are dropped. */
  const pruneMeetings = () => {
    const cutoff = Date.now() - 24 * 3600_000
    meetings = meetings.filter((m) => m.start + m.durationMin * 60_000 > cutoff).sort((a, b) => a.start - b.start)
  }

  wss.on("connection", (ws: WebSocket) => {
    const id = randomUUID().slice(0, 8)
    let joined = false

    ws.on("message", (raw) => {
      let msg: ClientMsg
      try {
        msg = JSON.parse(String(raw))
      } catch {
        return
      }

      if (msg.t === "join") {
        if (joined) return
        joined = true
        const player: PlayerState = {
          id,
          name: clampStr(msg.name, 32).trim() || "Guest",
          look: msg.look,
          x: Math.floor(msg.x),
          y: Math.floor(msg.y),
          dir: "down",
          status: "available",
          statusText: "",
          mic: false,
          cam: false,
          screen: false,
          hand: false,
          lockedWith: [],
        }
        players.set(id, player)
        sockets.set(id, ws)
        pruneMeetings()
        const joinMsg: ChatMsg = {
          id: randomUUID(),
          from: id,
          fromName: player.name,
          text: `${player.name} joined`,
          scope: "channel",
          channel: "general",
          system: true,
          ts: Date.now(),
        }
        pushHistory(joinMsg)
        send(ws, { t: "welcome", id, players: [...players.values()], history: allHistory(), meetings, channels, mapOps: map.snapshot() })
        broadcast({ t: "joined", player }, id)
        broadcast({ t: "chat", msg: joinMsg }, id)
        return
      }

      const me = players.get(id)
      if (!me) return

      switch (msg.t) {
        case "move":
          me.x = Math.floor(msg.x)
          me.y = Math.floor(msg.y)
          me.dir = msg.dir
          broadcast({ t: "moved", id, x: me.x, y: me.y, dir: me.dir }, id)
          break
        case "update": {
          const p = msg.patch
          if (p.name !== undefined) p.name = clampStr(p.name, 32).trim() || me.name
          if (p.statusText !== undefined) p.statusText = clampStr(p.statusText, 80)
          if (p.lockedWith !== undefined) p.lockedWith = (Array.isArray(p.lockedWith) ? p.lockedWith : []).slice(0, 50).map(String)
          Object.assign(me, p)
          broadcast({ t: "updated", id, patch: p }, id)
          break
        }
        case "chat": {
          const text = clampStr(msg.text, MAX_TEXT).trim()
          const image =
            typeof msg.image === "string" && msg.image.startsWith("data:image/") && msg.image.length <= MAX_IMAGE
              ? msg.image
              : undefined
          if (!text && !image) return
          const scope = msg.scope === "nearby" || msg.scope === "dm" ? msg.scope : "channel"
          const chat: ChatMsg = { id: randomUUID(), from: id, fromName: me.name, text, scope, image, ts: Date.now() }
          if (scope === "channel") {
            const name = channelName(msg.channel)
            if (!history.has(name)) return
            chat.channel = name
            pushHistory(chat)
            broadcast({ t: "chat", msg: chat })
          } else if (scope === "dm") {
            if (!msg.to || !players.has(msg.to)) return
            chat.to = msg.to
            send(ws, { t: "chat", msg: chat })
            if (msg.to !== id) send(sockets.get(msg.to), { t: "chat", msg: chat })
          } else {
            for (const target of new Set([id, ...(msg.recipients ?? [])])) {
              send(sockets.get(target), { t: "chat", msg: chat })
            }
          }
          break
        }
        case "channel:create": {
          const name = channelName(msg.name)
          if (!name || history.has(name) || channels.length >= MAX_CHANNELS) return
          channels.push({ name, topic: clampStr(msg.topic, 140) })
          history.set(name, [])
          broadcast({ t: "channels", channels })
          break
        }
        case "react":
          broadcast({ t: "react", id, emoji: clampStr(msg.emoji, 8) })
          break
        case "map:edit": {
          if (!Array.isArray(msg.ops)) return
          const ops = msg.ops.slice(0, MAX_OPS_PER_EDIT).map(cleanOp).filter((o): o is MapOp => o !== null)
          const applied = map.apply(ops)
          if (applied.length) broadcast({ t: "map:edit", ops: applied, by: id }, id)
          break
        }
        case "signal":
          send(sockets.get(msg.to), { t: "signal", from: id, data: msg.data })
          break
        case "wave":
          send(sockets.get(msg.to), { t: "wave", from: id })
          break
        case "meeting:create": {
          const m = msg.meeting
          const start = Number(m.start)
          const durationMin = Math.min(480, Math.max(5, Math.floor(Number(m.durationMin) || 30)))
          const title = clampStr(m.title, 80).trim()
          if (!title || !Number.isFinite(start)) return
          pruneMeetings()
          if (meetings.length >= MAX_MEETINGS) return
          meetings.push({
            id: randomUUID(),
            title,
            room: clampStr(m.room, 40),
            start,
            durationMin,
            description: clampStr(m.description, 500),
            createdBy: id,
            createdByName: me.name,
          })
          pruneMeetings()
          broadcast({ t: "meetings", meetings })
          break
        }
        case "meeting:delete": {
          const before = meetings.length
          meetings = meetings.filter((m) => !(m.id === msg.id && m.createdBy === id))
          if (meetings.length !== before) broadcast({ t: "meetings", meetings })
          break
        }
      }
    })

    ws.on("close", () => {
      if (!joined) return
      players.delete(id)
      sockets.delete(id)
      broadcast({ t: "left", id })
    })
  })
}

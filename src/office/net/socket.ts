"use client"
import type { ClientMsg, ServerMsg } from "@/shared/protocol"

type Handler = (msg: ServerMsg) => void

export class Socket {
  private ws: WebSocket | null = null
  private queue: string[] = []
  private closedByUser = false

  constructor(
    private onMessage: Handler,
    private onStatus: (open: boolean) => void,
  ) {}

  connect() {
    const proto = location.protocol === "https:" ? "wss" : "ws"
    const ws = new WebSocket(`${proto}://${location.host}/ws`)
    this.ws = ws
    ws.onopen = () => {
      this.onStatus(true)
      for (const m of this.queue) ws.send(m)
      this.queue = []
    }
    ws.onmessage = (e) => {
      try {
        this.onMessage(JSON.parse(e.data))
      } catch {
        // ignore malformed frames
      }
    }
    ws.onclose = () => {
      this.onStatus(false)
    }
  }

  send(msg: ClientMsg) {
    const data = JSON.stringify(msg)
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(data)
    else this.queue.push(data)
  }

  get isUserClosed() {
    return this.closedByUser
  }

  close() {
    this.closedByUser = true
    this.ws?.close()
  }
}

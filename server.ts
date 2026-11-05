// Custom server: Next.js pages + the realtime WebSocket hub on /ws in one process.
import { createServer } from "node:http"
import { parse } from "node:url"
import next from "next"
import { WebSocketServer } from "ws"

import { attachRealtime } from "./src/server/realtime"

const dev = process.env.NODE_ENV !== "production"
const port = Number(process.env.PORT ?? 3000)

const app = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = createServer((req, res) => handle(req, res, parse(req.url ?? "/", true)))

  const wss = new WebSocketServer({ noServer: true })
  attachRealtime(wss)

  const nextUpgrade = app.getUpgradeHandler()
  server.on("upgrade", (req, socket, head) => {
    if (req.url?.startsWith("/ws")) {
      wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req))
    } else {
      // Next's HMR socket in dev.
      nextUpgrade(req, socket, head)
    }
  })

  server.listen(port, () => {
    console.log(`> OPPERA ready on http://localhost:${port}`)
  })
})

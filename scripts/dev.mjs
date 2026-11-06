import { spawn } from "node:child_process"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { createServer } from "node:net"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const pnpmEntry = process.env.npm_execpath
if (!pnpmEntry) {
  console.error("Run pnpm dev from the project root.")
  process.exit(1)
}

const children = []
let stopping = false

function terminate(child) {
  if (!child.pid || child.exitCode !== null) return Promise.resolve()
  if (process.platform !== "win32") {
    try { process.kill(-child.pid, "SIGTERM") } catch { child.kill("SIGTERM") }
    return Promise.resolve()
  }
  return new Promise((done) => {
    const killer = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true })
    killer.once("error", () => { child.kill(); done() })
    killer.once("exit", done)
  })
}

async function stop(code = 0) {
  if (stopping) return
  stopping = true
  await Promise.all(children.map(terminate))
  process.exit(code)
}

function start(label, command, args, env = process.env) {
  const child = spawn(command, args, { cwd: root, env, stdio: "inherit", windowsHide: true, detached: process.platform !== "win32" })
  children.push(child)
  child.once("error", (error) => {
    console.error(`${label}: ${error.message}`)
    void stop(1)
  })
  child.once("exit", (code) => {
    if (!stopping) {
      console.error(`${label} stopped. Shutting down the development session.`)
      void stop(code ?? 1)
    }
  })
}

process.once("SIGINT", () => void stop())
process.once("SIGTERM", () => void stop())

function portAvailable(port) {
  return new Promise((resolve, reject) => {
    const probe = createServer()
    probe.once("error", (error) => error.code === "EADDRINUSE" ? resolve(false) : reject(error))
    probe.listen(port, "0.0.0.0", () => probe.close(() => resolve(true)))
  })
}

async function isOppera(port) {
  try {
    const route = port === 3001 ? "/health" : "/src/main.tsx"
    const response = await fetch(`http://127.0.0.1:${port}${route}`, { signal: AbortSignal.timeout(2000) })
    if (!response.ok) return false
    if (port === 3001) return (await response.json()).service === "oppera-clean-server"
    const source = await response.text()
    return source.includes("/src/office/Office.tsx") && source.includes("/src/app/glass.css")
  } catch { return false }
}

async function main() {
  const [webFree, rustFree] = await Promise.all([portAvailable(3000), portAvailable(3001)])
  const [webRunning, rustRunning] = await Promise.all([webFree ? false : isOppera(3000), rustFree ? false : isOppera(3001)])
  for (const [port, free, running] of [[3000, webFree, webRunning], [3001, rustFree, rustRunning]]) {
    if (!free && !running) throw new Error(`Port ${port} is used by another application. Stop that application before running pnpm dev.`)
  }
  if (webRunning && rustRunning) {
    console.log("OPPERA is already running at http://localhost:3000/app (Rust: http://localhost:3001).")
    console.log("Use the existing development session; no duplicate servers were started.")
    return
  }
  console.log("OPPERA: React/Vite http://localhost:3000/app | Rust http://localhost:3001")
  if (rustRunning) console.log("Reusing the existing Rust server on port 3001.")
  else start("Rust", "cargo", ["run", "--locked", "--manifest-path", "apps/server/Cargo.toml"], { ...process.env, PORT: "3001" })
  if (webRunning) console.log("Reusing the existing Vite server on port 3000.")
  else if (/\.exe$/i.test(pnpmEntry)) start("Vite", pnpmEntry, ["--filter", "web", "dev"])
  else start("Vite", process.execPath, [pnpmEntry, "--filter", "web", "dev"])
}

main().catch((error) => { console.error(error.message); void stop(1) })

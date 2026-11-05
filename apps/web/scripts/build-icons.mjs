// Generates src/office/ui/icon-data.json: the subset of Hugeicons (stroke-rounded,
// via Iconify) used by the app, keyed by the component name the UI imports.
// Run: node scripts/build-icons.mjs
import { readFileSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { getIconData } from "@iconify/utils"

const require = createRequire(import.meta.url)
const set = JSON.parse(readFileSync(require.resolve("@iconify-json/hugeicons/icons.json"), "utf8"))

/** Component name -> candidate Hugeicons names (first existing one wins). */
const MAP = {
  ArrowUpRight: ["arrow-up-right-01"],
  Bell: ["notification-01"],
  BellOff: ["notification-off-01", "notification-off-02"],
  Brush: ["paint-brush-02", "paint-brush-01"],
  CalendarClock: ["time-schedule", "calendar-02"],
  CalendarDays: ["calendar-03", "calendar-01"],
  CalendarPlus: ["calendar-add-01", "calendar-add-02"],
  Check: ["tick-02", "tick-01"],
  ChevronDown: ["arrow-down-01"],
  ChevronUp: ["arrow-up-01"],
  CircleDashed: ["dashed-line-circle", "loading-03"],
  Clock: ["clock-01"],
  Crosshair: ["gps-01", "location-04"],
  DoorOpen: ["door-open", "logout-03"],
  Download: ["download-04", "download-01"],
  Eraser: ["eraser", "eraser-01"],
  Hammer: ["hammer", "wrench-01", "tools"],
  Hand: ["hand", "waving-hand-01"],
  Hash: ["hashtag", "grid"],
  Info: ["information-circle"],
  Layers: ["layers-01"],
  LayoutGrid: ["grid-view", "dashboard-square-01"],
  LayoutPanelTop: ["layout-01", "layout-02"],
  Link2: ["link-01", "link-02"],
  Lock: ["square-lock-02", "lock"],
  LockOpen: ["square-unlock-02", "square-unlock-01"],
  LogIn: ["login-03", "login-01"],
  LogOut: ["logout-03", "logout-01"],
  Map: ["maps", "map-pinpoint-01"],
  MapPin: ["location-01"],
  Maximize: ["full-screen", "maximize-01"],
  Maximize2: ["arrow-expand-01", "maximize-02"],
  MessageCircle: ["bubble-chat", "chatting-01", "message-01"],
  Mic: ["mic-01"],
  MicOff: ["mic-off-01"],
  Minus: ["minus-sign"],
  Monitor: ["computer"],
  MonitorUp: ["monitor-up", "computer-arrow-up"],
  MonitorX: ["screen-share-off", "computer-remove"],
  MoreVertical: ["more-vertical"],
  PanelLeftClose: ["sidebar-left-01", "sidebar-left"],
  PanelLeftOpen: ["sidebar-left", "sidebar-left-01"],
  Pencil: ["pencil-edit-01"],
  PictureInPicture2: ["picture-in-picture-on", "picture-in-picture-exit"],
  Plus: ["plus-sign"],
  Radio: ["record", "radio-01"],
  Redo2: ["redo-03", "redo"],
  RotateCcw: ["rotate-left-01", "rotate-left-02"],
  RotateCw: ["rotate-right-01", "rotate-right-02"],
  Search: ["search-01"],
  Send: ["sent", "sent-02"],
  Settings: ["settings-01", "settings-02"],
  Puzzle: ["puzzle"],
  Zap: ["flash"],
  CreditCard: ["credit-card"],
  Plug: ["plug"],
  Keyboard: ["keyboard"],
  Shuffle: ["shuffle"],
  Smile: ["smile"],
  Sofa: ["sofa-01", "sofa-02"],
  SquarePen: ["pencil-edit-02", "edit-02"],
  Trash2: ["delete-02", "delete-01"],
  Undo2: ["undo-03", "undo"],
  UserPlus: ["user-add-01"],
  Users: ["user-group", "user-multiple"],
  Video: ["video-01"],
  VideoOff: ["video-off"],
  WifiOff: ["wifi-disconnected-01", "wifi-off-01"],
  X: ["cancel-01"],
  // Stage actions + recording
  Globe: ["globe-02", "globe"],
  Music: ["music-note-01", "music-note-03"],
  Record: ["record"],
  StopRecording: ["stop-circle"],
  // Composer
  AtSign: ["at", "mail-at-sign-01"],
  Bold: ["text-bold"],
  Code: ["source-code", "code"],
  Italic: ["text-italic"],
  List: ["left-to-right-list-bullet", "list-view"],
  ListOrdered: ["left-to-right-list-number", "list-setting"],
  Paperclip: ["attachment-01", "attachment"],
  SendHorizontal: ["sent", "sent-02"],
  SquareCode: ["source-code-square", "code-square"],
  Strikethrough: ["text-strikethrough"],
  TextQuote: ["quote-down", "left-to-right-block-quote"],
}

const out = { prefix: "hugeicons", width: set.width ?? 24, height: set.height ?? 24, icons: {} }
const missing = []
for (const [name, candidates] of Object.entries(MAP)) {
  const hit = candidates.find((c) => getIconData(set, c))
  if (!hit) { missing.push(`${name}: ${candidates.join(", ")}`); continue }
  const d = getIconData(set, hit)
  out.icons[name] = { body: d.body, width: d.width ?? out.width, height: d.height ?? out.height, source: `hugeicons:${hit}` }
}
if (missing.length) {
  console.error("No match for:\n  " + missing.join("\n  "))
  process.exitCode = 1
}
const recordSet = JSON.parse(readFileSync(new URL("./record-icon.json", import.meta.url), "utf8").replace(/^\uFEFF/, ""))
out.icons.Record = {
  ...recordSet.icons["record-20-regular"],
  width: recordSet.icons["record-20-regular"].width ?? recordSet.width,
  height: recordSet.icons["record-20-regular"].height ?? recordSet.height,
  source: "fluent:record-20-regular",
}
out.icons.StopRecording = {
  ...recordSet.icons["record-stop-12-filled"],
  width: recordSet.icons["record-stop-12-filled"].width ?? recordSet.width,
  height: recordSet.icons["record-stop-12-filled"].height ?? recordSet.height,
  source: "fluent:record-stop-12-filled",
}
writeFileSync(new URL("../src/office/ui/icon-data.json", import.meta.url), JSON.stringify(out, null, 1))
console.log(`wrote ${Object.keys(out.icons).length} icons`)
for (const [k, v] of Object.entries(out.icons)) console.log(`  ${k.padEnd(18)} ${v.source}`)

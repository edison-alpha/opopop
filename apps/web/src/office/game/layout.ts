// Building-local coordinates transcribed from the POP office reference.
// Map construction, animated doors and claimable desks use the same geometry.
export const OFFICE_ORIGIN = { x: 8, y: 8 }
export const OFFICE_SIZE = { w: 41, h: 35 }

export const PRIVATE_OFFICES = [5, 11, 25, 31].map((x, i) => ({
  id: `focus-booth-${i + 1}`,
  name: `Focus Booth ${i + 1}`,
  x, y: 0, w: 7, h: 9,
  desk: { x: x + 2, y: i === 3 ? 5 : 4 },
  chair: { x: x + 3, y: i === 3 ? 6 : 5 },
  entrance: { x: x + (i === 3 ? 1 : 3), y: 8 },
}))

export const HUDDLE_ROOMS = [
  // Single-row back walls share the focus booths' front wall at y=8.
  // The left booth's side remains one tile inset from the huddle's right side.
  { name: "Coffee Huddle", x: 0, y: 8, w: 7, h: 9, side: "left" },
  { name: "Study Huddle", x: 0, y: 16, w: 7, h: 9, side: "left" },
  { name: "Data Huddle", x: 34, y: 8, w: 7, h: 9, side: "right" },
  { name: "Fishtank Huddle", x: 34, y: 16, w: 7, h: 9, side: "right" },
] as const

export const MEDIA_ROOM = { x: 24, y: 24, w: 14, h: 11 }
export const LOBBY = { x: 6, y: 24, w: 19, h: 11 }
export const COURTYARD = { x: 19, y: 0, w: 6, h: 8 }
export const CENTRAL_COUCHES = { x: 10, y: 12, w: 10, h: 9 }
export const TEAM_AREA = { x: 22, y: 12, w: 10, h: 9 }

export const TEAM_DESKS = [12, 19].flatMap(y => [22, 25, 28].map(x => ({ x, y })))

export interface LayoutDoor {
  id: string
  roomName: string
  x: number
  y: number
  orientation: "horizontal" | "vertical"
  swingDir: "up" | "down" | "left" | "right"
}

export const LAYOUT_DOORS: LayoutDoor[] = [
  ...PRIVATE_OFFICES.map((r, i): LayoutDoor => ({
    id: `focus-${i + 1}`, roomName: r.name,
    x: r.entrance.x, y: r.entrance.y,
    orientation: "horizontal", swingDir: "down",
  })),
  ...HUDDLE_ROOMS.map((r, i): LayoutDoor => ({
    id: `huddle-${i + 1}`, roomName: r.name,
    x: r.side === "left" ? r.x + r.w - 1 : r.x,
    y: r.y + 3,
    orientation: "vertical", swingDir: r.side === "left" ? "right" : "left",
  })),
  { id: "media-room", roomName: "Media Room", x: 24, y: 28, orientation: "vertical", swingDir: "left" },
  { id: "main-entrance", roomName: "Lobby", x: 15, y: 34, orientation: "horizontal", swingDir: "down" },
]

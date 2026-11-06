import { TILE, setDeskNameResolver } from "./map"
import { OFFICE_ORIGIN, PRIVATE_OFFICES, TEAM_DESKS } from "./layout"
export const OX = OFFICE_ORIGIN.x
export const OY = OFFICE_ORIGIN.y

export interface DeskDef {
  id: string
  roomName: string
  displayName: string
  // Koordinat kursi dalam world tile [x, y]
  chairTile: [number, number]
  // Koordinat permukaan meja [x, y]
  deskTiles: [number, number][]
  // Posisi badge pintu [x, y] dalam pixel map
  badgePos: { x: number; y: number }
  // Posisi tombol "Move Desk Here" [x, y] dalam pixel map
  btnPos: { x: number; y: number }
  doorId: string
  // Batas ruangan (room bounds) untuk pencahayaan gelap sekitar
  roomBounds: { x: number; y: number; w: number; h: number }
}

export interface DeskClaim {
  deskId: string
  userId: string
  userName: string
  userInitial: string
  userColor?: string
  claimedAt: number
}

/**
 * Daftar meja kerja private di kantor virtual OPPERA.
 * Focus Booth 1 & 2 adalah kantor pribadi 1 orang dengan pintu ganda dan jendela kaca.
 */
export const OFFICE_DESKS: DeskDef[] = [...PRIVATE_OFFICES.map((r, i): DeskDef => ({
  id: r.id, roomName: r.name, displayName: r.name,
  chairTile: [OX + r.chair.x, OY + r.chair.y],
  deskTiles: Array.from({ length: 3 }, (_, dx): [number, number] => [OX + r.desk.x + dx, OY + r.desk.y]),
  badgePos: { x: (OX + r.entrance.x + 1) * TILE, y: (OY + r.entrance.y) * TILE - 12 },
  btnPos: { x: (OX + r.desk.x + 1.5) * TILE, y: (OY + r.desk.y) * TILE + 4 },
  doorId: "focus-" + (i + 1),
  roomBounds: { x: OX + r.x + 1, y: OY + 1, w: r.w - 2, h: r.h - 2 },
 })), ...TEAM_DESKS.map((r, i): DeskDef => ({
  id: 'team-desk-' + (i + 1), roomName: 'Team desk ' + (i + 1), displayName: 'Team desk ' + (i + 1),
  chairTile: [OX + r.x + 1, OY + r.y + 1],
  deskTiles: Array.from({length:3}, (_, dx): [number,number] => [OX+r.x+dx,OY+r.y]),
  badgePos: {x:(OX+r.x+1.5)*TILE,y:(OY+r.y+2)*TILE},
  btnPos: {x:(OX+r.x+1.5)*TILE,y:(OY+r.y)*TILE+4},
  doorId: '', roomBounds: {x:OX+r.x,y:OY+r.y,w:3,h:3},
}))]

const STORAGE_KEY = "oppera_claimed_desks"
const listeners = new Set<() => void>()

export function loadDeskClaims(): Record<string, DeskClaim> {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, DeskClaim>
  } catch {
    return {}
  }
}

export function saveDeskClaims(claims: Record<string, DeskClaim>) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(claims))
  } catch {
    // Ignore storage quota errors
  }
  for (const fn of listeners) fn()
}

export function getDeskClaim(deskId: string): DeskClaim | null {
  const claims = loadDeskClaims()
  return claims[deskId] ?? null
}

export function getDeskForChair(x: number, y: number): DeskDef | undefined {
  return OFFICE_DESKS.find((d) => d.chairTile[0] === x && d.chairTile[1] === y)
}

export function getDeskForTile(x: number, y: number): DeskDef | undefined {
  return OFFICE_DESKS.find(
    (d) =>
      x >= d.roomBounds.x &&
      x < d.roomBounds.x + d.roomBounds.w &&
      y >= d.roomBounds.y &&
      y < d.roomBounds.y + d.roomBounds.h
  )
}

export function getDeskForRoom(roomName: string): DeskDef | undefined {
  return OFFICE_DESKS.find((d) => d.roomName === roomName)
}

export function subscribeDeskChanges(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// Daftarkan resolver nama ruangan otomatis berdasarkan status klaim meja
setDeskNameResolver((x, y) => {
  const desk = getDeskForTile(x, y)
  if (!desk) return null
  const claim = getDeskClaim(desk.id)
  return claim ? `${claim.userName}'s desk` : null
})

/**
 * Klaim meja untuk pengguna saat ini.
 * Jika pengguna sudah mengklaim meja lain sebelumnya, meja lama otomatis dilepas ("Move Desk Here").
 */
export function claimDesk(deskId: string, user: { id: string; name: string; color?: string }): boolean {
  const desk = OFFICE_DESKS.find((d) => d.id === deskId)
  if (!desk) return false

  const claims = loadDeskClaims()

  const existing = claims[deskId]
  if (existing && existing.userId !== user.id && existing.userName.toLowerCase() !== user.name.toLowerCase()) return false

  // Lepaskan meja lama yang mungkin sudah diklaim pengguna ini sebelumnya
  for (const id of Object.keys(claims)) {
    if (claims[id].userId === user.id || claims[id].userName.toLowerCase() === user.name.toLowerCase()) {
      delete claims[id]
    }
  }

  // Daftarkan meja baru
  claims[deskId] = {
    deskId,
    userId: user.id,
    userName: user.name,
    userInitial: (user.name.trim()[0] || "U").toUpperCase(),
    userColor: user.color || "#6366f1",
    claimedAt: Date.now(),
  }

  saveDeskClaims(claims)
  return true
}

/**
 * Lepas klaim meja (kembali menjadi Unclaimed desk).
 */
export function unclaimDesk(deskId: string) {
  const claims = loadDeskClaims()
  if (claims[deskId]) {
    delete claims[deskId]
    saveDeskClaims(claims)
  }
}


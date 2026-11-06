/**
 * Sistem Meja Kerja Pribadi OPPERA (Claimable Private Desks).
 *
 * Fitur:
 * 1. Meja di ruangan private yang belum diklaim menampilkan badge "Unclaimed desk".
 * 2. Tombol "[ 🪑 Move Desk Here ]" muncul di atas meja saat pemain mendekat.
 * 3. Mengklik tombol akan mengklaim meja untuk pemain dan mengupdate badge menjadi:
 *    "[ (Avatar) {PlayerName}'s desk ]" lengkap dengan inisial avatar & indikator online hijau.
 * 4. Saat pemain duduk di kursi meja klaimnya:
 *    - Otomatis menjadi ruangan private terisolasi (WebRTC audio/video private).
 *    - Pintu ganda ruangan tertutup otomatis.
 *    - Ruangan sekitar (luar ruangan) menjadi gelap pekat (72% dark overlay).
 *    - Chip status di pojok kiri atas menampilkan "[ {PlayerName}'s desk ⧉ ]".
 * 5. Persistent storage via localStorage (tersimpan rapi dan reaktif).
 */
import * as Phaser from "phaser"
import { TILE, setDeskNameResolver } from "./map"
import { store, type Avatar } from "../store"

export const OX = 13
export const OY = 9

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
export const OFFICE_DESKS: DeskDef[] = [
  {
    id: "focus-booth-1",
    roomName: "Focus Booth 1",
    displayName: "Focus Booth 1",
    chairTile: [OX + 6, OY + 1],
    deskTiles: [
      [OX + 5, OY + 2],
      [OX + 6, OY + 2],
      [OX + 7, OY + 2],
    ],
    badgePos: {
      x: (OX + 6.5) * TILE,
      y: (OY + 9) * TILE - 12,
    },
    btnPos: {
      x: (OX + 6.5) * TILE,
      y: (OY + 2) * TILE + 4,
    },
    doorId: "focus-1",
    roomBounds: {
      x: OX + 2,
      y: OY + 1,
      w: 9,
      h: 8,
    },
  },
  {
    id: "focus-booth-2",
    roomName: "Focus Booth 2",
    displayName: "Focus Booth 2",
    chairTile: [OX + 18, OY + 1],
    deskTiles: [
      [OX + 17, OY + 2],
      [OX + 18, OY + 2],
      [OX + 19, OY + 2],
    ],
    badgePos: {
      x: (OX + 18.5) * TILE,
      y: (OY + 9) * TILE - 12,
    },
    btnPos: {
      x: (OX + 18.5) * TILE,
      y: (OY + 2) * TILE + 4,
    },
    doorId: "focus-2",
    roomBounds: {
      x: OX + 14,
      y: OY + 1,
      w: 9,
      h: 8,
    },
  },
  {
    id: "focus-booth-3",
    roomName: "Focus Booth 3",
    displayName: "Focus Booth 3",
    chairTile: [OX + 42, OY + 1],
    deskTiles: [
      [OX + 41, OY + 2],
      [OX + 42, OY + 2],
      [OX + 43, OY + 2],
    ],
    badgePos: {
      x: (OX + 42.5) * TILE,
      y: (OY + 9) * TILE - 12,
    },
    btnPos: {
      x: (OX + 42.5) * TILE,
      y: (OY + 2) * TILE + 4,
    },
    doorId: "focus-3",
    roomBounds: {
      x: OX + 38,
      y: OY + 1,
      w: 9,
      h: 8,
    },
  },
  {
    id: "focus-booth-4",
    roomName: "Focus Booth 4",
    displayName: "Focus Booth 4",
    chairTile: [OX + 54, OY + 1],
    deskTiles: [
      [OX + 53, OY + 2],
      [OX + 54, OY + 2],
      [OX + 55, OY + 2],
    ],
    badgePos: {
      x: (OX + 54.5) * TILE,
      y: (OY + 9) * TILE - 12,
    },
    btnPos: {
      x: (OX + 54.5) * TILE,
      y: (OY + 2) * TILE + 4,
    },
    doorId: "focus-4",
    roomBounds: {
      x: OX + 50,
      y: OY + 1,
      w: 9,
      h: 8,
    },
  },
]

// ── Persistent Desk Storage ──
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
  store.emit()
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
  store.toast(`🪑 Desk claimed! This is now ${user.name}'s private desk.`)
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
    store.toast("🪑 Desk released. It is now an unclaimed desk.")
  }
}

/**
 * Phaser Renderer untuk 1 Unit Meja & Interaksi UI (Doorway Badge + Move Desk Here Button).
 */
export class DeskObject {
  private badgeContainer: Phaser.GameObjects.Container
  private badgeBg: Phaser.GameObjects.Graphics
  private badgeText: Phaser.GameObjects.Text
  private avatarCircle: Phaser.GameObjects.Graphics
  private avatarLetter: Phaser.GameObjects.Text

  private btnContainer: Phaser.GameObjects.Container
  private btnBg: Phaser.GameObjects.Graphics
  private btnText: Phaser.GameObjects.Text
  private btnIcon: Phaser.GameObjects.Graphics

  private currentClaim: DeskClaim | null = null
  private isHovered = false
  public isBtnNearby = false
  private unsub?: () => void

  constructor(
    private scene: Phaser.Scene,
    public def: DeskDef
  ) {
    // 1. Doorway Badge Container
    this.badgeBg = scene.add.graphics()
    this.badgeText = scene.add.text(0, 0, "", {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: "11px",
      fontStyle: "bold",
      color: "#ffffff",
    })
    this.avatarCircle = scene.add.graphics()
    this.avatarLetter = scene.add.text(0, 0, "", {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: "8.5px",
      fontStyle: "bold",
      color: "#ffffff",
    })

    this.badgeContainer = scene.add
      .container(def.badgePos.x, def.badgePos.y, [
        this.badgeBg,
        this.avatarCircle,
        this.avatarLetter,
        this.badgeText,
      ])
      .setDepth(120)
      .setVisible(false)

    // 2. "Move Desk Here" Button Container
    this.btnBg = scene.add.graphics()
    this.btnIcon = scene.add.graphics()
    this.btnText = scene.add.text(0, 0, "Move Desk Here", {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: "12px",
      fontStyle: "bold",
      color: "#111827",
    })

    this.btnContainer = scene.add
      .container(def.btnPos.x, def.btnPos.y, [this.btnBg, this.btnIcon, this.btnText])
      .setDepth(130)
      .setVisible(false)

    // Setup interaktivitas tombol
    this.setupButtonEvents()

    // Setup interaktivitas badge
    this.setupBadgeEvents()

    this.renderBadge()
    this.renderButton()

    this.unsub = subscribeDeskChanges(() => {
      this.renderBadge()
      this.renderButton()
    })
  }

  private setupButtonEvents() {
    const btnW = 142
    const btnH = 30
    this.btnContainer.setSize(btnW, btnH)
    this.btnContainer.setInteractive({ useHandCursor: true })

    this.btnContainer.on("pointerover", () => {
      this.isHovered = true
      this.renderButton()
    })

    this.btnContainer.on("pointerout", () => {
      this.isHovered = false
      this.renderButton()
    })

    this.btnContainer.on("pointerdown", (p: Phaser.Input.Pointer) => {
      p.event?.stopPropagation?.()
    })

    this.btnContainer.on("pointerup", (p: Phaser.Input.Pointer) => {
      p.event?.stopPropagation?.()
      const me = store.me
      if (!me) return

      claimDesk(this.def.id, {
        id: me.id,
        name: me.name,
      })
      this.renderBadge()
      this.renderButton()
    })
  }

  private setupBadgeEvents() {
    this.badgeContainer.setInteractive(
      new Phaser.Geom.Rectangle(-60, -12, 120, 24),
      Phaser.Geom.Rectangle.Contains
    )
    if (this.badgeContainer.input) this.badgeContainer.input.cursor = "pointer"

    this.badgeContainer.on("pointerup", (p: Phaser.Input.Pointer) => {
      p.event?.stopPropagation?.()
      const claim = getDeskClaim(this.def.id)
      const me = store.me
      if (!claim) {
        store.toast("🪑 This desk is unclaimed. Walk near the desk to claim it.")
        return
      }

      if (me && (claim.userId === me.id || claim.userName.toLowerCase() === me.name.toLowerCase())) {
        store.toast(`🪑 ${claim.userName}'s desk (Your claimed desk)`, {
          label: "Release Desk",
          run: () => unclaimDesk(this.def.id),
        })
      } else {
        store.toast(`🪑 Claimed by ${claim.userName}`)
      }
    })
  }

  private renderBadge() {
    const claim = getDeskClaim(this.def.id)
    this.currentClaim = claim
    this.badgeBg.clear()
    this.avatarCircle.clear()

    if (!claim) {
      // ── Unclaimed desk (Sesuai Gambar 1) ──
      this.avatarCircle.setVisible(false)
      this.avatarLetter.setVisible(false)

      this.badgeText.setText("Unclaimed desk").setColor("#ffffff").setPosition(-42, -7)
      const w = 96
      const h = 22

      // Dark background pill
      this.badgeBg.fillStyle(0x0f172a, 0.92).fillRoundedRect(-w / 2, -h / 2, w, h, 6)
      this.badgeBg.lineStyle(1, 0x334155, 0.8).strokeRoundedRect(-w / 2, -h / 2, w, h, 6)
      return
    }

    // ── Claimed desk: [ (Avatar) {Name}'s desk ] (Sesuai Gambar 2 & 3) ──
    const label = `${claim.userName}'s desk`
    this.badgeText.setText(label).setColor("#ffffff")
    const textW = this.badgeText.width
    const totalW = textW + 36
    const h = 24

    // Dark pill background
    this.badgeBg.fillStyle(0x0f172a, 0.94).fillRoundedRect(-totalW / 2, -h / 2, totalW, h, 6)
    this.badgeBg.lineStyle(1, 0x334155, 0.8).strokeRoundedRect(-totalW / 2, -h / 2, totalW, h, 6)

    // Avatar Circle di sebelah kiri
    const circleX = -totalW / 2 + 12
    const circleY = 0
    this.avatarCircle.setVisible(true)
    this.avatarCircle.fillStyle(0x6366f1, 1).fillCircle(circleX, circleY, 8)
    // Lingkaran tepi avatar
    this.avatarCircle.lineStyle(1, 0x818cf8, 1).strokeCircle(circleX, circleY, 8)

    // Indikator status hijau online di pojok kanan bawah avatar
    this.avatarCircle.fillStyle(0x22c55e, 1).fillCircle(circleX + 5, circleY + 5, 2.8)
    this.avatarCircle.lineStyle(1, 0x0f172a, 1).strokeCircle(circleX + 5, circleY + 5, 2.8)

    // Huruf inisial avatar
    this.avatarLetter
      .setVisible(true)
      .setText(claim.userInitial)
      .setPosition(circleX - 3.5, circleY - 5.5)

    // Posisi teks nama meja
    this.badgeText.setPosition(circleX + 11, -7)
  }

  private renderButton() {
    this.btnBg.clear()
    this.btnIcon.clear()

    const w = 142
    const h = 28
    const bgCol = this.isHovered ? 0xf3f4f6 : 0xffffff

    // Bayangan halus di bawah tombol
    this.btnBg.fillStyle(0x000000, 0.18).fillRoundedRect(-w / 2 + 1, -h / 2 + 2, w, h, 8)
    // Latar putih tombol
    this.btnBg.fillStyle(bgCol, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 8)
    // Border halus
    this.btnBg.lineStyle(1.2, 0xd1d5db, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 8)

    // Icon Meja Kerja di sebelah kiri
    const ix = -w / 2 + 14
    const iy = -1
    this.btnIcon.lineStyle(1.5, 0x374151, 1)
    // Permukaan meja
    this.btnIcon.strokeRoundedRect(ix - 7, iy - 6, 14, 4, 1)
    // Kaki meja
    this.btnIcon.lineBetween(ix - 5, iy - 2, ix - 5, iy + 6)
    this.btnIcon.lineBetween(ix + 5, iy - 2, ix + 5, iy + 6)
    // Laci meja
    this.btnIcon.lineBetween(ix, iy - 2, ix + 5, iy - 2)
    this.btnIcon.lineBetween(ix, iy + 2, ix + 5, iy + 2)

    this.btnText.setPosition(ix + 12, -7)
  }

  update(me: Avatar | null) {
    if (!me) {
      this.btnContainer.setVisible(false)
      return
    }

    const claim = getDeskClaim(this.def.id)
    const isMyDesk = claim && (claim.userId === store.meId || claim.userName.toLowerCase() === me.name?.toLowerCase())

    // Jarak pemain ke meja kerja
    const deskTileX = this.def.chairTile[0]
    const deskTileY = this.def.chairTile[1]
    const dist = Math.hypot(me.x - deskTileX, me.y - deskTileY)

    // Tampilkan tombol "Move Desk Here" jika pemain berada dekat meja (<= 3.5 tile)
    // dan meja tersebut BELUM diklaim oleh pemain ini sendiri
    const showButton = dist <= 3.8 && !isMyDesk
    this.isBtnNearby = showButton
    this.btnContainer.setVisible(false)
  }

  destroy() {
    this.unsub?.()
    this.badgeContainer.destroy()
    this.btnContainer.destroy()
  }
}

/**
 * Manajer seluruh meja kerja kantor di Phaser scene.
 */
export class DeskSystem {
  private desks: DeskObject[] = []

  constructor(private scene: Phaser.Scene) {
    for (const def of OFFICE_DESKS) {
      this.desks.push(new DeskObject(scene, def))
    }
  }

  update(me: Avatar | null) {
    for (const d of this.desks) {
      d.update(me)
    }
  }

  /**
   * Cek apakah klik mengenai tombol "Move Desk Here".
   * Mengembalikan true jika event berhasil ditangani agar tidak memicu walkTo().
   */
  handlePointerUp(worldX: number, worldY: number): boolean {
    const me = store.me
    if (!me) return false

    for (const d of this.desks) {
      if (!d.isBtnNearby) continue
      const bx = d.def.btnPos.x
      const by = d.def.btnPos.y
      if (Math.abs(worldX - bx) <= 72 && Math.abs(worldY - by) <= 16) {
        claimDesk(d.def.id, { id: me.id, name: me.name })
        return true
      }
    }
    return false
  }

  /**
   * Cek apakah klik mengenai badge nama meja di depan pintu.
   */
  handleBadgeClick(worldX: number, worldY: number): boolean {
    const me = store.me
    for (const d of this.desks) {
      const bx = d.def.badgePos.x
      const by = d.def.badgePos.y
      if (Math.abs(worldX - bx) <= 60 && Math.abs(worldY - by) <= 14) {
        const claim = getDeskClaim(d.def.id)
        if (!claim) {
          store.toast("🪑 This desk is unclaimed. Walk near the desk to claim it.")
        } else if (me && (claim.userId === me.id || claim.userName.toLowerCase() === me.name.toLowerCase())) {
          store.toast(`🪑 ${claim.userName}'s desk (Your claimed desk)`, {
            label: "Release Desk",
            run: () => unclaimDesk(d.def.id),
          })
        } else {
          store.toast(`🪑 Claimed by ${claim.userName}`)
        }
        return true
      }
    }
    return false
  }

  destroy() {
    for (const d of this.desks) {
      d.destroy()
    }
    this.desks = []
  }
}

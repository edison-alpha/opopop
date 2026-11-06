import * as Phaser from "phaser"
import { store, type Avatar } from "../store"
import { OFFICE_DESKS, getDeskClaim, claimDesk, unclaimDesk, subscribeDeskChanges, type DeskDef, type DeskClaim } from "./deskClaims"
export * from "./deskClaims"
subscribeDeskChanges(() => store.emit())

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
    const showButton = dist <= 3.8 && !claim && !isMyDesk
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

/**
 * Sistem Label Ruangan Dinamis OPPERA (Dynamic Room Labels).
 *
 * 1. Default view (Zoom normal & tidak di-hover):
 *    - Tidak ada label statis mengambang permanen di lantai (peta bersih dan lega).
 * 2. Hover state (Sesuai Gambar 1):
 *    - Saat kursor mouse diarahkan ke suatu ruangan/area, muncul indikator di tile tersebut:
 *      a. 4 kurung siku (corner brackets) ⌜ ⌝ ⌞ ⌟ membingkai tile.
 *      b. Badge pill gelap berisi nama ruangan di sisi kanan-bawah tile (misal "Lobby").
 * 3. Zoom-out overview mode (Sesuai Gambar 2):
 *    - Saat kamera di-zoom out jauh (zoom <= 0.65), seluruh badge ikhtisar ruangan muncul:
 *      - Ruangan meeting & private office: [ 🚪 {Nama Ruangan} ]
 *      - Area tim kerja bersama: [ 👥 Team ]
 *      - Area lounge & santai: [ 🛋️ Lounge ], [ ☕ Café ], [ 🎮 Game Room ], [ 📚 Library ], [ 🍳 Pantry ]
 *      - Lobby: [ Lobby ]
 *    - Saat zoom kembali normal (> 0.65), badge ikhtisar otomatis disembunyikan.
 */
import * as Phaser from "phaser"
import { TILE, MAP_W, MAP_H, areaAt, areas } from "./map"
import { store } from "../store"

const FONT = "'DM Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

export class RoomLabelSystem {
  private hoverIndicator: Phaser.GameObjects.Container
  private hoverGfx: Phaser.GameObjects.Graphics
  private hoverPillBg: Phaser.GameObjects.Graphics
  private hoverPillText: Phaser.GameObjects.Text
  private lastHoverTile: [number, number] | null = null

  private overviewContainer: Phaser.GameObjects.Container
  private isOverviewActive = false

  constructor(private scene: Phaser.Scene) {
    // 1. Container Indikator Hover (Sesuai Gambar 1)
    this.hoverGfx = scene.add.graphics()
    this.hoverPillBg = scene.add.graphics()
    this.hoverPillText = scene.add
      .text(0, 0, "", {
        fontFamily: FONT,
        fontSize: "11.5px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setResolution(2)

    this.hoverIndicator = scene.add
      .container(0, 0, [this.hoverGfx, this.hoverPillBg, this.hoverPillText])
      .setDepth(260)
      .setVisible(false)

    // 2. Container Ikhtisar Zoom Out (Sesuai Gambar 2)
    this.overviewContainer = scene.add.container(0, 0).setDepth(250).setVisible(false)
    this.buildOverviewBadges()
  }

  /**
   * Bangun badge ikhtisar semua ruangan untuk mode zoom-out jauh.
   */
  public buildOverviewBadges() {
    this.overviewContainer.removeAll(true)

    for (const a of areas) {
      let icon = ""
      let label = a.name
      let isDark = false
      let isTeam = false
      let isLounge = false

      if (a.name === "Engineering" || a.name === "Marketing & Sales" || a.name === "Design Studio") {
        icon = "👥"
        label = "Team"
        isTeam = true
      } else if (a.meeting || a.private || a.name.startsWith("Focus Booth")) {
        icon = "🚪"
      } else if (
        a.name === "Lounge" ||
        a.name === "Café" ||
        a.name === "Game Room" ||
        a.name === "Library" ||
        a.name === "Pantry"
      ) {
        icon =
          a.name === "Lounge"
            ? "🛋️"
            : a.name === "Café"
              ? "☕"
              : a.name === "Game Room"
                ? "🎮"
                : a.name === "Library"
                  ? "📚"
                  : "🍳"
        isLounge = true
      } else if (a.name === "Lobby") {
        isDark = true
      }

      const displayText = icon ? `${icon} ${label}` : label
      const text = this.scene.add
        .text(0, 0, displayText, {
          fontFamily: FONT,
          fontSize: "12px",
          color: isDark ? "#ffffff" : isTeam ? "#1e293b" : isLounge ? "#831843" : "#334155",
          fontStyle: "bold",
        })
        .setResolution(2)
        .setOrigin(0.5)

      const w = text.width + 18
      const h = 24
      const g = this.scene.add.graphics()

      // Drop shadow halus
      g.fillStyle(0x000000, 0.16).fillRoundedRect(-w / 2 + 1, -h / 2 + 2, w, h, 8)

      if (isDark) {
        // Dark pill seperti Lobby di Gambar 2
        g.fillStyle(0x111827, 0.94).fillRoundedRect(-w / 2, -h / 2, w, h, 8)
        g.lineStyle(1, 0x374151, 0.8).strokeRoundedRect(-w / 2, -h / 2, w, h, 8)
      } else if (isTeam) {
        // White pill seperti Team di Gambar 2
        g.fillStyle(0xffffff, 0.96).fillRoundedRect(-w / 2, -h / 2, w, h, 8)
        g.lineStyle(1.2, 0xd1d5db, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 8)
      } else if (isLounge) {
        // Soft pink pill seperti Lounge di Gambar 2
        g.fillStyle(0xfdf2f8, 0.94).fillRoundedRect(-w / 2, -h / 2, w, h, 8)
        g.lineStyle(1.2, 0xfbcfe8, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 8)
      } else {
        // Clean neutral pill
        g.fillStyle(0xf8fafc, 0.95).fillRoundedRect(-w / 2, -h / 2, w, h, 8)
        g.lineStyle(1.2, 0xcbd5e1, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 8)
      }

      const cx = (a.x + a.w / 2) * TILE
      const cy = (a.y + a.h / 2) * TILE

      const badge = this.scene.add.container(cx, cy, [g, text])
      this.overviewContainer.add(badge)
    }
  }

  /**
   * Menangani mouse hover di atas peta (Sesuai Gambar 1).
   */
  public onPointerMove(p: Phaser.Input.Pointer) {
    // Jangan tampilkan jika sedang build mode atau sedang zoom-out overview
    if (store.build.open || this.isOverviewActive) {
      this.hoverIndicator.setVisible(false)
      this.lastHoverTile = null
      return
    }

    const tx = Math.floor(p.worldX / TILE)
    const ty = Math.floor(p.worldY / TILE)

    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) {
      this.hoverIndicator.setVisible(false)
      this.lastHoverTile = null
      return
    }

    if (this.lastHoverTile && this.lastHoverTile[0] === tx && this.lastHoverTile[1] === ty) {
      return
    }
    this.lastHoverTile = [tx, ty]

    const area = areaAt(tx, ty)
    if (!area) {
      this.hoverIndicator.setVisible(false)
      return
    }

    // 1. Gambar 4 kurung siku (corner brackets) ⌜ ⌝ ⌞ ⌟ membingkai tile yang di-hover
    this.hoverGfx.clear()
    const x = tx * TILE
    const y = ty * TILE
    const w = TILE
    const h = TILE
    const cl = 6 // panjang garis siku

    this.hoverGfx.lineStyle(1.5, 0x9ca3af, 0.95)
    // Top-Left ⌜
    this.hoverGfx.lineBetween(x, y + cl, x, y)
    this.hoverGfx.lineBetween(x, y, x + cl, y)
    // Top-Right ⌝
    this.hoverGfx.lineBetween(x + w - cl, y, x + w, y)
    this.hoverGfx.lineBetween(x + w, y, x + w, y + cl)
    // Bottom-Left ⌞
    this.hoverGfx.lineBetween(x, y + h - cl, x, y + h)
    this.hoverGfx.lineBetween(x, y + h, x + cl, y + h)
    // Bottom-Right ⌟
    this.hoverGfx.lineBetween(x + w - cl, y + h, x + w, y + h)
    this.hoverGfx.lineBetween(x + w, y + h, x + w, y + h - cl)

    // 2. Gambar badge pill gelap berisi nama ruangan di sisi kanan-bawah tile (Sesuai Gambar 1)
    this.hoverPillBg.clear()
    this.hoverPillText.setText(area.name)
    const tw = this.hoverPillText.width
    const pw = tw + 18
    const ph = 22
    const px = x + w + 4
    const py = y + h - 6

    // Drop shadow halus
    this.hoverPillBg.fillStyle(0x000000, 0.28).fillRoundedRect(px + 1, py + 2, pw, ph, 6)
    // Background pill gelap
    this.hoverPillBg.fillStyle(0x111827, 0.94).fillRoundedRect(px, py, pw, ph, 6)
    // Garis tepi halus
    this.hoverPillBg.lineStyle(1, 0x374151, 0.8).strokeRoundedRect(px, py, pw, ph, 6)

    // Posisi teks di dalam pill
    this.hoverPillText.setPosition(px + 9, py + 4)

    this.hoverIndicator.setVisible(true)
  }

  public onGameOut() {
    this.hoverIndicator.setVisible(false)
    this.lastHoverTile = null
  }

  /**
   * Update visibilitas overview labels berdasarkan level zoom kamera.
   */
  public update(currentZoom: number) {
    const shouldShowOverview = currentZoom <= 0.65
    this.isOverviewActive = shouldShowOverview

    if (this.overviewContainer.visible !== shouldShowOverview) {
      this.overviewContainer.setVisible(shouldShowOverview)
    }

    if (shouldShowOverview && this.hoverIndicator.visible) {
      this.hoverIndicator.setVisible(false)
    }
  }

  public destroy() {
    this.hoverIndicator.destroy()
    this.overviewContainer.destroy()
  }
}

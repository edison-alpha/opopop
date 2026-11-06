/**
 * Sistem Pintu Interaktif OPPERA Bergaya Gather Town (Interactive Swinging Double Doors).
 *
 * Fitur:
 * 1. Pintu ganda kayu alami (warm honey oak) dengan panel kaca persegi & pegangan krom.
 * 2. Mengayun halus (smooth 90° swing outward) saat avatar mendekat dalam radius 2 tile.
 * 3. Menutup kembali secara otomatis dan halus saat avatar menjauh.
 * 4. Area pintu 100% bebas hambatan (walkable), pemain bebas berjalan tanpa terblokir.
 */
import * as Phaser from "phaser"
import { TILE } from "./map"
import { OFFICE_ORIGIN, LAYOUT_DOORS } from "./layout"

export interface DoorDef {
  id: string
  roomName: string
  // Tile coordinates (selalu 2 tile selebar 64px)
  tiles: [number, number][]
  orientation: "horizontal" | "vertical"
  // Arah membuka ke luar ruangan:
  swingDir: "up" | "down" | "left" | "right"
  double: boolean
}

export const OX = OFFICE_ORIGIN.x
export const OY = OFFICE_ORIGIN.y

export const OFFICE_DOORS: DoorDef[] = LAYOUT_DOORS.map((d) => ({
  id: d.id, roomName: d.roomName,
  tiles: [[OX + d.x, OY + d.y], [OX + d.x + (d.orientation === "horizontal" ? 1 : 0), OY + d.y + (d.orientation === "vertical" ? 1 : 0)]],
  orientation: d.orientation, swingDir: d.swingDir, double: true,
}))

export class DoorObject {
  public openness = 0 // 0 = fully closed, 1 = fully open 90°
  public targetOpenness = 0
  private gfx: Phaser.GameObjects.Graphics

  constructor(scene: Phaser.Scene, public def: DoorDef) {
    this.gfx = scene.add.graphics()
    const minY = Math.min(...def.tiles.map((t) => t[1]))
    // Tepat di atas lantai (depth 10 + Y) dan di bawah avatar saat melangkah
    this.gfx.setDepth(10 + minY + 0.6)
    this.render()
  }

  destroy() {
    this.gfx.destroy()
  }

  update(players: { x: number; y: number }[]): boolean {
    const doorCenterX = this.def.tiles.reduce((acc, t) => acc + t[0], 0) / this.def.tiles.length + 0.5
    const doorCenterY = this.def.tiles.reduce((acc, t) => acc + t[1], 0) / this.def.tiles.length + 0.5

    // Deteksi pemain dalam radius 2.3 tile untuk membuka pintu
    let nearby = false
    for (const p of players) {
      const dx = Math.abs(p.x - doorCenterX)
      const dy = Math.abs(p.y - doorCenterY)
      if (dx <= 2.3 && dy <= 2.3) {
        nearby = true
        break
      }
    }

    this.targetOpenness = nearby ? 1.0 : 0.0

    const prev = this.openness
    // Smooth easing interpolation (~0.22s transition)
    this.openness += (this.targetOpenness - this.openness) * 0.22

    if (Math.abs(this.openness - this.targetOpenness) < 0.005) {
      this.openness = this.targetOpenness
    }

    const changed = Math.abs(this.openness - prev) > 0.001
    if (changed || this.openness > 0 || prev > 0) {
      this.render()
    }

    return changed
  }

  private render() {
    this.gfx.clear()
    if (this.def.orientation === "horizontal") {
      this.renderHorizontalDoor()
    } else {
      this.renderVerticalDoor()
    }
  }

  /**
   * Menggambar kusen kayu pintu di sudut dinding
   */
  private drawDoorPost(x: number, y: number, w: number, h: number) {
    this.gfx.fillStyle(0xc98a4b, 1.0)
    this.gfx.fillRect(x, y, w, h)
    this.gfx.fillStyle(0xf6cf9b, 0.9)
    this.gfx.fillRect(x, y, Math.min(w, 2), Math.min(h, 2))
    this.gfx.lineStyle(1, 0x6b4423, 1.0)
    this.gfx.strokeRect(x, y, w, h)
  }

  /**
   * Menggambar daun pintu kayu dengan jendela kaca persegi dan pegangan krom
   */
  private drawLeaf(
    hx: number,
    hy: number,
    angle: number,
    len: number,
    thick: number,
    isLeftOrTop: boolean,
  ) {
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)

    // Vector along length
    const lx = cos * len
    const ly = sin * len

    // Vector across thickness (perpendicular)
    const perpSign = isLeftOrTop ? 1 : -1
    const tx = -sin * thick * perpSign
    const ty = cos * thick * perpSign

    // Corner points of the door leaf polygon
    const p1 = { x: hx, y: hy }
    const p2 = { x: hx + lx, y: hy + ly }
    const p3 = { x: hx + lx + tx, y: hy + ly + ty }
    const p4 = { x: hx + tx, y: hy + ty }

    // 1. Soft contact shadow under swinging door
    if (this.openness > 0.05) {
      this.gfx.fillStyle(0x000000, 0.22)
      this.gfx.fillPoints(
        [
          { x: p1.x + 2, y: p1.y + 4 },
          { x: p2.x + 2, y: p2.y + 4 },
          { x: p3.x + 2, y: p3.y + 4 },
          { x: p4.x + 2, y: p4.y + 4 },
        ],
        true,
      )
    }

    // 2. Main warm beech wood door leaf
    this.gfx.fillStyle(0xd99b66, 1.0)
    this.gfx.fillPoints([p1, p2, p3, p4], true)

    // 3. Highlight bevel on outer rim
    this.gfx.lineStyle(1.5, 0xf6d5b0, 0.9)
    this.gfx.lineBetween(p1.x, p1.y, p2.x, p2.y)

    // 4. Dark outline
    this.gfx.lineStyle(1, 0x78350f, 1.0)
    this.gfx.strokePoints([p1, p2, p3, p4], true)

    // 5. Square Glass Window Insert (Gaya Khas Gather Town)
    // Berada di tengah-tengah daun pintu (sekitar 40% - 60% panjang pintu)
    const wCenter = 0.52
    const wLen = len * 0.28
    const wThick = thick * 0.65

    const wx0 = hx + lx * (wCenter - 0.14) + tx * 0.18
    const wy0 = hy + ly * (wCenter - 0.14) + ty * 0.18

    const wlx = cos * wLen
    const wly = sin * wLen
    const wtx = -sin * wThick * perpSign
    const wty = cos * wThick * perpSign

    const wp1 = { x: wx0, y: wy0 }
    const wp2 = { x: wx0 + wlx, y: wy0 + wly }
    const wp3 = { x: wx0 + wlx + wtx, y: wy0 + wly + wty }
    const wp4 = { x: wx0 + wtx, y: wy0 + wty }

    // Window frame border
    this.gfx.lineStyle(1.5, 0x451a03, 1.0)
    this.gfx.strokePoints([wp1, wp2, wp3, wp4], true)

    // Sky blue reflective glass
    this.gfx.fillStyle(0x38bdf8, 0.95)
    this.gfx.fillPoints([wp1, wp2, wp3, wp4], true)

    // White glare glint on glass
    this.gfx.lineStyle(1, 0xffffff, 0.85)
    this.gfx.lineBetween(wp1.x + 1, wp1.y + 1, wp3.x - 1, wp3.y - 1)

    // 6. Chrome Vertical Pull Handle (dekat ujung pertemuan pintu)
    const hPos = 0.85
    const hx0 = hx + lx * hPos + tx * 0.2
    const hy0 = hy + ly * hPos + ty * 0.2
    const hx1 = hx + lx * hPos + tx * 0.8
    const hy1 = hy + ly * hPos + ty * 0.8

    this.gfx.lineStyle(2, 0xffffff, 1.0)
    this.gfx.lineBetween(hx0, hy0, hx1, hy1)
    this.gfx.lineStyle(1, 0x475569, 0.8)
    this.gfx.lineBetween(hx0 + 1, hy0 + 1, hx1 + 1, hy1 + 1)
  }

  /**
   * Render Pintu Horizontal (Dinding Utara / Selatan - Ayunan 90° Smooth)
   */
  private renderHorizontalDoor() {
    const tiles = this.def.tiles
    const minX = Math.min(...tiles.map((t) => t[0]))
    const maxX = Math.max(...tiles.map((t) => t[0]))
    const tileY = tiles[0][1]

    const leftX = minX * TILE
    const rightX = (maxX + 1) * TILE
    const centerY = tileY * TILE + TILE / 2

    // 1. Tiang kusen pintu kayu tetap
    this.drawDoorPost(leftX - 2, centerY - 14, 5, 28)
    this.drawDoorPost(rightX - 3, centerY - 14, 5, 28)

    // 2. Garis ambang pintu (threshold line) di lantai
    this.gfx.lineStyle(2, 0xa16207, 0.75)
    this.gfx.lineBetween(leftX + 2, centerY + 12, rightX - 2, centerY + 12)

    // 3. Daun Pintu Ganda yang Mengayun
    const leafLen = 31
    const leafThick = 6
    // Maksimum ayunan 85° agar tetap terlihat proporsional di dinding
    const maxAngle = Math.PI * 0.47
    const currentAngle = this.openness * maxAngle

    const swingDown = this.def.swingDir === "down"
    const dirSign = swingDown ? 1 : -1

    // Left Leaf (Hinge di sudut kiri kusen)
    // Sudut istirahat (tertutup) = 0 rad (mengarah ke kanan)
    const leftAngle = currentAngle * dirSign
    this.drawLeaf(leftX + 2, centerY - 12, leftAngle, leafLen, leafThick, true)

    // Right Leaf (Hinge di sudut kanan kusen)
    // Sudut istirahat (tertutup) = PI rad (mengarah ke kiri)
    const rightAngle = Math.PI - currentAngle * dirSign
    this.drawLeaf(rightX - 2, centerY - 12, rightAngle, leafLen, leafThick, false)
  }

  /**
   * Render Pintu Vertikal (Dinding Barat / Timur - Ayunan 90° Smooth)
   */
  private renderVerticalDoor() {
    const tiles = this.def.tiles
    const tileX = tiles[0][0]
    const minY = Math.min(...tiles.map((t) => t[1]))
    const maxY = Math.max(...tiles.map((t) => t[1]))

    const centerX = tileX * TILE + TILE / 2
    const topY = minY * TILE
    const bottomY = (maxY + 1) * TILE

    // 1. Tiang kusen pintu kayu tetap
    this.drawDoorPost(centerX - 14, topY - 2, 28, 5)
    this.drawDoorPost(centerX - 14, bottomY - 3, 28, 5)

    // 2. Garis ambang pintu (threshold line) di lantai
    this.gfx.lineStyle(2, 0xa16207, 0.75)
    this.gfx.lineBetween(centerX + 12, topY + 2, centerX + 12, bottomY - 2)

    // 3. Daun Pintu Ganda yang Mengayun
    const leafLen = 31
    const leafThick = 6
    const maxAngle = Math.PI * 0.47
    const currentAngle = this.openness * maxAngle

    const swingRight = this.def.swingDir === "right"
    const dirSign = swingRight ? 1 : -1

    // Top Leaf (Hinge di sudut atas kusen)
    // Sudut istirahat (tertutup) = PI/2 rad (mengarah ke bawah)
    const topAngle = Math.PI * 0.5 - currentAngle * dirSign
    this.drawLeaf(centerX - 12, topY + 2, topAngle, leafLen, leafThick, true)

    // Bottom Leaf (Hinge di sudut bawah kusen)
    // Sudut istirahat (tertutup) = -PI/2 rad (mengarah ke atas)
    const bottomAngle = -Math.PI * 0.5 + currentAngle * dirSign
    this.drawLeaf(centerX - 12, bottomY - 2, bottomAngle, leafLen, leafThick, false)
  }
}

export class DoorSystem {
  private doors: DoorObject[] = []

  constructor(scene: Phaser.Scene) {
    for (const def of OFFICE_DOORS) {
      this.doors.push(new DoorObject(scene, def))
    }
  }

  update(players: { x: number; y: number }[]) {
    for (const d of this.doors) {
      d.update(players)
    }
  }

  destroy() {
    for (const d of this.doors) {
      d.destroy()
    }
    this.doors = []
  }
}

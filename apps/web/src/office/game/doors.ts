/**
 * Sistem Pintu Interaktif OPPERA (Interactive Swinging Doors).
 * Pintu berayun 1 arah ke luar ruangan (outward) saat pemain mendekat,
 * dan menutup kembali secara halus saat pemain menjauh.
 */
import * as Phaser from "phaser"
import { TILE } from "./map"

export interface DoorDef {
  id: string
  roomName: string
  // Tile coordinates
  tiles: [number, number][]
  orientation: "horizontal" | "vertical"
  // Arah membuka ke luar ruangan:
  // "up" (ke lorong utara), "down" (ke lorong selatan), "left" (ke lorong barat), "right" (ke lorong timur)
  swingDir: "up" | "down" | "left" | "right"
  double: boolean
}

const OX = 13
const OY = 9

/**
 * Daftar semua pintu ruangan di kantor virtual OPPERA
 */
export const OFFICE_DOORS: DoorDef[] = [
  // 1. Focus Booth 1
  {
    id: "focus-1",
    roomName: "Focus Booth 1",
    tiles: [[OX + 6, OY + 9]],
    orientation: "horizontal",
    swingDir: "down",
    double: true,
  },
  // 2. Focus Booth 2
  {
    id: "focus-2",
    roomName: "Focus Booth 2",
    tiles: [[OX + 18, OY + 9]],
    orientation: "horizontal",
    swingDir: "down",
    double: true,
  },
  // 3. Focus Booth 3
  {
    id: "focus-3",
    roomName: "Focus Booth 3",
    tiles: [[OX + 42, OY + 9]],
    orientation: "horizontal",
    swingDir: "down",
    double: true,
  },
  // 4. Focus Booth 4
  {
    id: "focus-4",
    roomName: "Focus Booth 4",
    tiles: [[OX + 54, OY + 9]],
    orientation: "horizontal",
    swingDir: "down",
    double: true,
  },
  // 5. Meeting Room A (Boardroom)
  {
    id: "meeting-a",
    roomName: "Meeting Room A",
    tiles: [[OX + 48, OY + 14]],
    orientation: "vertical",
    swingDir: "left",
    double: true,
  },
  // 6. Meeting Room B (Huddle Room)
  {
    id: "meeting-b",
    roomName: "Meeting Room B",
    tiles: [[OX + 48, OY + 22]],
    orientation: "vertical",
    swingDir: "left",
    double: true,
  },
]

export class DoorObject {
  public openness = 0 // 0 = closed, 1 = fully open
  public targetOpenness = 0
  private gfx: Phaser.GameObjects.Graphics

  constructor(scene: Phaser.Scene, public def: DoorDef) {
    this.gfx = scene.add.graphics()
    // Render pada kedalaman tepat di atas lantai dan di sekitar dinding
    const minY = Math.min(...def.tiles.map((t) => t[1]))
    this.gfx.setDepth(10 + minY + 0.5)
  }

  destroy() {
    this.gfx.destroy()
  }

  update(players: { x: number; y: number }[]): boolean {
    // 1. Cek jarak pemain terdekat ke pintu
    let nearby = false
    const doorCenterX = this.def.tiles.reduce((acc, t) => acc + t[0], 0) / this.def.tiles.length + 0.5
    const doorCenterY = this.def.tiles.reduce((acc, t) => acc + t[1], 0) / this.def.tiles.length + 0.5

    for (const p of players) {
      const dx = Math.abs(p.x - doorCenterX)
      const dy = Math.abs(p.y - doorCenterY)
      // Jarak deteksi interaksi pintu (sekitar 1.8 tile)
      if (dx <= 1.8 && dy <= 1.8) {
        nearby = true
        break
      }
    }

    this.targetOpenness = nearby ? 1.0 : 0.0

    // 2. Animasi ayunan pintu (smooth interpolation)
    const prev = this.openness
    this.openness += (this.targetOpenness - this.openness) * 0.18

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
   * Menggambar daun pintu kayu dengan rotasi (Hinge di sudut dinding)
   */
  private drawDoorLeaf(
    hx: number,
    hy: number,
    angleRad: number,
    length: number,
    thickness: number,
    handleSide: "left" | "right"
  ) {
    const cos = Math.cos(angleRad)
    const sin = Math.sin(angleRad)
    const nx = -sin
    const ny = cos

    // 4 titik sudut daun pintu
    const p0 = { x: hx, y: hy }
    const p1 = { x: hx + cos * length, y: hy + sin * length }
    const p2 = { x: p1.x + nx * thickness, y: p1.y + ny * thickness }
    const p3 = { x: hx + nx * thickness, y: hy + ny * thickness }

    // Bayangan halus di bawah daun pintu saat terbuka
    if (this.openness > 0.05) {
      this.gfx.fillStyle(0x000000, 0.22 * this.openness)
      this.gfx.fillPoints(
        [
          { x: p0.x + 3, y: p0.y + 4 },
          { x: p1.x + 3, y: p1.y + 4 },
          { x: p2.x + 3, y: p2.y + 4 },
          { x: p3.x + 3, y: p3.y + 4 },
        ],
        true
      )
    }

    // Warna dasar kayu pintu (sesuai screenshot)
    this.gfx.fillStyle(0xe2aa6e, 1.0)
    this.gfx.fillPoints([p0, p1, p2, p3], true)

    // Garis tepi outline kayu gelap
    this.gfx.lineStyle(1.5, 0x8b5b29, 1.0)
    this.gfx.strokePoints([p0, p1, p2, p3], true)

    // Panel ukiran kayu di dalam
    if (length > 14) {
      const inset = 3
      const ip0 = { x: hx + cos * inset + nx * 1.5, y: hy + sin * inset + ny * 1.5 }
      const ip1 = { x: hx + cos * (length - inset) + nx * 1.5, y: hy + sin * (length - inset) + ny * 1.5 }
      const ip2 = { x: ip1.x + nx * (thickness - 3), y: ip1.y + ny * (thickness - 3) }
      const ip3 = { x: ip0.x + nx * (thickness - 3), y: ip0.y + ny * (thickness - 3) }

      this.gfx.fillStyle(0xd5995b, 0.85)
      this.gfx.fillPoints([ip0, ip1, ip2, ip3], true)
      this.gfx.lineStyle(1, 0x7a4d22, 0.6)
      this.gfx.strokePoints([ip0, ip1, ip2, ip3], true)
    }

    // Gagang pintu logam (metal handle) di dekat ujung
    const handleDist = length - 6
    const hxPos = hx + cos * handleDist + nx * (thickness / 2)
    const hyPos = hy + sin * handleDist + ny * (thickness / 2)

    this.gfx.fillStyle(0x334155, 1.0)
    this.gfx.fillCircle(hxPos, hyPos, 2.5)
    this.gfx.fillStyle(0xe2e8f0, 1.0)
    this.gfx.fillCircle(hxPos - 0.5, hyPos - 0.5, 1.2)
  }

  /**
   * Render Pintu Horizontal (Dinding Utara / Selatan)
   */
  private renderHorizontalDoor() {
    const tiles = this.def.tiles
    const minX = Math.min(...tiles.map((t) => t[0]))
    const maxX = Math.max(...tiles.map((t) => t[0]))
    const tileY = tiles[0][1]

    const leftX = minX * TILE
    const rightX = (maxX + 1) * TILE
    const centerY = tileY * TILE + TILE / 2

    const maxSwingRad = Phaser.Math.DegToRad(75) // Sudut buka 75 derajat ke luar
    const isUp = this.def.swingDir === "up"

    if (this.def.double) {
      // Pintu Ganda (2 Daun Pintu)
      const leafLength = (rightX - leftX) / 2 - 1
      const thickness = 6

      // Daun Kiri (Hinge di tiang kiri)
      // Saat membuka ke atas: rotasi berlawanan jarum jam (-), saat ke bawah: searah jarum jam (+)
      const leftAngle = isUp ? -this.openness * maxSwingRad : this.openness * maxSwingRad
      this.drawDoorLeaf(leftX, centerY, leftAngle, leafLength, thickness, "right")

      // Daun Kanan (Hinge di tiang kanan)
      // Saat tertutup sudutnya PI (menghadap ke kiri)
      const rightAngleBase = Math.PI
      const rightAngle = isUp
        ? rightAngleBase + this.openness * maxSwingRad
        : rightAngleBase - this.openness * maxSwingRad
      this.drawDoorLeaf(rightX, centerY, rightAngle, leafLength, thickness, "left")
    } else {
      // Pintu Tunggal
      const leafLength = TILE - 2
      const thickness = 5
      const angle = isUp ? -this.openness * maxSwingRad : this.openness * maxSwingRad
      this.drawDoorLeaf(leftX, centerY, angle, leafLength, thickness, "right")
    }
  }

  /**
   * Render Pintu Vertikal (Dinding Barat / Timur - Seperti Pintu Terrace di Gambar 2)
   */
  private renderVerticalDoor() {
    const tiles = this.def.tiles
    const tileX = tiles[0][0]
    const minY = Math.min(...tiles.map((t) => t[1]))
    const maxY = Math.max(...tiles.map((t) => t[1]))

    const centerX = tileX * TILE + TILE / 2
    const topY = minY * TILE
    const bottomY = (maxY + 1) * TILE

    const maxSwingRad = Phaser.Math.DegToRad(70) // Sudut buka 70 derajat ke luar (ke kiri)
    const isLeft = this.def.swingDir === "left"

    if (this.def.double) {
      // Pintu Ganda Vertikal (Gambar 2):
      // Daun Atas: Hinge di sudut atas (topY), tertutup menghadap ke bawah (+PI/2)
      // Daun Bawah: Hinge di sudut bawah (bottomY), tertutup menghadap ke atas (-PI/2)
      const leafLength = (bottomY - topY) / 2 - 1
      const thickness = 6

      // Daun Atas: Mengayun ke luar (kiri)
      const topAngleBase = Math.PI / 2
      const topAngle = isLeft
        ? topAngleBase - this.openness * maxSwingRad
        : topAngleBase + this.openness * maxSwingRad
      this.drawDoorLeaf(centerX, topY, topAngle, leafLength, thickness, "right")

      // Daun Bawah: Mengayun ke luar (kiri)
      const bottomAngleBase = -Math.PI / 2
      const bottomAngle = isLeft
        ? bottomAngleBase + this.openness * maxSwingRad
        : bottomAngleBase - this.openness * maxSwingRad
      this.drawDoorLeaf(centerX, bottomY, bottomAngle, leafLength, thickness, "left")
    } else {
      const leafLength = TILE - 2
      const thickness = 5
      const angleBase = Math.PI / 2
      const angle = isLeft ? angleBase - this.openness * maxSwingRad : angleBase + this.openness * maxSwingRad
      this.drawDoorLeaf(centerX, topY, angle, leafLength, thickness, "right")
    }
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

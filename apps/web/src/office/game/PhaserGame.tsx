"use client"
// Phaser renderer for the office: map texture, avatar sprites, name tags, camera.
import * as Phaser from "phaser"
import { useEffect, useRef } from "react"
import type { AvatarLook, Dir } from "@/shared/protocol"
import { eraseOps, floorOps, placeError, placeOps, roomOps, rotateObj } from "../build"
import { advancePath, cancelPath, editMap, react, redoEdit, tryStep, undoEdit, updateProximity, walkTo } from "../session"
import { STEP_MS, store, type Avatar } from "../store"
import { VoiceActivity } from "../voiceActivity"
import { drawAvatar, redrawTiles, renderObjectThumb, renderSeatFrontRow, renderStaticMap } from "./art"
import { REACTION_KEYS, REACTION_MS, STATUS_COLOR } from "./constants"
import {
  FOOTPRINT, MAP_H, MAP_W, SEATS, TILE, areaAt, areas, objects, onMapChange, seatAt, type Area, type MapChange,
} from "./map"

const KEY_DIR: Record<string, Dir> = {
  ArrowUp: "up", KeyW: "up",
  ArrowDown: "down", KeyS: "down",
  ArrowLeft: "left", KeyA: "left",
  ArrowRight: "right", KeyD: "right",
}
const DIRS: Dir[] = ["down", "left", "right", "up"]
const FRAME_W = 40
// Frame is taller than the body so hats fit; HEAD_H is where name tags sit.
const FRAME_H = 54
const HEAD_H = 46
const FONT = "'DM Sans', system-ui, sans-serif"

function isTyping() {
  const el = document.activeElement
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || (el as HTMLElement).isContentEditable)
}

const lookKey = (l: AvatarLook) =>
  "av:" + JSON.stringify(l, Object.keys(l).sort())

interface Sprite {
  root: Phaser.GameObjects.Container
  body: Phaser.GameObjects.Image
  tag: Phaser.GameObjects.Container
  tagBg: Phaser.GameObjects.Graphics
  tagText: Phaser.GameObjects.Text
  emoji: Phaser.GameObjects.Text
  speech: Phaser.GameObjects.Graphics
  key: string
  tagSig: string
}

class OfficeScene extends Phaser.Scene {
  private voice!: VoiceActivity
  private sprites = new Map<string, Sprite>()
  private held: Dir[] = []
  private lastProx = 0
  private dim!: Phaser.GameObjects.Graphics
  private dimArea: Area | null | undefined = undefined
  private following: string | null = null
  private cleanup: (() => void)[] = []
  // Live map
  private mapCanvas!: HTMLCanvasElement
  private mapTex!: Phaser.Textures.CanvasTexture
  private seatRows = new Map<number, Phaser.GameObjects.Image>()
  private labels: Phaser.GameObjects.Container[] = []
  // Build mode
  private ghost!: Phaser.GameObjects.Image
  private buildGfx!: Phaser.GameObjects.Graphics
  private dragStart: [number, number] | null = null
  private lastPaint: string | null = null
  private pan: { x: number; y: number; sx: number; sy: number } | null = null
  private hoverTile: [number, number] | null = null
  private wasBuilding = false

  constructor() {
    super("office")
  }

  create() {
    this.voice = new VoiceActivity()
    window.addEventListener("pointerdown", this.voice.resume)
    window.addEventListener("keydown", this.voice.resume)
    this.cleanup.push(() => {
      window.removeEventListener("pointerdown", this.voice.resume)
      window.removeEventListener("keydown", this.voice.resume)
      this.voice.dispose()
    })
    const mapW = MAP_W * TILE
    const mapH = MAP_H * TILE
    this.mapCanvas = renderStaticMap()
    this.mapTex = this.textures.addCanvas("map", this.mapCanvas)!
    this.add.image(0, 0, "map").setOrigin(0).setDepth(0)

    this.dim = this.add.graphics().setDepth(1)
    this.drawAreaLabels()
    this.rebuildSeatRows(0, MAP_H - 1)
    this.ghost = this.add.image(0, 0, "__DEFAULT").setOrigin(0).setAlpha(0.7).setDepth(900).setVisible(false)
    this.buildGfx = this.add.graphics().setDepth(901)
    this.cleanup.push(onMapChange((c) => this.onMapChanged(c)))
    this.input.mouse?.disableContextMenu()
    this.setupBuildInput()

    const cam = this.cameras.main
    cam.setBounds(0, 0, mapW, mapH)
    cam.setBackgroundColor("#c4e6b8")
    cam.setRoundPixels(true)
    cam.setZoom(store.zoom)
    cam.centerOn(mapW / 2, mapH / 2)

    // Keyboard via window so React inputs can opt out.
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping()) return
      if (store.build.open && this.buildKey(e)) return
      const dir = KEY_DIR[e.code]
      if (dir && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        cancelPath()
        if (!this.held.includes(dir)) this.held.push(dir)
        return
      }
      const n = Number(e.key)
      if (!e.ctrlKey && !e.metaKey && !e.altKey && n >= 1 && n <= REACTION_KEYS.length) react(REACTION_KEYS[n - 1])
    }
    const onKeyUp = (e: KeyboardEvent) => {
      const dir = KEY_DIR[e.code]
      const i = dir ? this.held.indexOf(dir) : -1
      if (i >= 0) this.held.splice(i, 1)
    }
    const onBlur = () => (this.held.length = 0)
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    window.addEventListener("blur", onBlur)
    this.cleanup.push(() => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
      window.removeEventListener("blur", onBlur)
    })

    this.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      if (store.build.open) return // build mode has its own handlers
      if (p.getDistance() > 6) return // was a drag
      const tx = Math.floor(p.worldX / TILE)
      const ty = Math.floor(p.worldY / TILE)
      for (const a of store.players.values()) {
        if (a.id !== store.meId && a.x === tx && a.y === ty) {
          store.selected = a.id
          store.sidebar = "people"
          store.sidebarOpen = true
          store.emit()
          return
        }
      }
      walkTo(tx, ty)
    })
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      store.setZoom(store.zoom - Math.sign(e.deltaY) * 0.25)
    }
    const canvas = this.game.canvas
    canvas.addEventListener("wheel", onWheel, { passive: false })
    this.cleanup.push(() => canvas.removeEventListener("wheel", onWheel))
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup.forEach((f) => f()))
  }

  private drawAreaLabels() {
    for (const l of this.labels) l.destroy()
    this.labels = []
    for (const a of areas.filter((x) => x.label)) {
      const text = this.add
        .text(0, 0, `👥 ${a.name}`, { fontFamily: FONT, fontSize: "11px", color: "#5b5f73", fontStyle: "bold" })
        .setResolution(3)
      const w = text.width + 14
      const g = this.add.graphics()
      g.fillStyle(0xffffff, 0.85).fillRoundedRect(-w / 2, -9, w, 18, 9)
      text.setOrigin(0.5)
      this.labels.push(this.add.container((a.x + a.w / 2) * TILE, a.y * TILE - 2, [g, text]).setDepth(2))
    }
  }

  // ───── Live map updates ─────

  private onMapChanged(c: MapChange) {
    if (c.all) {
      redrawTiles(this.mapCanvas, [[0, 0], [MAP_W - 1, MAP_H - 1]])
      this.rebuildSeatRows(0, MAP_H - 1)
    } else if (c.tiles.length) {
      const r = redrawTiles(this.mapCanvas, c.tiles)
      if (r) this.rebuildSeatRows(r[1], r[3])
    }
    this.mapTex.refresh()
    if (c.areas || c.all) {
      this.drawAreaLabels()
      this.dimArea = undefined
    }
  }

  /** Chair/sofa backs that must render in front of someone sitting on that row. */
  private rebuildSeatRows(y0: number, y1: number) {
    for (let y = Math.max(0, y0); y <= Math.min(MAP_H - 1, y1); y++) {
      const key = `seatfront:${y}`
      this.seatRows.get(y)?.destroy()
      this.seatRows.delete(y)
      if (this.textures.exists(key)) this.textures.remove(key)
      const c = renderSeatFrontRow(y, SEATS)
      if (!c) continue
      this.textures.addCanvas(key, c)
      this.seatRows.set(y, this.add.image(0, y * TILE, key).setOrigin(0).setDepth(10 + y + 0.5))
    }
  }

  // ───── Build mode ─────

  private tileOf(p: Phaser.Input.Pointer): [number, number] {
    return [Math.floor(p.worldX / TILE), Math.floor(p.worldY / TILE)]
  }

  private setupBuildInput() {
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (!store.build.open) return
      const cam = this.cameras.main
      if (p.rightButtonDown() || p.middleButtonDown()) {
        this.pan = { x: p.x, y: p.y, sx: cam.scrollX, sy: cam.scrollY }
        return
      }
      const [tx, ty] = this.tileOf(p)
      const b = store.build
      if (b.tool === "object") {
        if ((p.event as MouseEvent).altKey) {
          const o = objects[ty]?.[tx]
          if (o) { b.obj = o; store.emit() }
          return
        }
        this.lastPaint = null
        this.paintObject(tx, ty, false)
      } else {
        this.dragStart = [tx, ty]
      }
    })
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (!store.build.open) return
      if (this.pan) {
        const cam = this.cameras.main
        cam.setScroll(this.pan.sx - (p.x - this.pan.x) / cam.zoom, this.pan.sy - (p.y - this.pan.y) / cam.zoom)
        return
      }
      const [tx, ty] = this.tileOf(p)
      if (p.leftButtonDown() && store.build.tool === "object" && this.lastPaint !== null) this.paintObject(tx, ty, true)
    })
    const finish = (p: Phaser.Input.Pointer) => {
      if (this.pan) { this.pan = null; return }
      this.lastPaint = null
      if (!store.build.open || !this.dragStart) return
      const [sx, sy] = this.dragStart
      this.dragStart = null
      const [tx, ty] = this.tileOf(p)
      const b = store.build
      if (b.tool === "floor") editMap(floorOps(b.floor, sx, sy, tx, ty))
      else if (b.tool === "erase") editMap(eraseOps(sx, sy, tx, ty))
      else if (b.tool === "room") {
        const ops = roomOps(sx, sy, tx, ty, b.room)
        if (ops) {
          editMap(ops)
          const created = ops.find((o) => o.k === "area")
          if (created && created.k === "area") store.toast(`Room “${created.area.name}” created`)
        } else store.toast("Drag a rectangle of at least 3 × 3 tiles to make a room")
      }
    }
    this.input.on("pointerup", finish)
    this.input.on("pointerupoutside", finish)
    this.input.on("gameout", () => { this.hoverTile = null })
  }

  /** Places the selected object; while dragging, each new tile joins the same undo step. */
  private paintObject(tx: number, ty: number, merge: boolean) {
    const key = `${tx},${ty}`
    if (this.lastPaint === key) return
    const b = store.build
    const ops = placeOps(b.obj, tx, ty)
    this.lastPaint = key
    if (!ops) {
      if (!merge) { const err = placeError(b.obj, tx, ty); if (err) store.toast(err) }
      return
    }
    editMap(ops, merge)
  }

  /** Build-mode shortcuts. Returns true when the key was handled. */
  private buildKey(e: KeyboardEvent): boolean {
    const mod = e.ctrlKey || e.metaKey
    if (mod && e.code === "KeyZ") { e.preventDefault(); if (e.shiftKey) redoEdit(); else undoEdit(); return true }
    if (mod && e.code === "KeyY") { e.preventDefault(); redoEdit(); return true }
    if (e.code === "KeyR" && !mod) { store.build.obj = rotateObj(store.build.obj); store.emit(); return true }
    if (e.code === "Escape") { store.build.open = false; store.emit(); return true }
    const tools = { Digit1: "object", Digit2: "floor", Digit3: "erase", Digit4: "room" } as const
    const t = tools[e.code as keyof typeof tools]
    if (t && !mod) { store.build.tool = t; store.emit(); return true }
    return false
  }

  private ghostKey(o: string) {
    const key = `ghost:${o}`
    if (!this.textures.exists(key)) {
      const obj = o as keyof typeof FOOTPRINT
      this.textures.addCanvas(key, renderObjectThumb(obj, FOOTPRINT[obj] ?? [1, 1]))
    }
    return key
  }

  /** Hover preview: the object ghost or the drag rectangle. */
  private updateBuildPreview() {
    const g = this.buildGfx
    g.clear()
    const b = store.build
    if (!b.open) { this.ghost.setVisible(false); return }
    const p = this.input.activePointer
    const over = p.worldX >= 0 && p.worldY >= 0 && p.worldX < MAP_W * TILE && p.worldY < MAP_H * TILE && !this.pan
    const tile = over ? this.tileOf(p) : null
    if (tile?.[0] !== this.hoverTile?.[0] || tile?.[1] !== this.hoverTile?.[1]) {
      this.hoverTile = tile
      b.hover = tile
      store.emit()
    }
    if (!tile) { this.ghost.setVisible(false); return }
    const [tx, ty] = tile
    if (b.tool === "object") {
      this.ghost.setTexture(this.ghostKey(b.obj)).setPosition((tx - 1) * TILE, (ty - 2) * TILE).setVisible(true)
      const bad = !!placeError(b.obj, tx, ty)
      this.ghost.setTint(bad ? 0xff7070 : 0xffffff)
      const [w, h] = FOOTPRINT[b.obj] ?? [1, 1]
      g.lineStyle(2, bad ? 0xe5484d : 0x4c6ef5, 1).strokeRect(tx * TILE, ty * TILE, w * TILE, h * TILE)
      return
    }
    this.ghost.setVisible(false)
    const [sx, sy] = this.dragStart ?? tile
    const x0 = Math.min(sx, tx), y0 = Math.min(sy, ty), x1 = Math.max(sx, tx), y1 = Math.max(sy, ty)
    const color = b.tool === "erase" ? 0xe5484d : b.tool === "room" ? 0x2fbf71 : 0x4c6ef5
    g.fillStyle(color, 0.18).fillRect(x0 * TILE, y0 * TILE, (x1 - x0 + 1) * TILE, (y1 - y0 + 1) * TILE)
    g.lineStyle(2, color, 1).strokeRect(x0 * TILE, y0 * TILE, (x1 - x0 + 1) * TILE, (y1 - y0 + 1) * TILE)
    if (b.tool === "room" && this.dragStart) {
      // walls ring + door preview
      g.lineStyle(1, 0x1b5e3a, 0.9).strokeRect((x0 + 1) * TILE, (y0 + 1) * TILE, Math.max(0, x1 - x0 - 1) * TILE, Math.max(0, y1 - y0 - 1) * TILE)
    }
  }

  private avatarTexture(look: AvatarLook): string {
    const key = lookKey(look)
    if (this.textures.exists(key)) return key
    const tex = this.textures.createCanvas(key, FRAME_W * 12, FRAME_H)!
    const ctx = tex.getContext()
    DIRS.forEach((dir, d) => {
      for (let s = 0; s < 2; s++) {
        const i = d * 2 + s
        drawAvatar(ctx, look, i * FRAME_W + FRAME_W / 2, FRAME_H - 2, dir, s)
        tex.add(`${dir}${s}`, 0, i * FRAME_W, 0, FRAME_W, FRAME_H)
      }
      // seated pose
      const i = 8 + d
      drawAvatar(ctx, look, i * FRAME_W + FRAME_W / 2, FRAME_H - 2, dir, 0, 1, "sit")
      tex.add(`sit${dir}`, 0, i * FRAME_W, 0, FRAME_W, FRAME_H)
    })
    tex.refresh()
    return key
  }

  private makeSprite(a: Avatar): Sprite {
    const key = this.avatarTexture(a.look)
    const body = this.add.image(0, 2, key, "down0").setOrigin(0.5, 1)
    const tagBg = this.add.graphics()
    const tagText = this.add
      .text(0, 0, a.name, { fontFamily: FONT, fontSize: "11px", color: "#ffffff", fontStyle: "bold" })
      .setOrigin(0, 0.5)
      .setResolution(3)
    const tag = this.add.container(0, -HEAD_H - 4, [tagBg, tagText])
    const emoji = this.add.text(0, -HEAD_H - 20, "", { fontSize: "20px" }).setOrigin(0.5, 1).setResolution(3)
    const speech = this.add.graphics().setPosition(-28, -HEAD_H + 12).setVisible(false)
    speech.fillStyle(0xffffff).fillRoundedRect(-13, -9, 26, 18, 8)
    speech.lineStyle(1.5, 0x171717).strokeRoundedRect(-13, -9, 26, 18, 8)
    speech.fillStyle(0xffffff).fillTriangle(6, 7, 13, 12, 11, 3)
    speech.lineBetween(6, 8, 13, 12).lineBetween(13, 12, 11, 5)
    speech.fillStyle(0x171717)
    for (const x of [-6, 0, 6]) speech.fillCircle(x, 0, 1.8)
    const root = this.add.container(0, 0, [body, tag, emoji, speech])
    return { root, body, tag, tagBg, tagText, emoji, speech, key, tagSig: "" }
  }

  private drawTag(s: Sprite, a: Avatar) {
    const isMe = a.id === store.meId
    const sig = `${a.name}|${a.status}|${isMe}|${a.mic}|${a.screen}`
    if (sig === s.tagSig) return
    s.tagSig = sig
    let label = a.name
    if (label.length > 18) label = label.slice(0, 17) + "…"
    s.tagText.setText(label)
    const w = s.tagText.width + 24
    const h = 18
    s.tagBg.clear()
    s.tagBg.fillStyle(isMe ? 0x5b4fe9 : 0x1f1f26, isMe ? 1 : 0.88).fillRoundedRect(-w / 2, -h / 2, w, h, 6)
    s.tagBg.fillStyle(Phaser.Display.Color.HexStringToColor(STATUS_COLOR[a.status]).color, 1).fillCircle(-w / 2 + 9, 0, 3.5)
    s.tagText.setX(-w / 2 + 16)
    if (a.screen) {
      s.tagBg.fillStyle(0x2fbf71, 1).fillRoundedRect(w / 2 + 3, -6, 12, 12, 3)
    }
  }

  private updateDim(area: Area | null) {
    if (area === this.dimArea) return
    this.dimArea = area
    this.dim.clear()
    if (!area?.private) return
    const mapW = MAP_W * TILE
    const mapH = MAP_H * TILE
    const ax = area.x * TILE, ay = area.y * TILE, aw = area.w * TILE, ah = area.h * TILE
    this.dim.fillStyle(0x0b0d1e, 0.32)
    this.dim.fillRect(0, 0, mapW, ay)
    this.dim.fillRect(0, ay + ah, mapW, mapH - ay - ah)
    this.dim.fillRect(0, ay, ax, ah)
    this.dim.fillRect(ax + aw, ay, mapW - ax - aw, ah)
    this.dim.lineStyle(2, 0x8b8ff5, 0.9).strokeRect(ax, ay, aw, ah)
  }

  update(time: number) {
    const now = performance.now()
    this.voice.update(now)
    const me = store.me

    if (me && this.held.length) tryStep(this.held[this.held.length - 1])
    advancePath()
    if (now - this.lastProx > 200) {
      this.lastProx = now
      updateProximity()
    }

    // Sync sprites with players
    for (const [id, s] of this.sprites) {
      if (!store.players.has(id)) {
        s.root.destroy()
        this.sprites.delete(id)
      }
    }
    for (const a of store.players.values()) {
      let s = this.sprites.get(a.id)
      if (!s) {
        s = this.makeSprite(a)
        this.sprites.set(a.id, s)
      }
      const key = lookKey(a.look)
      if (key !== s.key) {
        s.key = this.avatarTexture(a.look)
        s.body.setTexture(s.key, `${a.dir}0`)
      }
      const t = Math.min(1, (now - a.stepStart) / STEP_MS)
      a.rx = a.fromX + (a.x - a.fromX) * t
      a.ry = a.fromY + (a.y - a.fromY) * t
      const walking = t < 1
      // Standing still on a chair/sofa/bench/stool = sitting on it, facing the seat's way.
      const seat = walking ? null : seatAt(a.x, a.y)
      s.speech.setY(-HEAD_H + 12 - (seat?.lift ?? 0)).setVisible(store.preferences.speechBubbles && this.voice.isSpeaking(a.id, now))
      s.tag.setVisible(store.preferences.nameLabels)
      if (seat) {
        s.body.setFrame(`sit${seat.dir === "any" ? a.dir : seat.dir}`)
        s.body.setY(2 - seat.lift)
        s.tag.setY(-HEAD_H - 4 - seat.lift + 3)
      } else {
        s.body.setFrame(`${a.dir}${walking ? a.stepFrame : 0}`)
        s.body.setY(2)
        s.tag.setY(-HEAD_H - 4)
      }
      s.body.setAlpha(a.status === "away" ? 0.6 : 1)
      s.root.setPosition(Math.round((a.rx + 0.5) * TILE), Math.round((a.ry + 1) * TILE))
      s.root.setDepth(10 + a.ry)
      this.drawTag(s, a)

      if (a.hand && !(a.reaction && now - a.reaction.at < REACTION_MS)) {
        if (s.emoji.text !== "✋") s.emoji.setText("✋")
        s.emoji.setY(-HEAD_H - 14 + Math.sin(now / 250) * 2)
        s.emoji.setAlpha(1)
      } else if (a.reaction && now - a.reaction.at < REACTION_MS) {
        const k = (now - a.reaction.at) / REACTION_MS
        s.emoji.setText(a.reaction.emoji)
        s.emoji.setY(-HEAD_H - 14 - k * 22)
        s.emoji.setAlpha(1 - Math.max(0, k - 0.7) / 0.3)
      } else if (s.emoji.text) {
        a.reaction = null
        s.emoji.setText("")
      }
    }

    // Camera
    const cam = this.cameras.main
    if (cam.zoom !== store.zoom) cam.setZoom(store.zoom)
    // Build mode frees the camera (right-drag to pan); leaving it follows you again.
    const building = store.build.open
    if (building !== this.wasBuilding) {
      this.wasBuilding = building
      if (building) { cam.stopFollow(); this.following = null }
      this.dragStart = null
      this.pan = null
    }
    this.updateBuildPreview()
    if (me && !building && this.following !== me.id) {
      const s = this.sprites.get(me.id)
      if (s) {
        cam.startFollow(s.root, true, 0.12, 0.12, 0, HEAD_H / 2)
        this.following = me.id
      }
    }
    if (store.recenter) {
      store.recenter = false
      const s = me && this.sprites.get(me.id)
      if (s) cam.centerOn(s.root.x, s.root.y)
    }
    const v = cam.worldView
    store.view = { x: v.x, y: v.y, w: v.width, h: v.height }

    this.updateDim(me && !building ? areaAt(me.x, me.y) : null)
    void time
  }
}

export function PhaserGame() {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const game = new Phaser.Game({
      // Always render with WebGL.
      type: Phaser.WEBGL,
      parent: hostRef.current!,
      pixelArt: true,
      roundPixels: true,
      backgroundColor: "#c4e6b8",
      scale: { mode: Phaser.Scale.RESIZE, width: "100%", height: "100%" },
      scene: [OfficeScene],
      banner: false,
      audio: { noAudio: true },
      input: { keyboard: false },
    })
    return () => game.destroy(true)
  }, [])

  return <div ref={hostRef} className="game-host" aria-label="Office map" />
}

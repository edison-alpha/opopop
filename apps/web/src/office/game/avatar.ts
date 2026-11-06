// Layered chibi avatars (original to OPPERA): skin, hair, facial hair, top,
// jacket, bottom, shoes, hat, glasses and an accessory, in four directions.
import type { AvatarLook, Dir } from "@/shared/protocol"
import { INK, SHADOW, box, disc, ell, frame, line, obox, rect, rrect, tri, type Ctx } from "./pixel"

export const SKIN_TONES = ["#ffe3d1", "#ffdbc4", "#f1c27d", "#e0ac69", "#c68642", "#a86b3c", "#8d5524", "#5c3a21"]
export const HAIR_COLORS = [
  "#1f1a17", "#4a2f1d", "#8b5a2b", "#c48a4a", "#d9b26f", "#f1dca0",
  "#c0392b", "#e8e8e8", "#7f8c8d", "#5b8def", "#e66fb0", "#7cc86a",
]
/** Clothing and accessory colors. */
export const PALETTE = [
  "#e53e3e", "#f6993f", "#f6c445", "#6b7a2f", "#38a169", "#1d7a6a", "#33b5f0", "#667eea", "#9f5fd6",
  "#ed64a6", "#f56c8a", "#b9774a", "#e8c9a0", "#ffffff", "#9aa0b4", "#2d2f3a",
]
export const SHIRT_COLORS = PALETTE
export const PANTS_COLORS = ["#2c3e66", "#3a3a48", "#6b4f3a", "#2d6a4f", "#5a5a6e", "#1f1f2a", "#b9774a", "#e8c9a0", "#667eea", "#9aa0b4"]

export const AVATAR_STYLES = {
  hairStyle: ["Short", "Long", "Bun", "Spiky", "Bob", "Ponytail", "Curly", "Buzz"],
  facialHair: ["None", "Stubble", "Mustache", "Beard", "Goatee"],
  top: ["T-shirt", "Shirt", "Hoodie", "Tank top", "Striped"],
  jacket: ["None", "Blazer", "Cardigan", "Vest", "Coat"],
  bottom: ["Pants", "Shorts", "Skirt"],
  hat: ["None", "Cap", "Beanie", "Bucket hat", "Headband", "Beret", "Hard hat"],
  glasses: ["None", "Round", "Square", "Sunglasses"],
  other: ["None", "Headphones", "Scarf", "Backpack", "Tie", "ID badge"],
} as const

export const AVATAR_DEFAULTS = {
  jacketColor: "#2d2f3a",
  shoes: "#2d2f3a",
  hatColor: "#e53e3e",
  glassesColor: "#2d2f3a",
  otherColor: "#33b5f0",
}

const DARK = "rgba(0,0,0,0.2)"
const LIGHT = "rgba(255,255,255,0.32)"

type Shape = [x: number, y: number, w: number, h: number, r: number]

/**
 * Draws a chibi avatar. (cx, by) is the bottom-center of its tile in canvas px.
 * `step` alternates 0/1 while walking. Hats reach about 46px above `by`.
 */
export function drawAvatar(
  ctx: Ctx,
  look: AvatarLook,
  cx: number,
  by: number,
  dir: Dir,
  step: number,
  alpha = 1,
  pose: "stand" | "sit" = "stand",
) {
  ctx.save()
  ctx.globalAlpha = alpha
  cx = Math.round(cx)
  by = Math.round(by)
  const sit = pose === "sit"
  if (sit) step = 0
  // Seated: the upper body sinks onto the hips and the legs fold forward.
  const bob = step ? -1 : sit ? 3 : 0
  const side = dir === "left" || dir === "right"
  const front = dir === "down"
  const back = dir === "up"
  const left = dir === "left"

  const skin = look.skin
  const hair = look.hair
  const top = look.top ?? 0
  const jacket = look.jacket ?? 0
  const jc = look.jacketColor ?? AVATAR_DEFAULTS.jacketColor
  const bottom = look.bottom ?? 0
  const other = look.other ?? 0
  const oc = look.otherColor ?? AVATAR_DEFAULTS.otherColor

  ell(ctx, cx, by - 3, 9, 3, SHADOW)

  const ty = by - 21 + bob // torso top

  // Backpack seen from the side sits behind the body
  if (other === 3 && side) {
    obox(ctx, left ? cx + 4 : cx - 10, ty + 1, 6, 11, oc)
    rect(ctx, left ? cx + 5 : cx - 9, ty + 7, 4, 3, DARK)
  }

  const legC = bottom === 0 ? look.pants : skin
  const thighC = bottom === 2 ? skin : look.pants
  const shoe = look.shoes ?? AVATAR_DEFAULTS.shoes
  if (sit) {
    // Folded legs: thighs toward the viewer / facing side, shins down to the floor.
    if (front) {
      box(ctx, cx - 7, by - 10, 14, 5, thighC)
      rect(ctx, cx, by - 9, 1, 3, DARK)
      box(ctx, cx - 6, by - 6, 5, 4, legC); box(ctx, cx + 1, by - 6, 5, 4, legC)
      box(ctx, cx - 6, by - 3, 5, 3, shoe); box(ctx, cx + 1, by - 3, 5, 3, shoe)
      if (bottom === 2) { obox(ctx, cx - 9, by - 12, 18, 6, look.pants); rect(ctx, cx - 8, by - 11, 16, 1, LIGHT) }
    } else if (side) {
      box(ctx, left ? cx - 10 : cx - 2, by - 10, 12, 5, thighC)
      box(ctx, left ? cx - 10 : cx + 5, by - 6, 5, 4, legC)
      box(ctx, left ? cx - 12 : cx + 5, by - 3, 7, 3, shoe)
      if (bottom === 2) obox(ctx, left ? cx - 10 : cx - 4, by - 12, 14, 6, look.pants)
    } else {
      box(ctx, cx - 7, by - 10, 14, 4, thighC)
    }
  } else {
    // Legs
    const swA = side ? 0 : step ? 2 : 0
    const swB = side ? 0 : step ? 0 : 2
    box(ctx, cx - 6, by - 11 + bob, 6, 9 - swA, legC)
    box(ctx, cx, by - 11 + bob, 6, 9 - swB, legC)
    if (bottom === 1) box(ctx, cx - 7, by - 11 + bob, 14, 5, look.pants)
    if (bottom === 2) { obox(ctx, cx - 9, by - 12 + bob, 18, 7, look.pants); rect(ctx, cx - 8, by - 11 + bob, 16, 1, LIGHT) }

    // Shoes
    box(ctx, cx - 6, by - 5 - swA, 6, 4, shoe)
    box(ctx, cx, by - 5 - swB, 6, 4, shoe)
  }

  // Torso + top
  obox(ctx, cx - 8, ty, 16, 12, look.shirt)
  rect(ctx, cx - 7, ty + 1, 14, 2, LIGHT)
  rect(ctx, cx - 7, ty + 9, 14, 2, DARK)
  if (top === 1) {
    if (front) { rect(ctx, cx - 4, ty, 3, 2, "#ffffff"); rect(ctx, cx + 1, ty, 3, 2, "#ffffff"); rect(ctx, cx, ty + 2, 1, 8, DARK) }
    else if (back) rect(ctx, cx - 4, ty, 8, 1, "#ffffff")
    else rect(ctx, left ? cx - 5 : cx + 1, ty, 4, 2, "#ffffff")
  } else if (top === 2) {
    if (back) { obox(ctx, cx - 6, ty - 2, 12, 6, look.shirt); rect(ctx, cx - 5, ty + 2, 10, 1, DARK) }
    else {
      rect(ctx, cx - 6, ty, 12, 2, DARK)
      if (front) { rect(ctx, cx - 5, ty + 6, 10, 3, DARK); rect(ctx, cx - 2, ty + 2, 1, 3, "#ffffff"); rect(ctx, cx + 1, ty + 2, 1, 3, "#ffffff") }
    }
  } else if (top === 3) {
    rect(ctx, cx - 7, ty + 1, 3, 3, skin); rect(ctx, cx + 4, ty + 1, 3, 3, skin)
  } else if (top === 4) {
    for (let i = 0; i < 3; i++) rect(ctx, cx - 7, ty + 3 + i * 3, 14, 1, LIGHT)
  }

  // Jacket
  if (jacket) {
    const coat = jacket === 4
    if (back) {
      rect(ctx, cx - 7, ty + 1, 14, 10, jc)
      if (coat) obox(ctx, cx - 8, ty + 10, 16, 6, jc)
    } else if (front) {
      const w = jacket === 2 ? 4 : 5
      rect(ctx, cx - 7, ty + 1, w, 10, jc); rect(ctx, cx + 7 - w, ty + 1, w, 10, jc)
      if (jacket === 1 || coat) { rect(ctx, cx - 7 + w, ty + 1, 1, 4, DARK); rect(ctx, cx + 6 - w, ty + 1, 1, 4, DARK) }
      if (jacket === 2) { rect(ctx, cx - 4, ty + 4, 1, 1, "#ffffff"); rect(ctx, cx - 4, ty + 7, 1, 1, "#ffffff") }
      if (coat) { obox(ctx, cx - 8, ty + 10, 6, 6, jc); obox(ctx, cx + 2, ty + 10, 6, 6, jc) }
    } else {
      rect(ctx, left ? cx - 3 : cx - 7, ty + 1, 10, 10, jc)
      if (coat) obox(ctx, left ? cx - 4 : cx - 8, ty + 10, 12, 6, jc)
    }
  }

  // Torso accessories
  if (other === 2) { box(ctx, cx - 8, ty - 1, 16, 4, oc); if (front) box(ctx, cx + 2, ty + 2, 4, 7, oc) }
  if (other === 4 && front) { rect(ctx, cx - 1, ty + 1, 2, 1, INK); rect(ctx, cx - 1, ty + 2, 2, 6, oc); rect(ctx, cx - 2, ty + 7, 4, 2, oc) }
  if (other === 5 && front) {
    line(ctx, cx - 5, ty, cx - 1, ty + 5, oc); line(ctx, cx + 4, ty, cx + 1, ty + 5, oc)
    obox(ctx, cx - 2, ty + 5, 5, 6, "#ffffff"); rect(ctx, cx - 1, ty + 7, 3, 1, oc)
  }
  if (other === 3) {
    if (back) { obox(ctx, cx - 7, ty - 1, 14, 13, oc); rect(ctx, cx - 5, ty + 6, 10, 4, DARK); rect(ctx, cx - 6, ty, 12, 2, LIGHT) }
    else if (front) { rect(ctx, cx - 6, ty + 1, 2, 10, oc); rect(ctx, cx + 4, ty + 1, 2, 10, oc) }
  }

  // Seated facing the viewer: the lap sits in front of the torso
  if (sit && front) {
    box(ctx, cx - 7, by - 9, 14, 4, thighC)
    rect(ctx, cx, by - 8, 1, 2, DARK)
    if (bottom === 2) { obox(ctx, cx - 9, by - 10, 18, 5, look.pants); rect(ctx, cx - 8, by - 9, 16, 1, LIGHT) }
  }

  // Arms
  const armC = jacket === 1 || jacket === 2 || jacket === 4 ? jc : top === 3 ? skin : look.shirt
  if (side) {
    const ax = left ? cx - 2 + (step ? 3 : -2) : cx - 3 + (step ? -3 : 2)
    obox(ctx, ax, ty + 2, 5, 9, armC)
    rect(ctx, ax + 1, ty + 9, 3, 2, skin)
  } else {
    obox(ctx, cx - 11, ty + 1 + (step ? 1 : 0), 4, 9, armC)
    obox(ctx, cx + 7, ty + 1 + (step ? 0 : 1), 4, 9, armC)
    rect(ctx, cx - 10, ty + 8 + (step ? 1 : 0), 2, 2, skin)
    rect(ctx, cx + 8, ty + 8 + (step ? 0 : 1), 2, 2, skin)
  }

  // Head
  const hy = by - 30 + bob
  rrect(ctx, cx - 9, hy - 9, 18, 18, 6, INK)
  rrect(ctx, cx - 8, hy - 8, 16, 16, 5, skin)

  // Hair: collect shapes, then draw an ink pass and a fill pass
  const style = ((look.hairStyle % 8) + 8) % 8
  const hat = look.hat ?? 0
  const shapes: Shape[] = []
  const discs: [number, number, number][] = []
  const R = (x: number, y: number, w: number, h: number, r = 0) => shapes.push([x, y, w, h, r])
  if (style !== 7 && style !== 6) {
    if (back) R(cx - 9, hy - 10, 18, 17, 6)
    else { R(cx - 9, hy - 10, 18, 9, 5); R(cx - 9, hy - 5, 18, 4) }
  }
  switch (style) {
    case 0: case 2: case 3: case 5:
      if (front) { R(cx - 9, hy - 3, 3, 5); R(cx + 6, hy - 3, 3, 5); R(cx - 4, hy - 2, 5, 2) }
      else if (side) R(left ? cx + 1 : cx - 9, hy - 3, 8, 8)
      break
    case 1:
      if (front) { R(cx - 10, hy - 3, 3, 14); R(cx + 7, hy - 3, 3, 14); R(cx - 4, hy - 2, 5, 2) }
      else if (side) R(left ? cx + 1 : cx - 10, hy - 3, 9, 14)
      else R(cx - 9, hy + 2, 18, 9)
      break
    case 4:
      if (front) { R(cx - 10, hy - 4, 4, 11, 1); R(cx + 6, hy - 4, 4, 11, 1); R(cx - 8, hy - 4, 16, 3) }
      else if (side) R(left ? cx - 1 : cx - 9, hy - 4, 10, 11, 1)
      else R(cx - 10, hy - 4, 20, 11, 2)
      break
    case 6:
      for (const [dx, dy, r] of [[-7, -6, 5], [0, -9, 5], [7, -6, 5], [-9, 1, 4], [9, 1, 4]] as const) discs.push([cx + dx, hy + dy, r])
      if (back) for (const [dx, dy, r] of [[0, 0, 7], [-5, 4, 5], [5, 4, 5]] as const) discs.push([cx + dx, hy + dy, r])
      if (side) discs.push([left ? cx + 6 : cx - 6, hy, 6])
      break
    case 7:
      if (back) R(cx - 8, hy - 8, 16, 13, 5)
      else R(cx - 8, hy - 8, 16, 5, 4)
      break
  }
  if (style === 2 && !hat) discs.push([cx, hy - 11, 4])
  if (style === 5) {
    if (back) R(cx - 2, hy + 3, 4, 10, 1)
    else if (side) R(left ? cx + 8 : cx - 11, hy - 1, 3, 10, 1)
  }
  for (const [x, y, w, h, r] of shapes) r ? rrect(ctx, x - 1, y - 1, w + 2, h + 2, r + 1, INK) : rect(ctx, x - 1, y - 1, w + 2, h + 2, INK)
  for (const [x, y, r] of discs) disc(ctx, x, y, r + 1, INK)
  for (const [x, y, w, h, r] of shapes) r ? rrect(ctx, x, y, w, h, r, hair) : rect(ctx, x, y, w, h, hair)
  for (const [x, y, r] of discs) disc(ctx, x, y, r, hair)
  if (style === 3 && !hat) {
    for (let i = -6; i <= 6; i += 4) tri(ctx, cx + i, hy - 15, 6, 3, INK)
    for (let i = -6; i <= 6; i += 4) tri(ctx, cx + i, hy - 14, 5, 2, hair)
    rect(ctx, cx - 8, hy - 10, 16, 2, hair)
  }
  if (!back && style !== 7) rect(ctx, cx - 5, hy - 8, 4, 1, LIGHT)

  // Face
  if (front) {
    rect(ctx, cx - 4, hy + 1, 2, 3, INK)
    rect(ctx, cx + 2, hy + 1, 2, 3, INK)
    rect(ctx, cx - 6, hy + 4, 2, 1, "rgba(240,110,110,0.5)")
    rect(ctx, cx + 4, hy + 4, 2, 1, "rgba(240,110,110,0.5)")
  } else if (side) {
    rect(ctx, left ? cx - 6 : cx + 4, hy + 1, 2, 3, INK)
  }

  // Facial hair
  const fh = look.facialHair ?? 0
  if (fh && !back) {
    const fx = side ? (left ? cx - 8 : cx) : cx - 8
    const fw = side ? 8 : 16
    if (fh === 1) for (let i = 0; i < fw; i += 2) { rect(ctx, fx + i, hy + 5, 1, 1, hair); rect(ctx, fx + i + 1, hy + 7, 1, 1, hair) }
    if (fh === 2) rect(ctx, front ? cx - 3 : left ? cx - 7 : cx + 3, hy + 5, front ? 6 : 4, 1, hair)
    if (fh === 3) { rrect(ctx, fx, hy + 3, fw, 6, 3, hair); if (front) rect(ctx, cx - 2, hy + 5, 4, 1, skin) }
    if (fh === 4) rect(ctx, front ? cx - 2 : left ? cx - 6 : cx + 2, hy + 6, 4, 3, hair)
  }

  // Glasses
  const gl = look.glasses ?? 0
  const gc = look.glassesColor ?? AVATAR_DEFAULTS.glassesColor
  if (gl && front) {
    if (gl === 3) {
      rect(ctx, cx - 6, hy, 5, 4, gc); rect(ctx, cx + 1, hy, 5, 4, gc); rect(ctx, cx - 1, hy + 1, 2, 1, gc)
      rect(ctx, cx - 5, hy + 1, 1, 1, LIGHT); rect(ctx, cx + 2, hy + 1, 1, 1, LIGHT)
    } else {
      const w = gl === 2 ? 6 : 5
      const gy = gl === 2 ? hy : hy - 1
      frame(ctx, cx - 1 - w, gy, w, 5, gc); frame(ctx, cx + 1, gy, w, 5, gc); rect(ctx, cx - 1, hy + 1, 2, 1, gc)
    }
  } else if (gl && side) {
    const ex = left ? cx - 8 : cx + 3
    if (gl === 3) rect(ctx, ex, hy, 5, 4, gc)
    else frame(ctx, ex, hy - 1, 5, 5, gc)
    rect(ctx, left ? ex + 5 : ex - 4, hy + 1, 4, 1, gc)
  }

  // Hat
  const hc = look.hatColor ?? AVATAR_DEFAULTS.hatColor
  switch (hat) {
    case 1:
      rrect(ctx, cx - 10, hy - 13, 20, 10, 6, INK); rrect(ctx, cx - 9, hy - 12, 18, 9, 5, hc); rect(ctx, cx - 6, hy - 11, 4, 1, LIGHT)
      if (front) { rect(ctx, cx - 9, hy - 4, 18, 3, INK); rect(ctx, cx - 8, hy - 4, 16, 2, hc); rect(ctx, cx - 8, hy - 3, 16, 1, DARK) }
      else if (side) { const bx = left ? cx - 14 : cx + 4; rect(ctx, bx, hy - 5, 10, 3, INK); rect(ctx, bx + 1, hy - 5, 8, 2, hc) }
      else rect(ctx, cx - 3, hy - 5, 6, 2, DARK)
      break
    case 2:
      rrect(ctx, cx - 10, hy - 14, 20, 12, 7, INK); rrect(ctx, cx - 9, hy - 13, 18, 11, 6, hc)
      rect(ctx, cx - 9, hy - 5, 18, 3, DARK)
      for (let i = -7; i <= 7; i += 3) rect(ctx, cx + i, hy - 11, 1, 5, DARK)
      disc(ctx, cx, hy - 14, 3, INK); disc(ctx, cx, hy - 14, 2, hc)
      break
    case 3:
      rrect(ctx, cx - 8, hy - 14, 16, 9, 4, INK); rrect(ctx, cx - 7, hy - 13, 14, 8, 3, hc)
      rect(ctx, cx - 12, hy - 6, 24, 4, INK); rect(ctx, cx - 11, hy - 5, 22, 2, hc); rect(ctx, cx - 7, hy - 7, 14, 1, DARK)
      break
    case 4:
      rect(ctx, cx - 10, hy - 8, 20, 4, INK); rect(ctx, cx - 9, hy - 7, 18, 2, hc)
      break
    case 5:
      ell(ctx, cx - 1, hy - 9, 12, 5, INK); ell(ctx, cx - 1, hy - 9, 11, 4, hc); rect(ctx, cx - 4, hy - 11, 5, 1, LIGHT)
      rect(ctx, cx - 1, hy - 15, 2, 2, INK)
      break
    case 6:
      rrect(ctx, cx - 10, hy - 15, 20, 11, 7, INK); rrect(ctx, cx - 9, hy - 14, 18, 10, 6, hc)
      rect(ctx, cx - 1, hy - 14, 2, 9, LIGHT)
      rect(ctx, cx - 12, hy - 5, 24, 3, INK); rect(ctx, cx - 11, hy - 5, 22, 2, hc)
      break
  }

  // Headphones go over everything on the head
  if (other === 1) {
    rect(ctx, cx - 10, hy - 12, 20, 3, INK); rect(ctx, cx - 9, hy - 11, 18, 1, oc)
    if (side) obox(ctx, left ? cx : cx - 5, hy - 3, 5, 8, oc)
    else { obox(ctx, cx - 12, hy - 3, 5, 8, oc); obox(ctx, cx + 7, hy - 3, 5, 8, oc) }
  }
  ctx.restore()
}

export function randomLook(): AvatarLook {
  const pick = <V,>(a: readonly V[]) => a[Math.floor(Math.random() * a.length)]
  const some = (p: number, n: number) => (Math.random() < p ? 1 + Math.floor(Math.random() * (n - 1)) : 0)
  return {
    skin: pick(SKIN_TONES),
    hair: pick(HAIR_COLORS.slice(0, 7)),
    hairStyle: Math.floor(Math.random() * AVATAR_STYLES.hairStyle.length),
    shirt: pick(PALETTE),
    pants: pick(PANTS_COLORS),
    top: Math.floor(Math.random() * AVATAR_STYLES.top.length),
    jacket: some(0.35, AVATAR_STYLES.jacket.length),
    jacketColor: pick(PALETTE),
    bottom: Math.random() < 0.7 ? 0 : 1 + Math.floor(Math.random() * 2),
    shoes: pick(["#2d2f3a", "#ffffff", "#b9774a", "#e53e3e", "#667eea"]),
    facialHair: some(0.2, AVATAR_STYLES.facialHair.length),
    hat: some(0.2, AVATAR_STYLES.hat.length),
    hatColor: pick(PALETTE),
    glasses: some(0.3, AVATAR_STYLES.glasses.length),
    glassesColor: "#2d2f3a",
    other: some(0.3, AVATAR_STYLES.other.length),
    otherColor: pick(PALETTE),
  }
}

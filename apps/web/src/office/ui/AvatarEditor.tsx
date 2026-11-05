"use client"
import type { AvatarLook, Dir } from "@/shared/protocol"
import { Download, RotateCcw, RotateCw, Shuffle } from "./icons"
import { useState } from "react"
import { AVATAR_DEFAULTS, AVATAR_STYLES } from "../game/avatar"
import { HAIR_COLORS, PALETTE, SKIN_TONES, randomLook } from "../game/art"
import { AvatarPreview, avatarPng } from "./AvatarPreview"

const ROTATION: Dir[] = ["down", "left", "up", "right"]

type StyleKey = keyof typeof AVATAR_STYLES
type ColorKey = "skin" | "hair" | "shirt" | "pants" | "shoes" | "jacketColor" | "hatColor" | "glassesColor" | "otherColor"

interface Category {
  id: string
  label: string
  styleKey?: StyleKey
  colorKey: ColorKey
  colors: readonly string[]
  thumb: "head" | "full"
  /** Style picked automatically when a color is chosen while the layer is off. */
  onColorStyle?: number
}

const CATEGORIES: Category[] = [
  { id: "skin", label: "Skin", colorKey: "skin", colors: SKIN_TONES, thumb: "head" },
  { id: "hair", label: "Hair", styleKey: "hairStyle", colorKey: "hair", colors: HAIR_COLORS, thumb: "head" },
  { id: "facialHair", label: "Facial hair", styleKey: "facialHair", colorKey: "hair", colors: HAIR_COLORS, thumb: "head" },
  { id: "top", label: "Top", styleKey: "top", colorKey: "shirt", colors: PALETTE, thumb: "full" },
  { id: "jacket", label: "Jacket", styleKey: "jacket", colorKey: "jacketColor", colors: PALETTE, thumb: "full", onColorStyle: 1 },
  { id: "bottom", label: "Bottom", styleKey: "bottom", colorKey: "pants", colors: PALETTE, thumb: "full" },
  { id: "shoes", label: "Shoes", colorKey: "shoes", colors: PALETTE, thumb: "full" },
  { id: "hat", label: "Hat", styleKey: "hat", colorKey: "hatColor", colors: PALETTE, thumb: "head", onColorStyle: 1 },
  { id: "glasses", label: "Glasses", styleKey: "glasses", colorKey: "glassesColor", colors: PALETTE, thumb: "head", onColorStyle: 1 },
  { id: "other", label: "Other", styleKey: "other", colorKey: "otherColor", colors: PALETTE, thumb: "full", onColorStyle: 1 },
]

const styleOf = (look: AvatarLook, k: StyleKey) => (look[k] as number | undefined) ?? 0
const colorOf = (look: AvatarLook, k: ColorKey) =>
  (look[k] as string | undefined) ?? (AVATAR_DEFAULTS as Record<string, string>)[k] ?? "#000000"

/**
 * Full avatar customizer: category list, option grid with live thumbnails and
 * colour swatches, and a preview stage you can rotate, randomize or download.
 */
export function AvatarEditor({
  look,
  onChange,
  name,
}: {
  look: AvatarLook
  onChange: (l: AvatarLook) => void
  name?: string
}) {
  const [rot, setRot] = useState(0)
  const [catId, setCatId] = useState("hair")
  const cat = CATEGORIES.find((c) => c.id === catId)!
  const set = (patch: Partial<AvatarLook>) => onChange({ ...look, ...patch })

  const options: { key: string; label: string; look: AvatarLook; selected: boolean; apply: () => void }[] = cat.styleKey
    ? AVATAR_STYLES[cat.styleKey].map((label, i) => ({
        key: label,
        label,
        look: { ...look, [cat.styleKey!]: i },
        selected: styleOf(look, cat.styleKey!) === i,
        apply: () => set({ [cat.styleKey!]: i }),
      }))
    : cat.colors.map((c) => ({
        key: c,
        label: c,
        look: { ...look, [cat.colorKey]: c },
        selected: colorOf(look, cat.colorKey) === c,
        apply: () => set({ [cat.colorKey]: c }),
      }))

  const pickColor = (c: string) => {
    const patch: Partial<AvatarLook> = { [cat.colorKey]: c }
    if (cat.styleKey && cat.onColorStyle && styleOf(look, cat.styleKey) === 0) Object.assign(patch, { [cat.styleKey]: cat.onColorStyle })
    set(patch)
  }

  const download = () => {
    const a = document.createElement("a")
    a.href = avatarPng(look)
    a.download = `${(name || "avatar").replace(/[^\w-]+/g, "_")}.png`
    a.click()
  }

  return (
    <div className="ae">
      <nav className="ae-cats" aria-label="Avatar parts">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`ae-cat ${c.id === catId ? "is-active" : ""}`}
            aria-pressed={c.id === catId}
            onClick={() => setCatId(c.id)}
          >
            <span className="ae-cat-icon">
              <AvatarPreview look={look} size={24} crop={c.thumb} />
            </span>
            {c.label}
          </button>
        ))}
      </nav>

      <div className="ae-picker">
        <div className="ae-grid" role="radiogroup" aria-label={cat.label}>
          {options.map((o) => (
            <button
              key={o.key}
              type="button"
              role="radio"
              aria-checked={o.selected}
              aria-label={o.label}
              title={o.label}
              className={`ae-opt ${o.selected ? "is-selected" : ""}`}
              onClick={o.apply}
            >
              <AvatarPreview look={o.look} size={56} crop={cat.thumb} />
              {cat.styleKey && <span className="ae-opt-label">{o.label}</span>}
            </button>
          ))}
        </div>
        <div className="ae-colors" role="radiogroup" aria-label={`${cat.label} color`}>
          {cat.colors.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={colorOf(look, cat.colorKey) === c}
              aria-label={c}
              className={`ae-swatch ${colorOf(look, cat.colorKey) === c ? "is-selected" : ""}`}
              style={{ background: c }}
              onClick={() => pickColor(c)}
            />
          ))}
        </div>
      </div>

      <div className="ae-stage">
        <button type="button" className="ae-stage-btn ae-download" aria-label="Download avatar image" title="Download PNG" onClick={download}>
          <Download size={16} />
        </button>
        <div className="ae-stage-figure">
          {name && (
            <span className="ae-tag">
              <span className="ae-tag-dot" />
              {name.length > 18 ? name.slice(0, 17) + "…" : name}
            </span>
          )}
          <AvatarPreview look={look} size={150} dir={ROTATION[rot]} animate />
        </div>
        <div className="ae-stage-row">
          <button type="button" className="ae-stage-btn" aria-label="Rotate left" onClick={() => setRot((rot + 3) % 4)}>
            <RotateCcw size={16} />
          </button>
          <button type="button" className="ae-stage-btn" aria-label="Rotate right" onClick={() => setRot((rot + 1) % 4)}>
            <RotateCw size={16} />
          </button>
          <span className="grow" />
          <button type="button" className="ae-stage-btn" aria-label="Randomize" title="Randomize" onClick={() => onChange(randomLook())}>
            <Shuffle size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

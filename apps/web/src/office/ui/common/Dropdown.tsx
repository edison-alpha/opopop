"use client"
import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from "react"
import { createPortal } from "react-dom"
import { Check, ChevronDown } from "../common/icons"

export interface DropdownOption {
  value: string
  label: string
  disabled?: boolean
  group?: string
}

interface DropdownProps {
  label: string
  value: string
  options: DropdownOption[]
  onChange: (value: string) => void
  className?: string
  disabled?: boolean
  placeholder?: string
}

export function Dropdown({ label, value, options, onChange, className = "", disabled = false, placeholder = "Select…" }: DropdownProps) {
  const id = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef({ text: "", at: 0 })
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [position, setPosition] = useState<CSSProperties>({ visibility: "hidden" })
  const selected = options.find((o) => o.value === value)
  const enabled = options.map((o, index) => o.disabled ? -1 : index).filter((index) => index >= 0)

  const show = (last = false) => {
    if (disabled || !enabled.length) return
    const index = options.findIndex((o) => o.value === value && !o.disabled)
    setActive(index >= 0 ? index : enabled[last ? enabled.length - 1 : 0])
    setOpen(true)
  }

  useEffect(() => {
    if (!open || !triggerRef.current) return
    const updatePosition = () => {
      const trigger = triggerRef.current!
      const rect = trigger.getBoundingClientRect()
      const styles = getComputedStyle(trigger)
      const width = Math.min(Math.max(rect.width, 220), window.innerWidth - 24)
      const below = window.innerHeight - rect.bottom - 18
      const above = rect.top - 18
      const flip = below < 200 && above > below
      const theme = Object.fromEntries(["--panel", "--text", "--text-2", "--muted", "--hover", "--border"].map((key) => [key, styles.getPropertyValue(key)]))
      setPosition({ ...theme, visibility: "visible", position: "fixed", width, left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)), top: flip ? undefined : rect.bottom + 6, bottom: flip ? window.innerHeight - rect.top + 6 : undefined, maxHeight: Math.max(40, Math.min(280, flip ? above : below)), colorScheme: styles.colorScheme })
    }
    const outside = (event: PointerEvent) => {
      const target = event.target as Node
      if (!triggerRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false)
    }
    updatePosition()
    document.addEventListener("pointerdown", outside)
    window.addEventListener("resize", updatePosition)
    window.addEventListener("scroll", updatePosition, true)
    return () => {
      document.removeEventListener("pointerdown", outside)
      window.removeEventListener("resize", updatePosition)
      window.removeEventListener("scroll", updatePosition, true)
    }
  }, [open])

  useEffect(() => {
    if (open) panelRef.current?.querySelector(`[data-option="${active}"]`)?.scrollIntoView({ block: "nearest" })
  }, [active, open])

  useEffect(() => { if (disabled) setOpen(false) }, [disabled])
  useEffect(() => {
    if (!open) return
    if (!enabled.length) setOpen(false)
    else if (!enabled.includes(active)) setActive(enabled[0])
  }, [open, active, options])

  const choose = (index: number) => {
    const option = options[index]
    if (!option || option.disabled) return
    onChange(option.value)
    setOpen(false)
    triggerRef.current?.focus()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Escape" && open) {
      event.preventDefault(); event.stopPropagation(); setOpen(false); return
    }
    if (event.key === "Tab") { setOpen(false); return }
    if (["ArrowDown", "ArrowUp", "Home", "End", "Enter", " "].includes(event.key)) {
      event.preventDefault()
      if (!open) {
        if (event.key === "Home" || event.key === "End") {
          if (enabled.length) { setActive(enabled[event.key === "End" ? enabled.length - 1 : 0]); setOpen(true) }
        } else show(event.key === "ArrowUp")
        return
      }
      if (event.key === "Enter" || event.key === " ") { choose(active); return }
      if (event.key === "Home") setActive(enabled[0])
      else if (event.key === "End") setActive(enabled[enabled.length - 1])
      else {
        const index = enabled.indexOf(active)
        setActive(enabled[(index + (event.key === "ArrowDown" ? 1 : -1) + enabled.length) % enabled.length])
      }
      return
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault()
      const now = Date.now()
      const search = searchRef.current
      search.text = (now - search.at < 700 ? search.text : "") + event.key.toLowerCase()
      search.at = now
      const index = options.findIndex((option) => !option.disabled && option.label.toLowerCase().startsWith(search.text))
      if (index >= 0) { setActive(index); setOpen(true) }
    }
  }

  return <span className="dropdown">
    <button ref={triggerRef} type="button" role="combobox" aria-label={label} aria-expanded={open} aria-haspopup="listbox" aria-controls={open ? `${id}-list` : undefined} aria-activedescendant={open ? `${id}-${active}` : undefined} disabled={disabled || !enabled.length} className={`dropdown-trigger ${className}`} onClick={() => open ? setOpen(false) : show()} onKeyDown={onKeyDown}>
      <span className="dropdown-value">{selected?.label ?? placeholder}</span><ChevronDown size={14} />
    </button>
    {open && createPortal(<div ref={panelRef} id={`${id}-list`} role="listbox" aria-label={label} className="dropdown-panel" style={position} onPointerDown={(e) => e.preventDefault()}>
      {options.map((option, index) => <div key={`${option.value}-${index}`}>
        {option.group && option.group !== options[index - 1]?.group && <div className="dropdown-group" role="presentation">{option.group}</div>}
        <div id={`${id}-${index}`} role="option" aria-selected={option.value === value} aria-disabled={option.disabled || undefined} data-option={index} className={`dropdown-option ${active === index ? "is-highlighted" : ""}`} onPointerMove={() => { if (!option.disabled) setActive(index) }} onClick={() => choose(index)}>
          <span className="dropdown-option-label">{option.label}</span><span className="dropdown-check">{option.value === value && <Check size={15} />}</span>
        </div>
      </div>)}
    </div>, document.body)}
  </span>
}

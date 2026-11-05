"use client"
import {
  AtSign,
  Bold,
  Code,
  Italic,
  Link2,
  List,
  ListOrdered,
  Paperclip,
  SendHorizontal,
  Smile,
  SquareCode,
  Strikethrough,
  TextQuote,
  X,
} from "./icons"
import { useEffect, useRef, useState } from "react"
import { sendChat } from "../session"
import { useOffice } from "../store"
import { LetterAvatar } from "./LetterAvatar"

const EMOJIS = "😀 😂 🥹 😊 😍 🤩 😎 🤔 😅 😭 😡 🥳 👍 👎 👏 🙌 🙏 💪 👋 ✋ 🎉 🔥 ✨ 💯 ❤️ 💙 💚 ✅ ❌ ⚡ ☕ 🍕 🚀 📅 📌 👀".split(" ")

/** Downscales an image file to a JPEG data URL small enough to send over the socket. */
async function toDataUrl(file: File, max = 900): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const c = document.createElement("canvas")
  c.width = Math.round(bitmap.width * scale)
  c.height = Math.round(bitmap.height * scale)
  c.getContext("2d")!.drawImage(bitmap, 0, 0, c.width, c.height)
  return c.toDataURL("image/jpeg", 0.82)
}

export function Composer({ conv, placeholder, compact = false }: { conv: string; placeholder: string; compact?: boolean }) {
  const office = useOffice()
  const [text, setText] = useState(office.drafts[conv] ?? "")
  const [image, setImage] = useState<string | null>(null)
  const [menu, setMenu] = useState<"emoji" | "mention" | null>(null)
  const [mentionQ, setMentionQ] = useState("")
  const ref = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setText(office.drafts[conv] ?? "")
    setImage(null)
    ref.current?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conv])

  // Persist drafts so they show up under "Drafts".
  useEffect(() => {
    const t = setTimeout(() => {
      const cur = office.drafts[conv] ?? ""
      if (text.trim() === cur.trim()) return
      if (text.trim()) office.drafts = { ...office.drafts, [conv]: text }
      else {
        const { [conv]: _, ...rest } = office.drafts
        office.drafts = rest
      }
      office.emit()
    }, 400)
    return () => clearTimeout(t)
  }, [text, conv, office])

  // Auto-grow
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(200, el.scrollHeight)}px`
  }, [text])

  const wrap = (before: string, after = before, fallback = "") => {
    const el = ref.current!
    const s = el.selectionStart
    const e = el.selectionEnd
    const sel = text.slice(s, e) || fallback
    const next = text.slice(0, s) + before + sel + after + text.slice(e)
    setText(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(s + before.length, s + before.length + sel.length)
    })
  }
  const prefixLines = (prefix: (i: number) => string) => {
    const el = ref.current!
    const s = text.lastIndexOf("\n", el.selectionStart - 1) + 1
    const e = el.selectionEnd
    const block = text.slice(s, e) || ""
    const replaced = block.split("\n").map((l, i) => prefix(i) + l).join("\n")
    setText(text.slice(0, s) + replaced + text.slice(e))
    requestAnimationFrame(() => el.focus())
  }
  const insert = (str: string) => {
    const el = ref.current!
    const s = el.selectionStart
    setText(text.slice(0, s) + str + text.slice(el.selectionEnd))
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(s + str.length, s + str.length)
    })
  }

  const submit = () => {
    const t = text.trim()
    if (!t && !image) return
    if (conv === "nearby" && office.nearby.size === 0) {
      office.toast("Nobody is nearby. Walk up to someone to chat with them.")
      return
    }
    if (!conv.startsWith("#") && conv !== "nearby" && !office.players.has(conv)) {
      office.toast("This person has left the office.")
      return
    }
    sendChat(t, conv, image ?? undefined)
    setText("")
    setImage(null)
    setMenu(null)
  }

  const people = [...office.players.values()].filter(
    (p) => p.id !== office.meId && p.name.toLowerCase().includes(mentionQ.toLowerCase()),
  )

  return (
    <div className={`composer ${compact ? "is-compact" : ""}`}>
      {image && (
        <div className="composer-attachment">
          <img src={image} alt="Attachment preview" />
          <button className="icon-btn sm" aria-label="Remove attachment" onClick={() => setImage(null)}>
            <X size={14} />
          </button>
        </div>
      )}
      <textarea
        ref={ref}
        rows={1}
        value={text}
        maxLength={4000}
        placeholder={placeholder}
        onChange={(e) => {
          setText(e.target.value)
          const before = e.target.value.slice(0, e.target.selectionStart)
          const m = before.match(/@([\w.-]*)$/)
          if (m) {
            setMentionQ(m[1])
            setMenu("mention")
          } else if (menu === "mention") setMenu(null)
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            if (menu === "mention" && people[0]) {
              e.preventDefault()
              const el = ref.current!
              const before = text.slice(0, el.selectionStart).replace(/@([\w.-]*)$/, `@${people[0].name} `)
              setText(before + text.slice(el.selectionStart))
              setMenu(null)
              return
            }
            e.preventDefault()
            submit()
          }
          if (e.key === "Escape") {
            if (menu) setMenu(null)
            else (e.target as HTMLTextAreaElement).blur()
          }
          if ((e.ctrlKey || e.metaKey) && e.key === "b") { e.preventDefault(); wrap("**", "**", "bold") }
          if ((e.ctrlKey || e.metaKey) && e.key === "i") { e.preventDefault(); wrap("_", "_", "italic") }
        }}
        onPaste={async (e) => {
          const file = [...e.clipboardData.files].find((f) => f.type.startsWith("image/"))
          if (file) {
            e.preventDefault()
            setImage(await toDataUrl(file))
          }
        }}
      />
      <div className="composer-bar">
        <div className="composer-tools">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0]
              if (f) setImage(await toDataUrl(f))
              e.target.value = ""
            }}
          />
          <button className="tool" title="Attach image" aria-label="Attach image" onClick={() => fileRef.current?.click()}><Paperclip size={16} /></button>
          <button className="tool" title="Mention someone" aria-label="Mention" onClick={() => { insert("@"); setMentionQ(""); setMenu("mention") }}><AtSign size={16} /></button>
          <div className="tool-anchor">
            <button className="tool" title="Emoji" aria-label="Emoji" onClick={() => setMenu(menu === "emoji" ? null : "emoji")}><Smile size={16} /></button>
            {menu === "emoji" && (
              <div className="popover emoji-grid" role="menu">
                {EMOJIS.map((em) => (
                  <button key={em} role="menuitem" onClick={() => { insert(em); setMenu(null) }}>{em}</button>
                ))}
              </div>
            )}
            {menu === "mention" && (
              <div className="popover mention-menu" role="listbox">
                {people.length === 0 && <div className="menu-empty light">No matching people</div>}
                {people.slice(0, 6).map((p) => (
                  <button
                    key={p.id}
                    role="option"
                    className="mention-row"
                    onClick={() => {
                      const el = ref.current!
                      const pos = el.selectionStart
                      const before = text.slice(0, pos).replace(/@([\w.-]*)$/, `@${p.name} `)
                      setText(before + text.slice(pos))
                      setMenu(null)
                      requestAnimationFrame(() => el.focus())
                    }}
                  >
                    <LetterAvatar name={p.name} size={22} status={p.status} /> {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          {!compact && (
            <>
              <span className="tool-sep" />
              <button className="tool" title="Bold (Ctrl+B)" aria-label="Bold" onClick={() => wrap("**", "**", "bold")}><Bold size={16} /></button>
              <button className="tool" title="Italic (Ctrl+I)" aria-label="Italic" onClick={() => wrap("_", "_", "italic")}><Italic size={16} /></button>
              <button className="tool" title="Strikethrough" aria-label="Strikethrough" onClick={() => wrap("~~", "~~", "text")}><Strikethrough size={16} /></button>
              <button className="tool" title="Link" aria-label="Link" onClick={() => wrap("[", "](https://)", "link")}><Link2 size={16} /></button>
              <button className="tool" title="Numbered list" aria-label="Numbered list" onClick={() => prefixLines((i) => `${i + 1}. `)}><ListOrdered size={16} /></button>
              <button className="tool" title="Bulleted list" aria-label="Bulleted list" onClick={() => prefixLines(() => "- ")}><List size={16} /></button>
              <button className="tool" title="Quote" aria-label="Quote" onClick={() => prefixLines(() => "> ")}><TextQuote size={16} /></button>
              <button className="tool" title="Code" aria-label="Code" onClick={() => wrap("`", "`", "code")}><Code size={16} /></button>
              <button className="tool" title="Code block" aria-label="Code block" onClick={() => wrap("```\n", "\n```", "code")}><SquareCode size={16} /></button>
            </>
          )}
        </div>
        <button className="send-btn" aria-label="Send message" disabled={!text.trim() && !image} onClick={submit}>
          <SendHorizontal size={16} />
        </button>
      </div>
    </div>
  )
}

"use client"
// Small, safe markdown renderer for chat (no HTML injection): **bold**, _italic_,
// ~~strike~~, `code`, ```blocks```, [links](url), bare URLs, > quotes, lists, @mentions.
import { Fragment, type ReactNode } from "react"

const INLINE =
  /(`[^`]+`)|(\*\*[^*]+\*\*)|(~~[^~]+~~)|(_[^_]+_)|(\[[^\]]+\]\(https?:\/\/[^\s)]+\))|(https?:\/\/[^\s]+)|(@[\w.-]+(?: [A-Z][\w.-]*)?)/g

function inline(text: string, mentionNames: string[], key: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  let i = 0
  for (const m of text.matchAll(INLINE)) {
    const idx = m.index ?? 0
    if (idx > last) out.push(text.slice(last, idx))
    const tok = m[0]
    const k = `${key}-${i++}`
    if (m[1]) out.push(<code key={k}>{tok.slice(1, -1)}</code>)
    else if (m[2]) out.push(<strong key={k}>{inline(tok.slice(2, -2), mentionNames, k)}</strong>)
    else if (m[3]) out.push(<s key={k}>{inline(tok.slice(2, -2), mentionNames, k)}</s>)
    else if (m[4]) out.push(<em key={k}>{inline(tok.slice(1, -1), mentionNames, k)}</em>)
    else if (m[5]) {
      const label = tok.slice(1, tok.indexOf("]("))
      const href = tok.slice(tok.indexOf("](") + 2, -1)
      out.push(
        <a key={k} href={href} target="_blank" rel="noreferrer noopener">
          {label}
        </a>,
      )
    } else if (m[6]) {
      out.push(
        <a key={k} href={tok} target="_blank" rel="noreferrer noopener">
          {tok}
        </a>,
      )
    } else if (m[7]) {
      const name = tok.slice(1)
      const known = mentionNames.some((n) => n.toLowerCase().startsWith(name.toLowerCase()))
      out.push(known ? <span key={k} className="mention">{tok}</span> : tok)
    }
    last = idx + tok.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export function Markdown({ text, mentionNames = [] }: { text: string; mentionNames?: string[] }) {
  const blocks: ReactNode[] = []
  const lines = text.split("\n")
  let i = 0
  let n = 0
  while (i < lines.length) {
    const line = lines[i]
    const key = `b${n++}`
    if (line.startsWith("```")) {
      const body: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith("```")) body.push(lines[i++])
      i++
      blocks.push(<pre key={key}><code>{body.join("\n")}</code></pre>)
      continue
    }
    if (/^> /.test(line)) {
      const body: string[] = []
      while (i < lines.length && /^> /.test(lines[i])) body.push(lines[i++].slice(2))
      blocks.push(<blockquote key={key}>{body.map((b, j) => <Fragment key={j}>{inline(b, mentionNames, `${key}${j}`)}{j < body.length - 1 && <br />}</Fragment>)}</blockquote>)
      continue
    }
    if (/^(- |\* )/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^(- |\* )/.test(lines[i])) items.push(lines[i++].slice(2))
      blocks.push(<ul key={key}>{items.map((it, j) => <li key={j}>{inline(it, mentionNames, `${key}${j}`)}</li>)}</ul>)
      continue
    }
    if (/^\d+\. /.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\. /.test(lines[i])) items.push(lines[i++].replace(/^\d+\. /, ""))
      blocks.push(<ol key={key}>{items.map((it, j) => <li key={j}>{inline(it, mentionNames, `${key}${j}`)}</li>)}</ol>)
      continue
    }
    blocks.push(<p key={key}>{line ? inline(line, mentionNames, key) : " "}</p>)
    i++
  }
  return <div className="md">{blocks}</div>
}

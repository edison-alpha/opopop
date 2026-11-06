"use client"
import { useState } from "react"
import { Link2, X } from "../common/icons"

interface ConnectGoogleModalProps {
  initialIcsUrl: string
  isConnected: boolean
  onClose: () => void
  onSaveIcs: (url: string) => void
  onDisconnect: () => void
}

export function ConnectGoogleModal({
  initialIcsUrl,
  isConnected,
  onClose,
  onSaveIcs,
  onDisconnect,
}: ConnectGoogleModalProps) {
  const [icsInput, setIcsInput] = useState(initialIcsUrl)

  const handleSave = () => {
    onSaveIcs(icsInput)
    onClose()
  }

  const handleDisconnect = () => {
    onDisconnect()
    setIcsInput("")
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 className="modal-title">Connect Google Calendar</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px", margin: "16px 0" }}>
          <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>
            Sinkronkan jadwal meeting Anda dari Google Calendar ke dalam kantor virtual OPPERA.
          </p>

          <label className="field">
            <span className="field-label">Google Calendar iCal (.ics) Secret Address</span>
            <input
              className="input"
              placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
              value={icsInput}
              onChange={(e) => setIcsInput(e.target.value)}
            />
          </label>

          <div style={{ fontSize: "11px", color: "var(--muted)", lineHeight: 1.4 }}>
            💡 <strong>Cara dapatkan link iCal Google Calendar:</strong>
            <br />
            Buka Google Calendar di web ➜ Klik titik tiga di kalender Anda ➜ Settings and sharing ➜ Scroll ke bawah ke bagian <em>"Secret address in iCal format"</em> ➜ Salin link dan tempel di sini.
          </div>
        </div>

        <div className="modal-actions">
          {isConnected && (
            <button type="button" className="btn btn-ghost" onClick={handleDisconnect}>
              Disconnect
            </button>
          )}
          <button className="btn btn-blue" onClick={handleSave}>
            <Link2 size={16} /> Save &amp; Sync
          </button>
        </div>
      </div>
    </div>
  )
}

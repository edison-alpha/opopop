"use client"
import type { CalendarEvent } from "../../services/calendar"
import { Clock, DoorOpen, MapPin, X } from "../common/icons"

interface CalendarDetailModalProps {
  event: CalendarEvent
  onClose: () => void
  onWalkToRoom: (room?: string) => void
}

export function CalendarDetailModal({ event, onClose, onWalkToRoom }: CalendarDetailModalProps) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 className="modal-title">{event.title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", margin: "16px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--muted)" }}>
            <Clock size={16} />
            <span>
              {new Date(event.start).toLocaleString([], {
                dateStyle: "medium",
                timeStyle: event.allDay ? undefined : "short",
              })}{" "}
              -{" "}
              {new Date(event.end).toLocaleString([], {
                timeStyle: event.allDay ? undefined : "short",
              })}
            </span>
          </div>

          {event.room && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
              <MapPin size={16} />
              <span>
                Room: <strong>{event.room}</strong>
              </span>
            </div>
          )}

          {event.description && (
            <p
              style={{
                fontSize: "13px",
                color: "var(--text)",
                background: "var(--panel-2)",
                padding: "10px",
                borderRadius: "8px",
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {event.description}
            </p>
          )}

          <div style={{ fontSize: "11px", color: "var(--muted)" }}>
            Source: {event.source === "google" ? "Google Calendar" : "OPPERA Meeting"}
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
          {event.room && (
            <button className="btn btn-blue" onClick={() => onWalkToRoom(event.room)}>
              <DoorOpen size={16} /> Walk to room
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

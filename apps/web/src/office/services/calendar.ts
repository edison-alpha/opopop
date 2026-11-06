/**
 * Service sinkronisasi Kalender (Internal OPPERA Meeting + Google Calendar).
 * Menerapkan Clean Architecture: Mengabstraksi sumber data kalender (Google API, iCal, atau Local State).
 */
import type { Meeting } from "@/shared/protocol"
import { store } from "../store"

export interface CalendarEvent {
  id: string
  title: string
  start: number // ms timestamp
  end: number // ms timestamp
  allDay?: boolean
  room?: string
  description?: string
  source: "oppera" | "google"
  htmlLink?: string
  color?: string
}

const GCAL_TOKEN_KEY = "oppera.gcal.token"
const GCAL_ICS_KEY = "oppera.gcal.ics"

// Contoh event awal agar tampilan langsung hidup dan sesuai dengan screenshot
function getDefaultDemoEvents(): CalendarEvent[] {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const date = now.getDate()

  // Mulai dari awal minggu ini (Minggu)
  const dayOfWeek = now.getDay()
  const sundayDate = new Date(year, month, date - dayOfWeek)
  const sundayMs = sundayDate.getTime()

  return [
    {
      id: "demo-hackathon-1",
      title: "Meta Global AI Developer Hackathon, 12:00 AM",
      start: new Date(year, month, sundayDate.getDate(), 0, 0).getTime(),
      end: new Date(year, month, sundayDate.getDate() + 4, 23, 59).getTime(),
      allDay: true,
      room: "Boardroom",
      description: "Global AI Developer Hackathon submission & sprint week.",
      source: "google",
      color: "#3b82f6",
    },
    {
      id: "demo-hackathon-2",
      title: "Meta Global AI Developer Hackathon, 12:00 AM",
      start: new Date(year, month, sundayDate.getDate(), 0, 0).getTime(),
      end: new Date(year, month, sundayDate.getDate() + 4, 23, 59).getTime(),
      allDay: true,
      room: "Lounge",
      description: "Meta AI Hackathon hacking track & mentoring.",
      source: "google",
      color: "#0ea5e9",
    },
  ]
}

export class CalendarService {
  private googleToken: string | null = null
  private googleIcsUrl: string | null = null
  private externalEvents: CalendarEvent[] = []

  constructor() {
    if (typeof window !== "undefined") {
      this.googleToken = localStorage.getItem(GCAL_TOKEN_KEY)
      this.googleIcsUrl = localStorage.getItem(GCAL_ICS_KEY)
      this.externalEvents = getDefaultDemoEvents()
    }
  }

  get isConnected(): boolean {
    return !!(this.googleToken || this.googleIcsUrl)
  }

  get icsUrl(): string {
    return this.googleIcsUrl || ""
  }

  setIcsUrl(url: string) {
    this.googleIcsUrl = url.trim() || null
    if (this.googleIcsUrl) {
      localStorage.setItem(GCAL_ICS_KEY, this.googleIcsUrl)
      void this.syncIcsCalendar()
    } else {
      localStorage.removeItem(GCAL_ICS_KEY)
    }
    store.emit()
  }

  setGoogleToken(token: string) {
    this.googleToken = token
    localStorage.setItem(GCAL_TOKEN_KEY, token)
    void this.fetchGoogleEvents()
    store.emit()
  }

  disconnect() {
    this.googleToken = null
    this.googleIcsUrl = null
    localStorage.removeItem(GCAL_TOKEN_KEY)
    localStorage.removeItem(GCAL_ICS_KEY)
    this.externalEvents = getDefaultDemoEvents()
    store.emit()
  }

  /**
   * Mengambil event dari Google Calendar REST API v3 jika token OAuth tersedia.
   */
  async fetchGoogleEvents(timeMin?: Date, timeMax?: Date): Promise<CalendarEvent[]> {
    if (!this.googleToken) return this.externalEvents

    const min = (timeMin || new Date(Date.now() - 7 * 86400000)).toISOString()
    const max = (timeMax || new Date(Date.now() + 30 * 86400000)).toISOString()

    try {
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(
          min
        )}&timeMax=${encodeURIComponent(max)}`,
        {
          headers: { Authorization: `Bearer ${this.googleToken}` },
        }
      )

      if (!res.ok) {
        if (res.status === 401) {
          this.disconnect()
        }
        return this.externalEvents
      }

      const data = await res.json()
      const events: CalendarEvent[] = (data.items || []).map((item: any) => {
        const isAllDay = !!item.start?.date
        const start = isAllDay ? new Date(item.start.date).getTime() : new Date(item.start?.dateTime).getTime()
        const end = isAllDay ? new Date(item.end.date).getTime() : new Date(item.end?.dateTime).getTime()

        return {
          id: `gcal-${item.id}`,
          title: item.summary || "(No title)",
          start,
          end,
          allDay: isAllDay,
          description: item.description,
          room: item.location || "Boardroom",
          source: "google",
          htmlLink: item.htmlLink,
          color: "#3b82f6",
        }
      })

      this.externalEvents = events
      store.emit()
      return events
    } catch (e) {
      console.warn("Gagal mengambil event dari Google Calendar API:", e)
      return this.externalEvents
    }
  }

  /**
   * Mengambil dan mem-parsing kalender via public iCal / .ics link.
   */
  async syncIcsCalendar(): Promise<void> {
    if (!this.googleIcsUrl) return
    try {
      const res = await fetch(this.googleIcsUrl)
      if (!res.ok) return
      const text = await res.text()
      // Basic ICS parsing (mengambil VEVENT summary, dtstart, dtend)
      const parsed: CalendarEvent[] = []
      const vevents = text.split("BEGIN:VEVENT")

      for (let i = 1; i < vevents.length; i++) {
        const block = vevents[i].split("END:VEVENT")[0]
        const summaryMatch = block.match(/SUMMARY:(.*)/)
        const dtstartMatch = block.match(/DTSTART(?:;[^:]+)?:(.*)/)
        const dtendMatch = block.match(/DTEND(?:;[^:]+)?:(.*)/)
        const locationMatch = block.match(/LOCATION:(.*)/)
        const descMatch = block.match(/DESCRIPTION:(.*)/)

        if (summaryMatch && dtstartMatch) {
          const parseIcsDate = (str: string) => {
            const clean = str.trim()
            if (clean.length === 8) {
              // YYYYMMDD (All day)
              const y = parseInt(clean.slice(0, 4))
              const m = parseInt(clean.slice(4, 6)) - 1
              const d = parseInt(clean.slice(6, 8))
              return { ts: new Date(y, m, d).getTime(), allDay: true }
            }
            // YYYYMMDDTHHMMSSZ
            const iso = clean.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?/, "$1-$2-$3T$4:$5:$6Z")
            return { ts: new Date(iso).getTime(), allDay: false }
          }

          const s = parseIcsDate(dtstartMatch[1])
          const e = dtendMatch ? parseIcsDate(dtendMatch[1]) : { ts: s.ts + 3600000, allDay: s.allDay }

          parsed.push({
            id: `ics-${i}-${s.ts}`,
            title: summaryMatch[1].trim(),
            start: s.ts,
            end: e.ts,
            allDay: s.allDay,
            room: locationMatch ? locationMatch[1].trim() : "Boardroom",
            description: descMatch ? descMatch[1].trim() : undefined,
            source: "google",
            color: "#0ea5e9",
          })
        }
      }

      if (parsed.length > 0) {
        this.externalEvents = parsed
        store.emit()
      }
    } catch (e) {
      console.warn("Gagal sync iCal Google Calendar:", e)
    }
  }

  /**
   * Menggabungkan event eksternal (Google Calendar) dengan internal meeting OPPERA.
   */
  getAllEvents(meetings: Meeting[]): CalendarEvent[] {
    const opperaEvents: CalendarEvent[] = meetings.map((m) => ({
      id: `oppera-${m.id}`,
      title: m.title,
      start: m.start,
      end: m.start + m.durationMin * 60000,
      allDay: false,
      room: m.room,
      description: m.description,
      source: "oppera",
      color: "#6366f1",
    }))

    return [...this.externalEvents, ...opperaEvents].sort((a, b) => a.start - b.start)
  }
}

export const calendarService = new CalendarService()

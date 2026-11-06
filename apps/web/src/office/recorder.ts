"use client"
// Local meeting recording: captures this tab (optional) plus your mic and
// everyone you can hear, then saves a .webm file when you stop.
import { store } from "./store"

let recorder: MediaRecorder | null = null
let chunks: Blob[] = []
let cleanup: (() => void) | null = null
let startedAt = 0
let title = "meeting"

export const isRecording = () => recorder?.state === "recording"
export const recordingSince = () => startedAt

export async function startRecording(opts: { video: boolean; name: string }): Promise<string | null> {
  if (isRecording()) return null
  const tracks: MediaStreamTrack[] = []
  let display: MediaStream | null = null
  if (opts.video) {
    try {
      display = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 24 },
        audio: false,
        // Chrome/Edge: offer this tab first
        ...({ preferCurrentTab: true, selfBrowserSurface: "include" } as object),
      })
    } catch {
      return "Recording cancelled"
    }
    tracks.push(...display.getVideoTracks())
  }

  // Mix my mic + every remote stream into one audio track.
  const ac = new AudioContext()
  const dest = ac.createMediaStreamDestination()
  const sources: MediaStream[] = []
  if (store.localStream?.getAudioTracks().length) sources.push(store.localStream)
  for (const s of store.streams.values()) if (s.getAudioTracks().length) sources.push(s)
  for (const s of sources) ac.createMediaStreamSource(s).connect(dest)
  tracks.push(...dest.stream.getAudioTracks())
  if (!opts.video && sources.length === 0) {
    void ac.close()
    return "Nothing to record yet: turn on your mic or join a conversation"
  }

  const mime = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "audio/webm"].find((m) => MediaRecorder.isTypeSupported(m))
  recorder = new MediaRecorder(new MediaStream(tracks), mime ? { mimeType: mime } : undefined)
  chunks = []
  title = opts.name
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data)
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: recorder?.mimeType || "video/webm" })
    const a = document.createElement("a")
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")
    a.href = URL.createObjectURL(blob)
    a.download = `${title.replace(/[^\w-]+/g, "_")}-${stamp}.webm`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
    cleanup?.()
    cleanup = null
    recorder = null
    store.toast("Recording saved to your downloads")
    store.emit()
  }
  // Stopping the browser's share bar also stops the recording.
  display?.getVideoTracks()[0]?.addEventListener("ended", () => stopRecording())
  cleanup = () => {
    display?.getTracks().forEach((t) => t.stop())
    void ac.close()
  }
  recorder.start(1000)
  startedAt = Date.now()
  store.toast("Recording started")
  store.emit()
  return null
}

export function stopRecording() {
  if (recorder && recorder.state !== "inactive") recorder.stop()
}

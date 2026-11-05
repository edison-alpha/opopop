import { store } from "./store"

interface VoiceMeter {
  track: MediaStreamTrack
  source: MediaStreamAudioSourceNode
  analyser: AnalyserNode
  samples: Float32Array
  speakingUntil: number
}

export class VoiceActivity {
  private context: AudioContext | null = null
  private meters = new Map<string, VoiceMeter>()
  private lastSample = -Infinity
  private unavailable = false

  resume = () => {
    if (this.context?.state === "suspended") void this.context.resume().catch(() => {})
  }

  update(now: number) {
    if (now - this.lastSample < 60 || this.unavailable) return
    this.lastSample = now
    const active = new Set<string>()
    for (const player of store.players.values()) {
      if (!player.mic) continue
      const stream = player.id === store.meId ? store.localStream : store.nearby.has(player.id) ? store.streams.get(player.id) : null
      const track = stream?.getAudioTracks().find((t) => t.enabled && !t.muted && t.readyState === "live")
      if (!track) continue
      active.add(player.id)
      let meter = this.meters.get(player.id)
      if (meter?.track !== track) {
        this.remove(player.id)
        try {
          this.context ??= new AudioContext()
          this.resume()
          const source = this.context.createMediaStreamSource(new MediaStream([track]))
          const analyser = this.context.createAnalyser()
          analyser.fftSize = 1024
          source.connect(analyser)
          meter = { track, source, analyser, samples: new Float32Array(analyser.fftSize), speakingUntil: -Infinity }
          this.meters.set(player.id, meter)
        } catch {
          // A missing Web Audio implementation must not prevent the map from rendering.
          this.unavailable = true
          return
        }
      }
      if (!meter || this.context?.state !== "running") continue
      meter.analyser.getFloatTimeDomainData(meter.samples)
      let energy = 0
      for (const sample of meter.samples) energy += sample * sample
      // Hold through short pauses between words instead of flashing on each syllable.
      if (Math.sqrt(energy / meter.samples.length) >= 0.018) meter.speakingUntil = now + 300
    }
    for (const id of this.meters.keys()) if (!active.has(id)) this.remove(id)
  }

  isSpeaking(id: string, now: number) {
    const meter = this.meters.get(id)
    return !!meter && !!store.players.get(id)?.mic && meter.track.enabled && !meter.track.muted && meter.track.readyState === "live" && this.context?.state === "running" && now < meter.speakingUntil
  }

  private remove(id: string) {
    const meter = this.meters.get(id)
    meter?.source.disconnect()
    meter?.analyser.disconnect()
    this.meters.delete(id)
  }

  dispose() {
    for (const id of this.meters.keys()) this.remove(id)
    if (this.context) void this.context.close().catch(() => {})
    this.context = null
  }
}

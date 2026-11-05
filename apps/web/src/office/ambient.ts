"use client"
// Soft generated background music for the office (no audio files): a slow
// warm chord pad over filtered noise, synthesized with WebAudio.

let ctx: AudioContext | null = null
let master: GainNode | null = null
let timer: ReturnType<typeof setInterval> | null = null

const CHORDS = [
  [220.0, 277.18, 329.63, 415.3], // A maj7
  [196.0, 246.94, 293.66, 369.99], // G maj7
  [174.61, 220.0, 261.63, 329.63], // F maj7
  [164.81, 207.65, 246.94, 311.13], // E maj7
]

export const isAmbientOn = () => !!ctx

export function startAmbient() {
  if (ctx) return
  ctx = new AudioContext()
  master = ctx.createGain()
  master.gain.value = 0
  master.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 2)
  master.connect(ctx.destination)

  // Filtered noise bed ("room tone")
  const len = ctx.sampleRate * 2
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < len; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02
    data[i] = last * 3
  }
  const noise = ctx.createBufferSource()
  noise.buffer = buf
  noise.loop = true
  const lp = ctx.createBiquadFilter()
  lp.type = "lowpass"
  lp.frequency.value = 500
  const ng = ctx.createGain()
  ng.gain.value = 0.25
  noise.connect(lp).connect(ng).connect(master)
  noise.start()

  // Chord pad, changing every 8 seconds
  let step = 0
  const playChord = () => {
    if (!ctx || !master) return
    const now = ctx.currentTime
    for (const f of CHORDS[step % CHORDS.length]) {
      const o = ctx.createOscillator()
      o.type = "sine"
      o.frequency.value = f
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, now)
      g.gain.linearRampToValueAtTime(0.12, now + 2.5)
      g.gain.linearRampToValueAtTime(0, now + 8.5)
      o.connect(g).connect(master)
      o.start(now)
      o.stop(now + 9)
    }
    step++
  }
  playChord()
  timer = setInterval(playChord, 8000)
}

export function stopAmbient() {
  if (!ctx) return
  const c = ctx
  if (timer) clearInterval(timer)
  timer = null
  master?.gain.linearRampToValueAtTime(0, c.currentTime + 0.6)
  ctx = null
  master = null
  setTimeout(() => void c.close(), 700)
}

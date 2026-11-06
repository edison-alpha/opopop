"use client"
// Mesh WebRTC between nearby players. The player with the smaller id makes the offer.
// Each connection always carries one audio + one video transceiver so mic/cam/screen
// changes are done with replaceTrack and never need renegotiation.
import { store } from "../store"

type Signal =
  | { type: "offer"; sdp: string }
  | { type: "answer"; sdp: string }
  | { type: "ice"; candidate: RTCIceCandidateInit }
  | { type: "bye" }

interface Peer {
  pc: RTCPeerConnection
  stream: MediaStream
  pendingIce: RTCIceCandidateInit[]
}

const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }]

export class Rtc {
  private peers = new Map<string, Peer>()

  constructor(private sendSignal: (to: string, data: Signal) => void) {}

  private outgoingVideo(): MediaStreamTrack | null {
    return store.screenStream?.getVideoTracks()[0] ?? store.localStream?.getVideoTracks()[0] ?? null
  }
  private outgoingAudio(): MediaStreamTrack | null {
    return store.localStream?.getAudioTracks()[0] ?? null
  }

  private create(id: string): Peer {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    const peer: Peer = { pc, stream: new MediaStream(), pendingIce: [] }
    pc.onicecandidate = (e) => {
      if (e.candidate) this.sendSignal(id, { type: "ice", candidate: e.candidate.toJSON() })
    }
    pc.ontrack = (e) => {
      for (const t of peer.stream.getTracks()) if (t.kind === e.track.kind) peer.stream.removeTrack(t)
      peer.stream.addTrack(e.track)
      store.streams.set(id, peer.stream)
      store.emit()
    }
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed") this.close(id, false)
    }
    this.peers.set(id, peer)
    return peer
  }

  private async attachLocal(pc: RTCPeerConnection) {
    for (const t of pc.getTransceivers()) {
      const kind = t.receiver.track.kind
      t.direction = "sendrecv"
      await t.sender.replaceTrack(kind === "audio" ? this.outgoingAudio() : this.outgoingVideo())
    }
  }

  /** Bring the connection set in line with who should be connected. */
  sync(desired: Set<string>) {
    const me = store.meId
    if (!me) return
    for (const id of desired) {
      if (!this.peers.has(id) && me < id) void this.call(id)
    }
    for (const id of [...this.peers.keys()]) {
      if (!desired.has(id)) this.close(id, true)
    }
  }

  private async call(id: string) {
    const peer = this.create(id)
    peer.pc.addTransceiver("audio", { direction: "sendrecv" })
    peer.pc.addTransceiver("video", { direction: "sendrecv" })
    await this.attachLocal(peer.pc)
    const offer = await peer.pc.createOffer()
    await peer.pc.setLocalDescription(offer)
    this.sendSignal(id, { type: "offer", sdp: offer.sdp ?? "" })
  }

  async handle(from: string, data: Signal) {
    if (data.type === "bye") {
      this.close(from, false)
      return
    }
    if (data.type === "offer") {
      this.close(from, false)
      const peer = this.create(from)
      await peer.pc.setRemoteDescription({ type: "offer", sdp: data.sdp })
      await this.attachLocal(peer.pc)
      const answer = await peer.pc.createAnswer()
      await peer.pc.setLocalDescription(answer)
      this.sendSignal(from, { type: "answer", sdp: answer.sdp ?? "" })
      await this.flushIce(peer)
      return
    }
    const peer = this.peers.get(from)
    if (!peer) return
    if (data.type === "answer") {
      await peer.pc.setRemoteDescription({ type: "answer", sdp: data.sdp })
      await this.flushIce(peer)
    } else if (data.type === "ice") {
      if (peer.pc.remoteDescription) await peer.pc.addIceCandidate(data.candidate).catch(() => {})
      else peer.pendingIce.push(data.candidate)
    }
  }

  private async flushIce(peer: Peer) {
    for (const c of peer.pendingIce) await peer.pc.addIceCandidate(c).catch(() => {})
    peer.pendingIce = []
  }

  /** Re-send current local tracks to every peer (after toggling camera or screen share). */
  async refreshTracks() {
    for (const peer of this.peers.values()) {
      for (const t of peer.pc.getTransceivers()) {
        const kind = t.receiver.track.kind
        await t.sender.replaceTrack(kind === "audio" ? this.outgoingAudio() : this.outgoingVideo()).catch(() => {})
      }
    }
  }

  close(id: string, notify: boolean) {
    const peer = this.peers.get(id)
    if (!peer) return
    if (notify) this.sendSignal(id, { type: "bye" })
    peer.pc.close()
    this.peers.delete(id)
    store.streams.delete(id)
    if (store.spotlight === id) store.spotlight = null
    store.emit()
  }

  closeAll() {
    for (const id of [...this.peers.keys()]) this.close(id, true)
  }
}

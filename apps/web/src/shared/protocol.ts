// Wire protocol shared by the web client and the realtime server.

export type Dir = "up" | "down" | "left" | "right"
export type Status = "available" | "busy" | "away"

export interface AvatarLook {
  skin: string
  hair: string
  hairStyle: number
  shirt: string
  pants: string
  // Optional layers (0 = none). Older saved looks simply omit them.
  facialHair?: number
  top?: number
  jacket?: number
  jacketColor?: string
  bottom?: number
  shoes?: string
  hat?: number
  hatColor?: string
  glasses?: number
  glassesColor?: string
  other?: number
  otherColor?: string
}

export interface PlayerState {
  id: string
  name: string
  /** Displayed job title, independent of access permissions. */
  role?: string
  look: AvatarLook
  x: number
  y: number
  dir: Dir
  status: Status
  statusText: string
  mic: boolean
  cam: boolean
  screen: boolean
  hand: boolean
  /** Non-empty while this player has locked their conversation to these ids. */
  lockedWith: string[]
}

export type PlayerPatch = Partial<
  Pick<PlayerState, "name" | "role" | "look" | "status" | "statusText" | "mic" | "cam" | "screen" | "hand" | "lockedWith">
>

export type ChatScope = "channel" | "nearby" | "dm"

export interface ChatMsg {
  id: string
  from: string
  fromName: string
  text: string
  scope: ChatScope
  /** Channel name for channel messages. */
  channel?: string
  /** Recipient id for direct messages. */
  to?: string
  /** Optional inline image (data URL, resized client-side). */
  image?: string
  /** Server-generated activity line, e.g. "Ana joined". */
  system?: boolean
  ts: number
}

export interface Channel {
  name: string
  topic: string
}

export interface Meeting {
  id: string
  title: string
  /** Name of the meeting room area. */
  room: string
  /** Start time, epoch ms. */
  start: number
  durationMin: number
  createdBy: string
  createdByName: string
  description: string
}

export type NewMeeting = Pick<Meeting, "title" | "room" | "start" | "durationMin" | "description">

/** A named zone on the map (world tile coordinates). */
export interface AreaDef {
  name: string
  x: number
  y: number
  w: number
  h: number
  private: boolean
  meeting?: boolean
  label?: boolean
}

/** One change made in build mode. Object/floor ids are validated by the client map. */
export type MapOp =
  | { k: "obj"; x: number; y: number; o: string | null }
  | { k: "floor"; x: number; y: number; f: string }
  | { k: "area"; area: AreaDef }
  | { k: "areaDel"; name: string }
  | { k: "reset" }

export type ClientMsg =
  | { t: "join"; name: string; role?: string; look: AvatarLook; x: number; y: number }
  | { t: "move"; x: number; y: number; dir: Dir }
  | {
      t: "chat"
      text: string
      scope: ChatScope
      channel?: string
      recipients?: string[]
      to?: string
      image?: string
    }
  | { t: "react"; emoji: string }
  | { t: "update"; patch: PlayerPatch }
  | { t: "signal"; to: string; data: unknown }
  | { t: "wave"; to: string }
  | { t: "meeting:create"; meeting: NewMeeting }
  | { t: "meeting:delete"; id: string }
  | { t: "channel:create"; name: string; topic: string }
  | { t: "map:edit"; ops: MapOp[] }

export type ServerMsg =
  | {
      t: "welcome"
      id: string
      players: PlayerState[]
      history: ChatMsg[]
      meetings: Meeting[]
      channels: Channel[]
      /** Every build-mode edit on top of the default map, compacted. */
      mapOps?: MapOp[]
    }
  | { t: "map:edit"; ops: MapOp[]; by: string }
  | { t: "joined"; player: PlayerState }
  | { t: "left"; id: string }
  | { t: "moved"; id: string; x: number; y: number; dir: Dir }
  | { t: "updated"; id: string; patch: PlayerPatch }
  | { t: "chat"; msg: ChatMsg }
  | { t: "react"; id: string; emoji: string }
  | { t: "signal"; from: string; data: unknown }
  | { t: "wave"; from: string }
  | { t: "meetings"; meetings: Meeting[] }
  | { t: "channels"; channels: Channel[] }

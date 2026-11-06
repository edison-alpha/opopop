"use client"
// App icons: Hugeicons (stroke-rounded) rendered with Iconify, bundled offline.
// Names match the components the UI used before, so call sites stay the same.
// Regenerate the data with `node scripts/build-icons.mjs` after adding a name there.
import { Icon, type IconifyIcon } from "@iconify/react"
import type { CSSProperties } from "react"
import data from "../common/icon-data.json"

export interface IconProps {
  size?: number
  className?: string
  style?: CSSProperties
  "aria-label"?: string
}

const icons = data.icons as Record<string, IconifyIcon & { source: string }>

function make(name: string) {
  const icon = icons[name]
  const C = ({ size = 20, className, style, ...rest }: IconProps) => (
    <Icon
      icon={icon}
      width={size}
      height={size}
      className={className ? `ico ${className}` : "ico"}
      style={style}
      aria-hidden={rest["aria-label"] ? undefined : true}
      aria-label={rest["aria-label"]}
    />
  )
  C.displayName = name
  return C
}

export const ArrowUpRight = make("ArrowUpRight")
export const Bell = make("Bell")
export const BellOff = make("BellOff")
export const Brush = make("Brush")
export const CalendarClock = make("CalendarClock")
export const CalendarDays = make("CalendarDays")
export const CalendarPlus = make("CalendarPlus")
export const Check = make("Check")
export const ChevronDown = make("ChevronDown")
export const ChevronUp = make("ChevronUp")
export const CircleDashed = make("CircleDashed")
export const Clock = make("Clock")
export const Crosshair = make("Crosshair")
export const DoorOpen = make("DoorOpen")
export const Download = make("Download")
export const Eraser = make("Eraser")
export const Hammer = make("Hammer")
export const Hand = make("Hand")
export const Hash = make("Hash")
export const Info = make("Info")
export const Layers = make("Layers")
export const LayoutGrid = make("LayoutGrid")
export const LayoutPanelTop = make("LayoutPanelTop")
export const Link2 = make("Link2")
export const Lock = make("Lock")
export const LockOpen = make("LockOpen")
export const LogIn = make("LogIn")
export const LogOut = make("LogOut")
export const Map = make("Map")
export const MapPin = make("MapPin")
export const Maximize = make("Maximize")
export const Maximize2 = make("Maximize2")
export const MessageCircle = make("MessageCircle")
export const Mic = make("Mic")
export const MicOff = make("MicOff")
export const Minus = make("Minus")
export const Monitor = make("Monitor")
export const MonitorUp = make("MonitorUp")
export const MonitorX = make("MonitorX")
export const MoreVertical = make("MoreVertical")
export const PanelLeftClose = make("PanelLeftClose")
export const PanelLeftOpen = make("PanelLeftOpen")
export const Pencil = make("Pencil")
export const PictureInPicture2 = make("PictureInPicture2")
export const Plus = make("Plus")
export const Radio = make("Radio")
export const Redo2 = make("Redo2")
export const RotateCcw = make("RotateCcw")
export const RotateCw = make("RotateCw")
export const Search = make("Search")
export const Send = make("Send")
export const Settings = make("Settings")
export const Puzzle = make("Puzzle")
export const Zap = make("Zap")
export const CreditCard = make("CreditCard")
export const Plug = make("Plug")
export const Keyboard = make("Keyboard")
export const Shuffle = make("Shuffle")
export const Smile = make("Smile")
export const Sofa = make("Sofa")
export const SquarePen = make("SquarePen")
export const Trash2 = make("Trash2")
export const Undo2 = make("Undo2")
export const UserPlus = make("UserPlus")
export const Users = make("Users")
export const Video = make("Video")
export const VideoOff = make("VideoOff")
export const WifiOff = make("WifiOff")
export const X = make("X")
export const Globe = make("Globe")
export const Music = make("Music")
export const Record = make("Record")
export const StopRecording = make("StopRecording")
export const AtSign = make("AtSign")
export const Bold = make("Bold")
export const Code = make("Code")
export const Italic = make("Italic")
export const List = make("List")
export const ListOrdered = make("ListOrdered")
export const Paperclip = make("Paperclip")
export const SendHorizontal = make("SendHorizontal")
export const SquareCode = make("SquareCode")
export const Strikethrough = make("Strikethrough")
export const TextQuote = make("TextQuote")

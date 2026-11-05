import type { Metadata, Viewport } from "next"
import "./globals.css"
import "./office.css"
import "./build.css"
import "./meeting.css"

export const metadata: Metadata = {
  title: "OPPERA",
  description: "A virtual office where your team can walk up and talk, like in real life.",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#202540",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

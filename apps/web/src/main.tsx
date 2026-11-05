import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter, Routes, Route } from "react-router-dom"

import "./app/globals.css"
import "./app/office.css"
import "./app/build.css"
import "./app/meeting.css"
import "./app/appearance.css"
import "./app/glass.css"

import Home from "./app/page"
import Office from "./office/Office"
import AvatarDev from "./app/dev/avatar/page"
import BuildDev from "./app/dev/build/page"
import MapDev from "./app/dev/map/page"
import Offline from "./app/offline/page"

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/app" element={<Office />} />
        <Route path="/dev/avatar" element={<AvatarDev />} />
        <Route path="/dev/build" element={<BuildDev />} />
        <Route path="/dev/map" element={<MapDev />} />
        <Route path="/offline" element={<Offline />} />
        <Route path="*" element={<Offline />} />
      </Routes>
    </BrowserRouter>
  )
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

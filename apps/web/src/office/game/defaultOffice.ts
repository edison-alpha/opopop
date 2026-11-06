import type { Area, Floor, Obj } from "./map"
import { PRIVATE_OFFICES, HUDDLE_ROOMS, LAYOUT_DOORS, CENTRAL_COUCHES, TEAM_AREA, TEAM_DESKS, COURTYARD, LOBBY, MEDIA_ROOM } from "./layout"

interface Builder {
  fill(x0: number, y0: number, x1: number, y1: number, f: Floor): void
  room(x0: number, y0: number, x1: number, y1: number, f: Floor, doors: [number, number][]): void
  put(x: number, y: number, o: Obj): void
  area(a: Area): void
  furnish(x: number, y: number, o: Obj): void
}

/** Compact, human-scaled office geometry following the POP reference. */
export function buildDefaultOffice({ fill, room, put, area, furnish }: Builder) {
  const windows = (x: number, y: number, n: number) => {
    for (let dx = 0; dx < n; dx++) put(x + dx, y, "wallWindow")
  }
  fill(6, 8, 34, 24, "hall")
  for (const r of PRIVATE_OFFICES) {
    room(r.x, r.y, r.x + r.w - 1, r.h - 1, "lavender", [])
    fill(r.x, 0, r.x + r.w - 1, 1, "wall")
    area({ name: r.name, x: r.x + 1, y: 1, w: r.w - 2, h: r.h - 2, private: true, label: true })
    if (r.id !== "focus-booth-4") windows(r.x + 1, 1, 5)
    furnish(r.desk.x, r.desk.y, "workDesk")
    put(r.chair.x, r.chair.y, "officeChairUp")
    put(r.x + 5, 2, r.id === "focus-booth-2" ? "snakePlant" : r.id === "focus-booth-4" ? "monstera" : "plant")
  }

  put(34, 1, "landscapePoster"); furnish(35, 0, "airConditioner")

  const c = COURTYARD
  area({ name: "Koi Pond", ...c, private: true, label: true })
  furnish(COURTYARD.x + (COURTYARD.w - 4) / 2, COURTYARD.y + (COURTYARD.h - 4) / 2, "koiPond")
  for (const y of [2, 4, 6]) put(19, y, "bush")
  put(24, 0, "bush"); put(24, 2, "bush")
  put(20, 1, "officeChair"); put(22, 1, "chair"); put(24, 1, "chair")
  put(20, 7, "chairUp"); put(22, 7, "chairUp"); put(24, 7, "officeChairUp")

  for (const r of HUDDLE_ROOMS) {
    const f: Floor = r.name === "Study Huddle" || r.name === "Fishtank Huddle" ? "stripe" : "huddle"
    room(r.x, r.y, r.x + r.w - 1, r.y + r.h - 1, f, [])
    area({ name: r.name, x: r.x + 1, y: r.y + 1, w: r.w - 2, h: r.h - 2, private: true, meeting: true, label: true })
    if (r.name === "Coffee Huddle" || r.name === "Data Huddle") windows(r.x + 1, r.y, 5)
    const cx = r.x + 3, cy = r.y + 5
    furnish(cx, cy, r.name === "Fishtank Huddle" ? "meetingRound" : "roundSmall")
    put(cx, cy - 1, "chair"); put(cx, cy + 1, "chairUp")
    put(cx - 1, cy, "chairR"); put(cx + 1, cy, "chairL")
    if (r.name === "Coffee Huddle") {
      put(r.x + 1, r.y + 2, "cabinet"); put(r.x + 2, r.y + 2, "counter")
      furnish(r.x + 3, r.y + 2, "coffee"); put(r.x + 5, r.y + 2, "plantBig")
    } else if (r.name === "Study Huddle") {
      put(r.x + 1, r.y + 2, "bookshelf"); put(r.x + 2, r.y + 2, "bookshelf")
      put(r.x + 3, r.y, "painting"); put(r.x + 4, r.y, "painting")
      put(r.x + 5, r.y + 2, "cabinetPlant")
    } else if (r.name === "Data Huddle") {
      put(r.x + 1, r.y + 2, "plantBig"); put(r.x + 2, r.y + 2, "whiteboard")
      put(r.x + 4, r.y + 2, "tv"); put(r.x + 5, r.y + 2, "filingLaptop")
    } else {
      furnish(r.x + 1, r.y + 1, "fishTank")
      put(r.x + 4, r.y + 2, "bookshelf"); put(r.x + 5, r.y + 2, "lampPost")
    }
  }

  // Small pantry, arcade, books, presentation easel and lamps along the hall.
  furnish(11, 9, "studyShelf")
  furnish(17, 9, "pantryUnit")
  put(25, 9, "plant"); put(26, 9, "chartEasel")

  const lounge = CENTRAL_COUCHES
  fill(lounge.x, lounge.y, lounge.x + lounge.w - 1, lounge.y + lounge.h - 1, "stripe")
  area({ name: "Central Couches", ...lounge, private: false, label: true })
  furnish(10, 12, "displayShelf"); furnish(17, 12, "displayShelf")
  put(11, 14, "plant"); put(18, 14, "plantBig")
  for (let x = 13; x <= 16; x++) put(x, 15, "sofa")
  for (let x = 12; x <= 17; x++) put(x, 18, "sofaUp")
  furnish(14, 17, "loungeTable")
  put(11, 16, "beanbag"); put(11, 18, "beanbagPink")
  put(18, 16, "beanbagPurple"); put(18, 18, "beanbag")
  put(10, 19, "plantBig"); put(19, 19, "oakSideTable")

  const team = TEAM_AREA
  fill(team.x, team.y, team.x + team.w - 1, team.y + team.h - 1, "lavender")
  area({ name: "Team", ...team, private: false, label: true })
  for (const desk of TEAM_DESKS) {
    furnish(desk.x, desk.y, "workDesk")
    put(desk.x + 1, desk.y + 1, "officeChairUp")
  }
  put(8, 22, "printer")

  room(LOBBY.x, LOBBY.y, 24, 34, "hall", [[15,24], [16,24], [17,24]])
  fill(8, 27, 14, 32, "diamond")
  area({ name: "Lobby Couches", x: 8, y: 27, w: 7, h: 6, private: false, label: true })
  area({ name: "Lobby", x: 7, y: 25, w: 17, h: 9, private: false, label: true })
  for (let x = 10; x <= 13; x++) put(x, 27, "blueSofa")
  for (let y = 28; y <= 30; y++) put(9, y, "blueSofaSide")
  furnish(10, 29, "loungeTable")
  put(12, 29, "chairL"); put(10, 30, "chairUp"); put(11, 30, "chairUp")
  put(9, 24, "tv"); put(12, 24, "painting"); put(13, 24, "painting")
  put(7, 26, "plantBig"); put(18, 26, "officeChairUp")
  put(19, 25, "lampPost"); furnish(20, 25, "displayShelf"); furnish(18, 28, "reception")
  windows(8, 34, 5); windows(19, 34, 4)
  put(23,26,"coatRack"); furnish(16,32,"recycleStation"); furnish(8,25,"flowerPink"); put(22,32,"magazineRack")
  put(22,30,"arcade")

  const m = MEDIA_ROOM
  room(m.x, m.y, m.x + m.w - 1, m.y + m.h - 1, "hall", [])
  area({ name: "Media Room", x: m.x + 1, y: m.y + 1, w: m.w - 2, h: m.h - 2, private: true, meeting: true, label: true })
  put(25, 25, "arcade"); put(26, 25, "snackVending"); put(28, 24, "tv")
  put(33, 25, "cabinet"); put(34, 25, "counter"); put(36, 25, "waterCooler")
  for (let y = 28; y <= 29; y++) for (let x = 29; x <= 31; x++) put(x, y, "table")
  for (const x of [29,30,31]) { put(x,27,"redChair"); put(x,30,"redChairUp") }
  for (const y of [28,29]) { put(28,y,"redChairR"); put(32,y,"redChairL") }
  furnish(35,30,"trailingShelf")
  windows(26,34,4); windows(33,34,4)
  put(35,24,"clock"); put(32,24,"firstAid")

  for (const d of LAYOUT_DOORS) {
    fill(d.x, d.y, d.x + (d.orientation === "horizontal" ? 1 : 0), d.y + (d.orientation === "vertical" ? 1 : 0), "hall")
  }
  for (const r of PRIVATE_OFFICES) {
    // Carpet ends on the facade baseline; the hall starts on one straight edge.
    fill(r.entrance.x, r.entrance.y, r.entrance.x + 1, r.entrance.y, "lavender")
  }
  const trees: [number, number, Obj][] = [
    [2,1,"pine"], [4,-4,"pine"], [14,-4,"tree"], [24,-4,"pine"], [34,-3,"tree"],
    [-4,9,"pine"], [-4,20,"tree"], [0,29,"tree"], [4,36,"pine"], [14,38,"tree"],
    [44,7,"pine"], [45,18,"tree"], [42,28,"tree"], [37,37,"pine"], [28,38,"tree"],
  ]
  for (const [x,y,o] of trees) put(x,y,o)
}

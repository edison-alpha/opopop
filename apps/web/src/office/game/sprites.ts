import type { Obj } from "./map"
import { FOOTPRINT, TILE } from "./map"
import framesData from "./sprite-frames.json"
import type { Ctx } from "./pixel"

export const OFFICE_SPRITES_URL = "/assets/office/furniture.png?v=8"
export const OFFICE_SPRITE_FRAMES = framesData
const frames = framesData as Record<string, { x: number; y: number; w: number; h: number }>
let image: CanvasImageSource | null = null
let loading: Promise<void> | null = null

export function registerOfficeSprites(source: CanvasImageSource) { image = source }
export function loadOfficeSprites(): Promise<void> {
  return loading ??= new Promise(resolve => {
    const img = new Image()
    img.onload = () => { registerOfficeSprites(img); resolve() }
    img.onerror = () => { console.warn("Office sprite atlas could not be loaded"); resolve() }
    img.src = OFFICE_SPRITES_URL
  })
}

const SPRITES: Partial<Record<Obj, string>> = {
  blueSofaLeft:"blueSofaLeft", cognacSofaLeft:"cognacSofaLeft", cognacSofaRight:"cognacSofaRight", officeChairL:"meshChairLeft", officeChairR:"meshChairRight", oakCoffeeRect:"oakCoffeeRect",
  flowerPink:"flowerPink", flowerBlue:"flowerBlue", trailingShelf:"trailingShelf", snakePlant:"snakePlant", monstera:"monstera", oakSideTable:"oakSideTable", recycleStation:"recycleStation", snackVending:"snackVending", landscapePoster:"landscapePoster", airConditioner:"airConditioner", coatRack:"coatRack", firstAid:"firstAid", magazineRack:"magazineRack", clock:"clockFace",
  furnishedDesk: "equippedDesk", chartEasel: "chartEasel", studyShelf: "studyShelf", filingLaptop: "filingLaptop", pantryUnit: "pantryUnit", meetingRound: "roundHuddle",
  beanbagPurple: "beanbagPurple", bamboo: "bamboo", terracottaPlant: "terracottaPlant",
  sideTablePlant: "sideTablePlant", sideTableMug: "sideTableMug", monitor: "monitor", laptop: "laptop",
  deskPhone: "deskPhone", notebooks: "notebooks", blueSofaBack: "blueCouchBack", blueArmchairBack: "blueArmchairBack", koiPond: "pondCircular",
  workDesk: "workDesk", reception: "reception", displayShelf: "shelf", fishTank: "fishTank",
  redChair: "redChairSouth", redChairUp: "redChairNorth", redChairL: "redChairWest", redChairR: "redChairEast",
  officeChair: "meshChairFront", officeChairUp: "meshChairBack",
  chair: "woodChairFront", chairUp: "woodChairBack", chairL: "woodChairLeft", chairR: "woodChairRight",
  plant: "topiary", plantBig: "plant", tree: "birch", pine: "pine", bush: "fernGround",
  sofa: "couchFront", sofaUp: "couchBack", blueSofa: "blueCouchFront", blueSofaSide: "blueSofaRight",
  beanbag: "beanbagBlue", beanbagPink: "beanbagPink", bookshelf: "bookcase",
  cabinetPlant: "filingCabinet", cabinet: "lockers", fridge: "drinksFridge", printer: "printer",
  waterCooler: "waterCooler", lampPost: "globeLamp", lamp: "globeLamp", bench: "bench",
  arcade: "arcade", tv: "tv", whiteboard: "planningBoard", coffee: "coffeeStation",
  loungeTable: "coffeeTable", roundSmall: "ovalHuddle", wallWindow: "window", pingpong: "pingpong",
}
const RUN = new Set<Obj>(["sofa", "sofaUp", "blueSofa", "blueSofaBack", "bookshelf", "wallWindow"])

/** Pixel-art sprites share the same anchor and footprint as editable map objects. */
export function drawDetailedObject(ctx: Ctx, o: Obj, x: number, y: number, grid: (Obj | null)[][]): boolean {
  if (!image) return false
  let name = SPRITES[o]
  if (!name) return false
  if (!frames[name] && (o === "plant" || o === "bush")) name = "plant"
  if (!frames[name] && o.startsWith("chair")) name = "woodChairFront"
  if (!frames[name] && o === "officeChair") name = "officeChairBack"
  const frame = frames[name]
  if (!frame) return false
  const same = (tx: number, ty: number) => grid[ty]?.[tx] === o
  const [fw, fh] = FOOTPRINT[o] ?? [1, 1]
  let run = fw
  if (RUN.has(o)) {
    if (same(x - 1, y)) return true
    run = 1
    while (same(x + run, y)) run++
  } else if (fw > 1 || fh > 1) {
    let left = x, top = y
    while (same(left - 1, y)) left--
    while (same(x, top - 1)) top--
    if ((x - left) % fw || (y - top) % fh) return true
  }
  const paint = (key: string, cx: number, bottom: number, w: number, maxH: number, fill = false) => {
    const f = frames[key]
    if (!f) return
    const scale = Math.min(w / f.w, maxH / f.h)
    const h = fill ? maxH : f.h * scale
    w = fill ? w : f.w * scale
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(image!, f.x, f.y, f.w, f.h, Math.round(cx - w / 2), Math.round(bottom - h), Math.round(w), Math.round(h))
  }
  const cx = (x + run / 2) * TILE, bottom = (y + fh) * TILE
  if (o === "tree" || o === "pine") {
    paint(name, (x + 0.5) * TILE, (y + 1) * TILE, (o === "tree" ? 4.1 : 3.1) * TILE, 4.6 * TILE)
  } else if (o === "bush") {
    // Use just the leafy crown for the garden's ground planting, without a pot.
    const f = frames[name], w = 1.15 * TILE, h = 1.05 * TILE
    ctx.drawImage(image, f.x, f.y, f.w, f.h, Math.round((x + 0.5) * TILE - w / 2), Math.round((y + 1) * TILE - h), Math.round(w), Math.round(h))
  } else if (o === "plant" || o === "plantBig") {
    paint(name, (x + 0.5) * TILE, (y + 1) * TILE, (o === "plantBig" ? 1.55 : 1.05) * TILE, (o === "plantBig" ? 2.3 : 1.8) * TILE)
  } else if (o === "wallWindow") {
    // Windows are fitted inside the back wall, with calm mint panes and slim mullions.
    const w = Math.min(run*TILE-8,3.6*TILE), h = 2*TILE-6
    const left = (x+run/2)*TILE-w/2-4
    const top = (y + 1) * TILE - h - 2
    const rect = (dx: number, dy: number, rw: number, rh: number, color: string) => {
      ctx.fillStyle = color; ctx.fillRect(Math.round(dx), Math.round(dy), Math.round(rw), Math.round(rh))
    }
    rect(left, top, w, h, "#3e4c68")
    rect(left + 1, top + 1, w - 2, 1, "#8c9aa9")
    const rows = [0, 0.27, 0.76, 1]
    for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
      const cw = (w - 6) / 3, ch = h - 6
      rect(left + 3 + col * cw, top + 3 + rows[row] * ch, cw - 3, (rows[row + 1] - rows[row]) * ch - 3, "#afe0d8")
    }
  } else if (o === "sofa" || o === "sofaUp" || o === "blueSofa" || o === "blueSofaBack") {
    // Long seating is assembled from real couch modules, retaining end arms.
    const modules = Math.max(1, Math.round(run / 3)), w = run * TILE / modules
    for (let i=0;i<modules;i++) paint(name, x*TILE+w*(i+0.5), (y+1)*TILE, w, (o === "sofaUp" || o === "blueSofaBack" ? 1.25 : 1.8)*TILE)
  } else if (o === "blueSofaSide" || o === "blueSofaLeft" || o === "cognacSofaLeft" || o === "cognacSofaRight") {
    paint(name, cx, bottom, TILE - 2, fh*TILE)
  } else if (o === "bookshelf") {
    for (let i=0;i<run;i++) paint(name, (x+i+0.5)*TILE, (y+1)*TILE, TILE, 2.3*TILE)
  } else if (o === "workDesk") paint(name, cx, bottom, fw*TILE, 1.25*TILE, true)
  else if (o === "furnishedDesk") paint(name, cx, bottom, fw*TILE, 1.8*TILE)
  else if (o === "koiPond") paint(name, cx, bottom, fw*TILE, fh*TILE, true)
  else if (o === "flowerPink" || o === "flowerBlue") paint(name,cx,bottom,fw*TILE,1.1*TILE)
  else if (o === "trailingShelf" || o === "recycleStation") paint(name,cx,bottom,fw*TILE-8,2.5*TILE)
  else if (o === "airConditioner") paint(name,cx,bottom,fw*TILE,0.85*TILE)
  else if (o === "landscapePoster") paint(name,cx,bottom,0.9*TILE,1.6*TILE)
  else if (o === "firstAid" || o === "clock") paint(name,cx,bottom,0.9*TILE,0.9*TILE)
  else if (o === "monstera") paint(name,cx,bottom,1.45*TILE,2*TILE)
  else if (o === "studyShelf" || o === "pantryUnit") paint(name, cx, bottom, fw*TILE-8, 2.7*TILE)
  else if (o === "chartEasel") paint(name, cx, bottom, 1.25*TILE, 2*TILE)
  else if (o === "filingLaptop") paint(name, cx, bottom, 1.25*TILE, 2*TILE)
  else if (o === "meetingRound") paint(name, cx, bottom, 1.4*TILE, 1.5*TILE)
  else if (o === "displayShelf") paint(name, cx, bottom, fw*TILE, 3*TILE)
  else if (o === "reception") paint(name, cx, bottom, fw*TILE, 2.7*TILE)
  else if (o === "fishTank") paint(name, cx, bottom, fw*TILE, 2.7*TILE)
  else if (o === "oakCoffeeRect") paint(name, cx, bottom, fw*TILE, 1.5*TILE)
  else if (o === "loungeTable") paint(name, cx, bottom, fw*TILE, 1.6*TILE)
  else if (o === "roundSmall") paint(name, cx, bottom, 1.25*TILE, 1.5*TILE)
  else if (o === "coffee") paint(name, cx, bottom, fw*TILE-6, 2.2*TILE)
  else if (o === "arcade" || o === "snackVending") paint(name, cx, bottom, TILE-6, 1.9*TILE)
  else if (o === "tv") paint(name, (x+0.5)*TILE, bottom, 2*TILE, 1.7*TILE)
  else if (o === "whiteboard") paint(name, (x+0.5)*TILE, bottom, 1.8*TILE, 2.1*TILE)
  else if (o.startsWith("chair")) paint(name, cx, bottom, .78*TILE, 1.15*TILE)
  else if (o.startsWith("officeChair") || o.startsWith("redChair")) paint(name, cx, bottom, 1.05*TILE, 1.6*TILE)
  else if (o === "beanbag" || o === "beanbagPink") paint(name, cx, bottom, 1.05*TILE, 1.1*TILE)
  else paint(name, cx, bottom, 1.1*TILE, 2.3*TILE)
  return true
}

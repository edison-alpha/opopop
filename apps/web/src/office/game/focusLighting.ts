import { areas, areaAt, OX, OY, TILE, type Area } from "./map"
import { PRIVATE_OFFICES, HUDDLE_ROOMS, COURTYARD, LAYOUT_DOORS, MEDIA_ROOM } from "./layout"
import { doorFrame } from "./doorGeometry"
import { HORIZONTAL_WALL_RISE } from "./wallGeometry"

export interface LightRect { x: number; y: number; w: number; h: number }
const contains = (r: LightRect, x: number, y: number) => x >= r.x && x < r.x+r.w && y >= r.y && y < r.y+r.h
const roomMatches = (a: Area, r: {x:number;y:number;w:number;h:number}) => a.x === OX+r.x+1 && a.y === OY+r.y+1 && a.w === r.w-2 && a.h === r.h-2
const isGarden = (a: Area) => a.x === OX+COURTYARD.x && a.y === OY+COURTYARD.y && a.w === COURTYARD.w && a.h === COURTYARD.h

/** Lighting follows architectural bounds, including walls; Area bounds describe the interior only. */
export function roomLightRegions(area: Area): LightRect[] {
  if (!area.private || isGarden(area)) return []
  const focus = PRIVATE_OFFICES.find(r => roomMatches(area,r))
  const room = focus ?? HUDDLE_ROOMS.find(r => roomMatches(area,r)) ?? (roomMatches(area,MEDIA_ROOM) ? MEDIA_ROOM : null)
  const regions: LightRect[] = [room ? {
    // The renderer anchors each facade at its floor baseline. Stacked north
    // walls occupy two existing rows; they do not extend into the garden.
    x:(OX+room.x+0.5)*TILE-3,
    y:(OY+room.y)*TILE-(focus?0:HORIZONTAL_WALL_RISE),
    w:(room.w-1)*TILE+6,
    h:room.h*TILE+(focus?0:HORIZONTAL_WALL_RISE),
  } : {
    x:(area.x-0.5)*TILE-3, y:(area.y-1)*TILE-1-HORIZONTAL_WALL_RISE,
    w:(area.w+1)*TILE+6, h:(area.h+2)*TILE+2+HORIZONTAL_WALL_RISE,
  }]
  const door = room && LAYOUT_DOORS.find(d => d.roomName === ("name" in room ? room.name : "Media Room"))
  if (door) {
    const tiles: [number,number][] = [[OX+door.x,OY+door.y],[OX+door.x+(door.orientation==='horizontal'?1:0),OY+door.y+(door.orientation==='vertical'?1:0)]]
    const frame = doorFrame(tiles,door.orientation,!!focus)
    const posts = frame.posts
    const x = Math.min(...posts.map(p=>p.x)), y = Math.min(...posts.map(p=>p.y))
    const right = Math.max(...posts.map(p=>p.x+p.w)), bottom = Math.max(...posts.map(p=>p.y+p.h))
    // Add only the jambs. A horizontal entry ends flush with the room's floor;
    // it must not keep the unrelated corridor illuminated or focused.
    const margin=door.orientation==='vertical'?1:0
    regions.push({x:x-margin,y:y-margin,w:right-x+2*margin,h:bottom-y+2*margin})
  }
  return regions
}

/** Preserve focus while the avatar crosses the carpeted doorway/vestibule. */
export function focusAreaAt(x: number, y: number): Area | null {
  const current = areaAt(x,y)
  if (current?.private && !isGarden(current)) return current
  for (const room of PRIVATE_OFFICES) {
    const area = areas.find(a=>roomMatches(a,room))
    const entry = area && roomLightRegions(area)[1]
    if (area && entry && contains(entry,x*TILE,y*TILE)) return area
  }
  return null
}

/** Non-overlapping dark rectangles outside the union of all illuminated regions. */
export function outsideLightRects(regions: LightRect[], width: number, height: number): LightRect[] {
  const ys = [...new Set([0,height,...regions.flatMap(r=>[Math.max(0,Math.min(height,r.y)),Math.max(0,Math.min(height,r.y+r.h))])])].sort((a,b)=>a-b)
  const dark: LightRect[] = []
  for (let i=0;i<ys.length-1;i++) {
    const y=ys[i], h=ys[i+1]-y, middle=y+h/2
    const intervals=regions.filter(r=>middle>=r.y&&middle<r.y+r.h).map(r=>[Math.max(0,r.x),Math.min(width,r.x+r.w)]).filter(([l,r])=>r>l).sort((a,b)=>a[0]-b[0])
    let edge=0
    for(const [left,right] of intervals) {if(left>edge)dark.push({x:edge,y,w:left-edge,h});edge=Math.max(edge,right)}
    if(edge<width)dark.push({x:edge,y,w:width-edge,h})
  }
  return dark
}

/** Trace only the outside boundary; joined room and doorway regions have no internal seam. */
export function lightOutline(regions: LightRect[]): [number,number,number,number][] {
  const xs=[...new Set(regions.flatMap(r=>[r.x,r.x+r.w]))].sort((a,b)=>a-b)
  const ys=[...new Set(regions.flatMap(r=>[r.y,r.y+r.h]))].sort((a,b)=>a-b)
  const inside=(x:number,y:number)=>regions.some(r=>contains(r,x,y))
  const lines: [number,number,number,number][]=[]
  for(const x of xs)for(let i=0;i<ys.length-1;i++){const y=(ys[i]+ys[i+1])/2;if(inside(x-.1,y)!==inside(x+.1,y))lines.push([x,ys[i],x,ys[i+1]])}
  for(const y of ys)for(let i=0;i<xs.length-1;i++){const x=(xs[i]+xs[i+1])/2;if(inside(x,y-.1)!==inside(x,y+.1))lines.push([xs[i],y,xs[i+1],y])}
  return lines
}

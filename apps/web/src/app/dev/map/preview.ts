import type { AvatarLook, Dir } from "@/shared/protocol"
import { drawAvatar, renderStaticMap } from "@/office/game/art"
import { areas, areaCenter, findPath, isBlocked, seatAt, SPAWN, TILE } from "@/office/game/map"
import { OFFICE_DESKS, claimDesk, getDeskClaim, subscribeDeskChanges, unclaimDesk } from "@/office/game/deskClaims"

const positions = new Map<string, { x: number; y: number; dir: Dir }>()

/** Offline walk-through: shared artwork, seats, collision, paths and desk claims. */
export function mountMapPreview(host: HTMLDivElement, room: string, zoom: boolean) {
  const background = renderStaticMap(), area = areas.find(a => a.name === room)
  const ox = area ? (area.x - 2) * TILE : 0, oy = area ? (area.y - 4) * TILE : 0
  const canvas = document.createElement("canvas"), stage = document.createElement("div")
  canvas.width = area ? (area.w + 4) * TILE : background.width
  canvas.height = area ? (area.h + 6) * TILE : background.height
  stage.style.cssText = `position:relative;margin:auto;width:${zoom ? canvas.width * 2 + "px" : "100%"}`
  canvas.style.cssText = "image-rendering:pixelated;display:block;width:100%;height:auto;outline:none;cursor:crosshair"
  canvas.tabIndex = 0
  canvas.setAttribute("aria-label", "Office walk-through. WASD or arrow keys to move; click a destination; approach a desk to claim it.")
  stage.append(canvas); host.replaceChildren(stage)
  const ctx = canvas.getContext("2d")!
  let look: AvatarLook = { skin: "#dba579", hair: "#30251f", hairStyle: 0, shirt: "#667eea", pants: "#2c3e66" }
  let name = "Kamu", userId = "local-preview"
  try {
    const saved = JSON.parse(localStorage.getItem("oppera.profile") ?? "null")
    if (saved?.look?.skin && saved?.look?.hair && saved?.look?.shirt && saved?.look?.pants) look = saved.look
    if (typeof saved?.name === "string" && saved.name.trim()) name = saved.name.trim()
    userId = localStorage.getItem("oppera.preview-player-id") ?? crypto.randomUUID()
    localStorage.setItem("oppera.preview-player-id", userId)
  } catch { /* Storage is optional for local movement. */ }
  const user = { id: userId, name, color: look.shirt }
  const savedPosition = positions.get(room)
  const start = savedPosition && !isBlocked(savedPosition.x, savedPosition.y) ? [savedPosition.x, savedPosition.y] : area ? areaCenter(area) : null
  let x = start?.[0] ?? SPAWN.x, y = start?.[1] ?? SPAWN.y, fromX = x, fromY = y
  let dir: Dir = savedPosition?.dir ?? "down", started = -Infinity, hovering: string | null = null, dirty = true
  let path: [number, number][] = [], held: string[] = []
  const duration = 140
  const owns = (claim: ReturnType<typeof getDeskClaim>) => !!claim && (claim.userId === userId || claim.userName.toLowerCase() === name.toLowerCase())
  const controls = OFFICE_DESKS.map(desk => {
    const box = document.createElement("div")
    box.style.cssText = `position:absolute;left:${(desk.btnPos.x - ox) / canvas.width * 100}%;top:${(desk.btnPos.y - oy) / canvas.height * 100}%;transform:translate(-50%,-100%);display:none;align-items:center;flex-direction:column;gap:4px;z-index:2;white-space:nowrap;font:600 12px system-ui`
    const action = document.createElement("button"), badge = document.createElement("button")
    action.style.cssText = "background:#fff;color:#29292d;border:1px solid #ddd;padding:8px 12px;border-radius:9px;box-shadow:0 2px 8px #0003;cursor:pointer;font:inherit"
    badge.style.cssText = "background:#242429ed;color:white;border:1px solid #ffffff30;padding:6px 10px;border-radius:7px;font:inherit;cursor:pointer"
    box.append(badge, action); stage.append(box)
    action.onclick = () => {
      const claim = getDeskClaim(desk.id)
      if (owns(claim)) unclaimDesk(desk.id)
      else if (!claim) claimDesk(desk.id, user)
      canvas.focus({preventScroll:true}); dirty = true; updateControls()
    }
    badge.onclick = () => { held = []; path = findPath(x, y, ...desk.chairTile) ?? []; canvas.focus({preventScroll:true}) }
    return {desk, box, action, badge}
  })
  const updateControls = () => {
    for (const {desk,box,action,badge} of controls) {
      const claim = getDeskClaim(desk.id), mine = owns(claim)
      const near = Math.hypot(x-desk.chairTile[0], y-desk.chairTile[1]) <= 3.2
      const visible = desk.btnPos.x >= ox && desk.btnPos.x < ox + canvas.width && desk.btnPos.y >= oy && desk.btnPos.y < oy + canvas.height
      box.style.display = visible && (near || hovering === desk.id || mine) ? "flex" : "none"
      badge.textContent = claim ? `${claim.userName}'s desk` : "Unclaimed desk"
      badge.style.background = mine ? "#6252bb" : "#242429ed"
      badge.title = "Klik untuk berjalan dan duduk di meja ini"
      action.style.display = near && (!claim || mine) ? "block" : "none"
      action.textContent = mine ? "Release Desk" : "Move Desk Here"
    }
  }
  const unsub = subscribeDeskChanges(() => { dirty = true; updateControls() })
  const paint = (now: number) => {
    const t = Math.min(1, (now-started)/duration), moving = t < 1
    const rx = fromX+(x-fromX)*t, ry = fromY+(y-fromY)*t
    ctx.clearRect(0,0,canvas.width,canvas.height); ctx.imageSmoothingEnabled = false
    ctx.drawImage(background,ox,oy,canvas.width,canvas.height,0,0,canvas.width,canvas.height)
    const seat = moving ? null : seatAt(x,y)
    const cx = (rx+0.5)*TILE-ox, by = (ry+1)*TILE-oy-(seat?.lift ?? 0)
    drawAvatar(ctx,look,cx,by,seat && seat.dir !== "any" ? seat.dir : dir,moving ? Math.floor(now/90)%2 : 0,1,seat ? "sit" : "stand")
    const label = name === "Kamu" ? name : `${name} · kamu`
    ctx.font = "600 12px system-ui"; const w = ctx.measureText(label).width+22
    ctx.fillStyle="#6252bb"; ctx.fillRect(cx-w/2,by-65,w,21)
    ctx.fillStyle="#5aed85"; ctx.fillRect(cx-w/2+5,by-57,5,5)
    ctx.fillStyle="#fff"; ctx.textAlign="center"; ctx.fillText(label,cx+4,by-50)
    return moving
  }
  const keys: Record<string,[number,number]> = { ArrowUp:[0,-1],w:[0,-1],ArrowDown:[0,1],s:[0,1],ArrowLeft:[-1,0],a:[-1,0],ArrowRight:[1,0],d:[1,0] }
  const follow = () => {
    const scale = canvas.getBoundingClientRect().width/canvas.width
    const px=((x+0.5)*TILE-ox)*scale, py=((y+0.5)*TILE-oy)*scale, margin=90
    if(py < host.scrollTop+margin || py > host.scrollTop+host.clientHeight-margin) host.scrollTop=Math.max(0,py-host.clientHeight/2)
    if(px < host.scrollLeft+margin || px > host.scrollLeft+host.clientWidth-margin) host.scrollLeft=Math.max(0,px-host.clientWidth/2)
  }
  let request = 0
  const tick = (now: number) => {
    if(now-started >= duration) {
      const delta=keys[held[held.length-1]]
      const next: [number,number] | undefined = delta ? [x+delta[0],y+delta[1]] : path.shift()
      if(next) {
        dir=next[0]<x ? "left" : next[0]>x ? "right" : next[1]<y ? "up" : "down"
        if(!isBlocked(...next)) {fromX=x;fromY=y;[x,y]=next;started=now;follow();updateControls()}
        dirty=true
      }
    }
    if(dirty || now-started <= duration+20) dirty=paint(now)
    request=window.requestAnimationFrame(tick)
  }
  const onKey=(event:KeyboardEvent) => {
    const key=event.key.length===1 ? event.key.toLowerCase() : event.key
    if(!keys[key] || event.ctrlKey || event.metaKey || event.altKey) return
    event.preventDefault(); path=[]; if(!held.includes(key))held.push(key)
  }
  const onUp=(event:KeyboardEvent) => {const key=event.key.length===1 ? event.key.toLowerCase() : event.key;held=held.filter(k=>k!==key)}
  const onBlur=()=>{held=[];path=[]}
  const tileAt=(event:MouseEvent):[number,number] => {const b=canvas.getBoundingClientRect();return [Math.floor(((event.clientX-b.left)*canvas.width/b.width+ox)/TILE),Math.floor(((event.clientY-b.top)*canvas.height/b.height+oy)/TILE)]}
  const onClick=(event:MouseEvent) => {
    canvas.focus({preventScroll:true}); held=[]
    const [tx,ty]=tileAt(event)
    const desk=OFFICE_DESKS.find(d=>d.deskTiles.some(([dx,dy])=>dx===tx&&dy===ty))
    path=findPath(x,y,...(desk?.chairTile ?? [tx,ty])) ?? []
  }
  const onHover=(event:MouseEvent)=>{const [tx,ty]=tileAt(event);hovering=OFFICE_DESKS.find(d=>d.deskTiles.some(([dx,dy])=>dx===tx&&dy===ty)||d.chairTile[0]===tx&&d.chairTile[1]===ty)?.id ?? null;updateControls()}
  canvas.addEventListener("keydown",onKey);window.addEventListener("keyup",onUp)
  window.addEventListener("blur",onBlur);canvas.addEventListener("blur",onBlur)
  canvas.addEventListener("click",onClick);canvas.addEventListener("mousemove",onHover)
  const storage=()=>{dirty=true;updateControls()};window.addEventListener("storage",storage)
  updateControls();paint(performance.now());canvas.focus({preventScroll:true})
  const scale=canvas.getBoundingClientRect().width/canvas.width
  host.scrollTop=Math.max(0,((y+0.5)*TILE-oy)*scale-host.clientHeight/2)
  host.scrollLeft=Math.max(0,((x+0.5)*TILE-ox)*scale-host.clientWidth/2)
  request=window.requestAnimationFrame(tick)
  return ()=>{positions.set(room,{x,y,dir});window.cancelAnimationFrame(request);unsub();window.removeEventListener("keyup",onUp);window.removeEventListener("blur",onBlur);window.removeEventListener("storage",storage);stage.remove()}
}

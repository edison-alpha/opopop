import fs from 'node:fs';
let p='apps/web/src/office/game/doors.ts',s=fs.readFileSync(p,'utf8').replace('import { TILE }','import { doorFrame } from "./doorGeometry"\nimport { TILE }');s=s.replace('    this.gfx.clear()','    this.gfx.clear()\n    for (const p of doorFrame(this.def.tiles, this.def.orientation, this.def.id.startsWith("focus-")).posts) this.drawDoorPost(p.x,p.y,p.w,p.h)');
const a=s.indexOf('    const leftX = minX * TILE'),b=s.indexOf('    // 2. Garis ambang',a);s=s.slice(0,a)+`    const frame = doorFrame(tiles, 'horizontal', this.def.id.startsWith('focus-'))
    const leftX = frame.left, rightX = frame.right, centerY = frame.centerY
    if (this.def.id.startsWith('focus-')) return

`+s.slice(b);
s=s.replace('    const leafLen = 31','    const leafLen = (rightX - leftX) / 2 - 2');const vert=s.indexOf('  private renderVerticalDoor()');let v=s.slice(vert);v=v.replace('    this.drawDoorPost(centerX - 14, topY - 2, 28, 5)\n    this.drawDoorPost(centerX - 14, bottomY - 3, 28, 5)\n','');v=v.replaceAll('centerX + 12','centerX').replaceAll('centerX - 12','centerX - 2').replace('const leafLen = (rightX - leftX) / 2 - 2','const leafLen = (bottomY - topY) / 2 - 2').replace('const leafThick = 6','const leafThick = 4');s=s.slice(0,vert)+v;fs.writeFileSync(p,s);
p='apps/web/src/office/game/art.ts';s=fs.readFileSync(p,'utf8').replace('import { COURTYARD, MEDIA_ROOM }','import { doorFrame } from "./doorGeometry"\nimport { COURTYARD, MEDIA_ROOM, LAYOUT_DOORS }');s=s.replace('  // Objects row by row so taller sprites overlap the row above correctly.',`  for (const door of LAYOUT_DOORS) {
    const tiles: [number,number][] = [[OX+door.x,OY+door.y],[OX+door.x+(door.orientation==='horizontal'?1:0),OY+door.y+(door.orientation==='vertical'?1:0)]]
    for (const p of doorFrame(tiles,door.orientation,door.id.startsWith('focus-')).posts) {
      rect(ctx,p.x,p.y,p.w,p.h,'#966b4c'); rect(ctx,p.x+1,p.y+1,Math.max(1,p.w-2),p.h-2,'#e7b989')
    }
  }
  // Objects row by row so taller sprites overlap the row above correctly.`);fs.writeFileSync(p,s);
p='apps/web/src/office/game/map.ts';s=fs.readFileSync(p,'utf8').replace('koiPond: [3, 3]','koiPond: [4, 4]');fs.writeFileSync(p,s);
p='apps/web/src/office/game/defaultOffice.ts';s=fs.readFileSync(p,'utf8').replace('furnish(21, 3, "koiPond")','furnish(COURTYARD.x + (COURTYARD.w - 4) / 2, COURTYARD.y + (COURTYARD.h - 4) / 2, "koiPond")');fs.writeFileSync(p,s);

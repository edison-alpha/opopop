import fs from 'node:fs';
const p='apps/web/src/office/game/PhaserGame.tsx';let s=fs.readFileSync(p,'utf8').replace('import { positionAt }','import { focusAreaAt, roomLightRegions, outsideLightRects, lightOutline } from "./focusLighting"\nimport { positionAt }');const a=s.indexOf('    const key = area ? `${area.name}'),b=s.indexOf('\n  /** Runs after camera',a);if(a<0||b<0)throw Error('Lighting method not found');s=s.slice(0,a)+`    const regions = area ? roomLightRegions(area) : []
    const key = regions.length ? JSON.stringify(regions) : null
    if (key === this.dimKey) return
    this.dimKey = key
    this.dim.clear()
    if (!regions.length) return
    this.dim.fillStyle(0x111a20, 0.42)
    for (const r of outsideLightRects(regions, MAP_W*TILE, MAP_H*TILE)) this.dim.fillRect(r.x,r.y,r.w,r.h)
    this.dim.lineStyle(1,0xe5f0df,0.75)
    for (const [x1,y1,x2,y2] of lightOutline(regions)) this.dim.lineBetween(x1,y1,x2,y2)
  }
`+s.slice(b);s=s.replace('this.updateDim(me && !building ? areaAt(me.x, me.y) : null)','this.updateDim(me && !building ? focusAreaAt(me.rx+0.5, me.ry+0.5) : null)');fs.writeFileSync(p,s);

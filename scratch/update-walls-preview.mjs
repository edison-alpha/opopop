import fs from 'node:fs';
const p='apps/web/src/app/dev/map/page.tsx';let s=fs.readFileSync(p,'utf8');s=s.replace('import { renderStaticMap } from "@/office/game/art"','import { mountMapPreview } from "./preview"').replace('import { areas, TILE }','import { areas }');const a=s.indexOf('    const full = renderStaticMap()'),b=s.indexOf('\n  }, [ready, tab, room, zoom])',a);s=s.slice(0,a)+'    if (ref.current) return mountMapPreview(ref.current, room, zoom)'+s.slice(b);s=s.replace('editable tile map','Klik map lalu gunakan WASD / panah, atau klik tujuan');fs.writeFileSync(p,s);
const art='apps/web/src/office/game/art.ts';s=fs.readFileSync(art,'utf8');const start=s.indexOf('  // Executive Boardroom has elegant painted purple walls'),end=s.indexOf('\n}\n\nfunction drawFloor',start);s=s.slice(0,start)+`  // A continuous muted green back wall, with a thin rim rather than dark blocks.
  rect(ctx, px, py, T, T, "#6d7f80")
  rect(ctx, px, py, T, 2, "#9aaca5")
  rect(ctx, px, py + 2, T, 1, "#586e6d")
  if (face) {
    rect(ctx, px, py + T - 3, T, 1, "#8fa19a")
    rect(ctx, px, py + T - 2, T, 2, "#506967")
  }`+s.slice(end);fs.writeFileSync(art,s);

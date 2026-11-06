import fs from 'node:fs';let p='scripts/check-focus.mjs',s=fs.readFileSync(p,'utf8').replace('const seam=regions[0].y+regions[0].h;', 'const seam=(map.OY+room.y+room.h)*32+1;');fs.writeFileSync(p,s);

import fs from 'node:fs';
const p='apps/web/src/office/game/map.ts';let s=fs.readFileSync(p,'utf8');s=s.replace('= { roundTable:','= { furnishedDesk: [3, 1], studyShelf: [2, 1], pantryUnit: [3, 1], roundTable:');fs.writeFileSync(p,s);
const preview='apps/web/src/app/dev/map/page.tsx';s=fs.readFileSync(preview,'utf8').replace('48 furniture sprites','{Object.keys(OFFICE_SPRITE_FRAMES).length} furniture sprites').replace('Asset library · 48','Asset library · {Object.keys(OFFICE_SPRITE_FRAMES).length}');fs.writeFileSync(preview,s);

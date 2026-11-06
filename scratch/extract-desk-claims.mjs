import fs from 'node:fs';
const p='apps/web/src/office/game/desks.ts';const s=fs.readFileSync(p,'utf8');let shared=s.slice(s.indexOf('export const OX'),s.indexOf('/**\n * Phaser Renderer'));shared=shared.replaceAll('  store.emit()\n','').replace(/^  store\.toast\(.*\)\n/gm,'');shared=shared.replace('PRIVATE_OFFICES.map((r, i) => ({','[...PRIVATE_OFFICES.map((r, i) => ({');shared=shared.replace('}))\n\nconst STORAGE_KEY',` })), ...TEAM_DESKS.map((r, i): DeskDef => ({
  id: 'team-desk-' + (i + 1), roomName: 'Team desk ' + (i + 1), displayName: 'Team desk ' + (i + 1),
  chairTile: [OX + r.x + 1, OY + r.y + 1],
  deskTiles: Array.from({length:3}, (_, dx): [number,number] => [OX+r.x+dx,OY+r.y]),
  badgePos: {x:(OX+r.x+1.5)*TILE,y:(OY+r.y+2)*TILE},
  btnPos: {x:(OX+r.x+1.5)*TILE,y:(OY+r.y)*TILE+4},
  doorId: '', roomBounds: {x:OX+r.x,y:OY+r.y,w:3,h:3},
}))]\n\nconst STORAGE_KEY`);
shared=shared.replace('  // Lepaskan meja lama',`  const existing = claims[deskId]
  if (existing && existing.userId !== user.id && existing.userName.toLowerCase() !== user.name.toLowerCase()) return false

  // Lepaskan meja lama`);
fs.writeFileSync('apps/web/src/office/game/deskClaims.ts','import { TILE, setDeskNameResolver } from "./map"\nimport { OFFICE_ORIGIN, PRIVATE_OFFICES, TEAM_DESKS } from "./layout"\n'+shared);
const prefix='import * as Phaser from "phaser"\nimport { store, type Avatar } from "../store"\nimport { OFFICE_DESKS, getDeskClaim, claimDesk, unclaimDesk, subscribeDeskChanges, type DeskDef, type DeskClaim } from "./deskClaims"\nexport * from "./deskClaims"\nsubscribeDeskChanges(() => store.emit())\n\n';
fs.writeFileSync(p,prefix+s.slice(s.indexOf('/**\n * Phaser Renderer')));

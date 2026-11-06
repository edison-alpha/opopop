import fs from 'node:fs';
let p='apps/web/src/office/game/PhaserGame.tsx',s=fs.readFileSync(p,'utf8');s=s.replace('import { RoomLabelSystem }', 'import { positionAt } from "./motion"\nimport { positionMapOverlay, clearMapOverlayPositions } from "./overlayPositions"\nimport { RoomLabelSystem }');
s=s.replace('    this.voice = new VoiceActivity()', '    this.events.on(Phaser.Scenes.Events.RENDER, this.syncScreenUI, this)\n    this.cleanup.push(() => { this.events.off(Phaser.Scenes.Events.RENDER, this.syncScreenUI, this); clearMapOverlayPositions() })\n    this.voice = new VoiceActivity()');
s=s.replace('      const t = Math.min(1, (now - a.stepStart) / STEP_MS)\n      a.rx = a.fromX + (a.x - a.fromX) * t\n      a.ry = a.fromY + (a.y - a.fromY) * t\n      const walking = t < 1', '      const motion = positionAt(a, now, STEP_MS)\n      a.rx = motion.x\n      a.ry = motion.y\n      const walking = motion.walking');
const begin=s.indexOf('    const v = cam.worldView\n    store.view ='),end=s.indexOf('    const allPlayers =',begin);if(begin<0||end<0)throw Error('Overlay update not found');s=s.slice(0,begin)+s.slice(end);
const method=`  /** Runs after camera follow/preRender, using the exact sprite and camera matrix rendered this frame. */
  private syncScreenUI() {
    const cam = this.cameras.main, v = cam.worldView
    store.view = {x:v.x,y:v.y,w:v.width,h:v.height}
    for (const player of store.players.values()) {
      const sprite = this.sprites.get(player.id)
      if (!sprite) continue
      const point = cam.matrix.transformPoint(sprite.root.x - cam.scrollX, sprite.root.y + sprite.body.y - HEAD_H - 8 - cam.scrollY)
      positionMapOverlay('head:' + player.id, {x:point.x,y:point.y,visible:cam.zoom > 0.65 && (player.cam || store.preferences.nameLabels)})
    }
    const hover = store.hoverTile
    if (hover && !store.build.open && cam.zoom > 0.65) {
      const point = cam.matrix.transformPoint(hover.tx*TILE-cam.scrollX,hover.ty*TILE-cam.scrollY)
      positionMapOverlay('hover-tile',{x:point.x,y:point.y,visible:true})
    } else positionMapOverlay('hover-tile',{x:0,y:0,visible:false})
  }

`;
s=s.replace('  update(time: number) {',method+'  update(time: number) {');fs.writeFileSync(p,s);
p='apps/web/src/office/ui/GameUIOverlay.tsx';s=fs.readFileSync(p,'utf8').replace('useEffect, useRef, useState','useCallback, useEffect, useRef, useState');s=s.replace('import { TILE, areas, areaAt }','import { registerMapOverlay } from "../game/overlayPositions"\nimport { TILE, areas, areaAt }');s=s.replace('  toScreen,\n','');s=s.replace('  toScreen: (wx: number, wy: number) => { x: number; y: number }\n','');
const a=s.indexOf('  // Initial screen position'),b=s.indexOf('\n  return (',a);s=s.slice(0,a)+'  const bindHead = useCallback((node: HTMLDivElement | null) => registerMapOverlay("head:" + player.id, node), [player.id])\n'+s.slice(b);
s=s.replace('      id={`head-overlay-${player.id}`}','      id={`head-overlay-${player.id}`}\n      ref={bindHead}');s=s.replace('        transform: `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`,\n','');s=s.replace('      {isCamOn ? (','      <div style={{transform: "translate(-50%, -100%)"}}>\n      {isCamOn ? (');s=s.replace('      )}\n    </div>\n  )\n}', '      )}\n      </div>\n    </div>\n  )\n}',1);
s=s.replace('        toScreen={toScreen}\n','');
s=s.replace('if (isOverview || !hoverTile || !hoverTile.areaName || office.build.open) return null','if (isOverview || !hoverTile || office.build.open) return null');s=s.replace('    if (hoverTile.areaName === myAreaName) return null','    const showLabel = !!hoverTile.areaName && hoverTile.areaName !== myAreaName');s=s.replace('    const corner = Math.max(5, Math.min(8, 6 * zoom))\n','');s=s.replace('let displayTitle = hoverTile.areaName','let displayTitle = hoverTile.areaName ?? ""');s=s.replace('hoverTile.areaName.startsWith("Focus Booth")','hoverTile.areaName?.startsWith("Focus Booth")');
s=s.replace('      <div\n        style={{\n          position: "absolute",\n          left: 0,\n          top: 0,\n          transform: `translate3d(${x}px, ${y}px, 0)`,\n          transition: "transform 0.08s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.1s ease",','      <div\n        ref={node => registerMapOverlay("hover-tile", node)}\n        style={{\n          position: "absolute",\n          left: 0,\n          top: 0,\n          willChange: "transform",');
const c=s.indexOf('        {/* 4 Corner brackets'),d=s.indexOf('        {/* Sleek Dark Pill',c);s=s.slice(0,c)+'        <div aria-hidden="true" style={{position:"absolute",inset:1,border:"1px dotted rgba(255,255,255,0.8)",backgroundImage:"url(/assets/office/hover-tile.png)",backgroundSize:"100% 100%",imageRendering:"pixelated",filter:"drop-shadow(0 1px 1px #0005)"}} />\n\n'+s.slice(d);
s=s.replace('        {/* Sleek Dark Pill Room Label (Format & Style Persis Gather pada Screenshot Referensi 2) */}\n        <div','        {/* Room label stays separate from the tile highlight. */}\n        {showLabel && <div');s=s.replace('          {displayTitle}\n        </div>','          {displayTitle}\n        </div>}');fs.writeFileSync(p,s);

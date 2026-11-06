import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
const root=new URL('../',import.meta.url),require=createRequire(new URL('apps/web/package.json',root)),ts=require('typescript')
const compiled=new Map()
function moduleUrl(url){if(compiled.has(url.href))return compiled.get(url.href);let {outputText}=ts.transpileModule(readFileSync(url,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext},fileName:fileURLToPath(url)});outputText=outputText.replace(/from "(\.\.?\/[^"\n]+)"/g,(_,s)=>`from "${moduleUrl(new URL(s+'.ts',url))}"`);const result='data:text/javascript;base64,'+Buffer.from(outputText).toString('base64');compiled.set(url.href,result);return result}
const {DoorObject,OFFICE_DOORS}=await import(moduleUrl(new URL('apps/web/src/office/game/doors.ts',root)))
const sharpDir=readdirSync(new URL('node_modules/.pnpm',root)).find(n=>n.startsWith('sharp@0.35.5_'))
const sharp=require(fileURLToPath(new URL(`node_modules/.pnpm/${sharpDir}/node_modules/sharp`,root)))
const background=readFileSync(new URL('scratch/office-layout.png',root)).toString('base64')
const color=n=>'#'+n.toString(16).padStart(6,'0')
class Graphics{
 constructor(){this.parts=[];this.fill='#000';this.stroke='#000';this.alpha=1;this.width=1}
 setDepth(){return this}clear(){this.parts=[];return this}destroy(){}
 fillStyle(n,a=1){this.fill=color(n);this.alpha=a;return this}
 lineStyle(w,n,a=1){this.width=w;this.stroke=color(n);this.strokeAlpha=a;return this}
 fillRect(x,y,w,h){this.parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${this.fill}" opacity="${this.alpha}"/>`)}
 strokeRect(x,y,w,h){this.parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${this.stroke}" stroke-width="${this.width}"/>`)}
 fillPoints(p){this.parts.push(`<polygon points="${p.map(p=>`${p.x},${p.y}`).join(' ')}" fill="${this.fill}" opacity="${this.alpha}"/>`)}
 strokePoints(p){this.parts.push(`<polygon points="${p.map(p=>`${p.x},${p.y}`).join(' ')}" fill="none" stroke="${this.stroke}" stroke-width="${this.width}"/>`)}
 lineBetween(x1,y1,x2,y2){this.parts.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${this.stroke}" stroke-width="${this.width}" opacity="${this.strokeAlpha}"/>`)}
}
let states=[]
for(const open of [false,true]){const graphics=[];const scene={add:{graphics:()=>{const g=new Graphics();graphics.push(g);return g}}};const doors=OFFICE_DOORS.map(d=>new DoorObject(scene,d));if(open)for(const d of doors){const tiles=d.def.tiles;const players=[{x:(tiles[0][0]+tiles[1][0])/2+.5,y:(tiles[0][1]+tiles[1][1])/2+.5}];for(let frame=0;frame<60;frame++)d.update(players,1000/60)}states.push(graphics.map(g=>g.parts.join('')).join(''))}
const crop={x:400,y:440,w:1120,h:180}
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="440"><defs><image id="map" width="1824" height="1632" href="data:image/png;base64,${background}"/></defs>${states.map((s,i)=>`<text x="16" y="${24+i*220}" font-family="sans-serif" font-size="16" fill="#263a38">${i?'Terbuka otomatis ketika avatar mendekat':'Pintu tertutup · daun kayu, kaca, dan kusen sejajar lantai'}</text><svg x="0" y="${40+i*220}" width="1120" height="180" viewBox="${crop.x} ${crop.y} ${crop.w} ${crop.h}"><use href="#map"/>${s}</svg>`).join('')}</svg>`
await sharp(Buffer.from(svg)).png().toFile(fileURLToPath(new URL('scratch/office-doors-preview.png',root)))
console.log('Rendered actual DoorObject renderer in closed and open states.')

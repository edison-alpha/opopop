import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(import.meta.url)
const sharpPackage = readdirSync(path.join(root, 'node_modules/.pnpm')).find(n => n.startsWith('sharp@0.35.5_'))
if (!sharpPackage) throw new Error('The local Sharp asset build dependency is missing')
const sharp = require(path.join(root, 'node_modules/.pnpm', sharpPackage, 'node_modules/sharp'))
const dir = path.join(root, 'apps/web/public/assets/office')
mkdirSync(path.join(dir, 'individual'), {recursive:true})
const sets = [
  ['source-directions.png', ['blueSofaLeft','blueSofaRight','cognacSofaLeft','cognacSofaRight','meshChairLeft','meshChairRight','meshChairSouth','meshChairNorth','redChairSouth','redChairNorth','redChairWest','redChairEast','receptionBack','whiteDeskLeft','whiteDeskRight','oakCoffeeRect']],
  ['source-extras.png', ['pondCircular','fernGround','flowerPink','flowerBlue','trailingShelf','snakePlant','monstera','oakSideTable','recycleStation','snackVending','clockFace','landscapePoster','airConditioner','coatRack','firstAid','magazineRack']],
  ['source-desks.png', ['whiteDesk','equippedDesk','ovalHuddle','roundHuddle','meshChairFront','meshChairBack','cushionChairFront','cushionChairBack','cushionChairLeft','cushionChairRight','chartEasel','planningBoard','studyShelf','filingLaptop','globeLamp','pantryUnit']],
  ['source-sprites.png', ['couchFront','couchBack','officeChairBack','woodChairFront','birch','pine','plant','shelf','workDesk','reception','coffeeStation','fishTank','arcade','tv','whiteboard','coffeeTable']],
  ['source-seating.png', ['blueCouchFront','blueCouchBack','blueArmchairFront','blueArmchairBack','woodChairBack','woodChairLeft','woodChairRight','officeChairFront','beanbagBlue','beanbagPink','beanbagPurple','topiary','bamboo','terracottaPlant','sideTablePlant','sideTableMug']],
  ['source-office.png', ['bookcase','drinksFridge','printer','waterCooler','lockers','filingCabinet','floorLamp','pingpong','monitor','laptop','deskPhone','notebooks','window','doubleDoor','bench','koiPond']],
].filter(([name]) => existsSync(path.join(dir, name)))
const cell = 128, composites = [], frames = {}
let index = 0
for (const [file, keys] of sets) {
  const input = path.join(dir, file)
  const meta = await sharp(input).metadata()
  for (let i = 0; i < 16; i++) {
    const left = Math.round((i % 4) * meta.width / 4), top = Math.round(Math.floor(i / 4) * meta.height / 4)
    const width = Math.round((i % 4 + 1) * meta.width / 4) - left
    const height = Math.round((Math.floor(i / 4) + 1) * meta.height / 4) - top
    const {data, info} = await sharp(input).extract({left,top,width,height}).ensureAlpha().raw().toBuffer({resolveWithObject:true})
    const visited = new Uint8Array(width * height)
    let main = null
    // Ignore disconnected translucent generation fringes when framing a sprite.
    for (let n = 0; n < width * height; n++) {
      if (visited[n] || data[n * 4 + 3] < 160) continue
      const stack = [n]; visited[n] = 1
      let count = 0, x0 = width, y0 = height, x1 = 0, y1 = 0
      while (stack.length) {
        const k = stack.pop(), x = k % width, y = Math.floor(k / width)
        count++; x0 = Math.min(x0,x); y0 = Math.min(y0,y); x1 = Math.max(x1,x); y1 = Math.max(y1,y)
        for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          const nx=x+dx,ny=y+dy,j=ny*width+nx
          if(nx<0||ny<0||nx>=width||ny>=height||visited[j]||data[j*4+3]<160) continue
          visited[j]=1; stack.push(j)
        }
      }
      if (!main || count > main.count) main={count,x0,y0,x1,y1}
    }
    if (!main) throw new Error(`Empty sprite ${keys[i]}`)
    for (let j=3;j<data.length;j+=4) if(data[j]<160)data[j]=0
    const l=Math.max(0,main.x0-2),t=Math.max(0,main.y0-2)
    const crop={left:l,top:t,width:Math.min(width-l,main.x1-l+3),height:Math.min(height-t,main.y1-t+3)}
    const {data:sprite,info:size}=await sharp(data,{raw:info}).extract(crop).resize({width:104,height:104,fit:'inside',kernel:'nearest'}).png().toBuffer({resolveWithObject:true})
    const x=(index%4)*cell+Math.floor((cell-size.width)/2),y=Math.floor(index/4)*cell+Math.floor((cell-size.height)/2)
    composites.push({input:sprite,left:x,top:y})
    writeFileSync(path.join(dir, 'individual', `${keys[i]}.png`), sprite)
    frames[keys[i]]={x,y,w:size.width,h:size.height}
    index++
  }
}
await sharp({create:{width:cell*4,height:Math.ceil(index/4)*cell,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(composites).png().toFile(path.join(dir,'furniture.png'))
writeFileSync(path.join(root,'apps/web/src/office/game/sprite-frames.json'),JSON.stringify(frames,null,2)+'\n')
console.log(`Built ${index} framed pixel-art assets.`)

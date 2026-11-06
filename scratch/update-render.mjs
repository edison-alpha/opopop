import fs from 'node:fs';
let p='scratch/render-office.mjs',s=fs.readFileSync(p,'utf8');
s=s.replace("let {outputText}=ts.transpileModule", "if(url.pathname.endsWith('.json')){const r='data:text/javascript;base64,'+Buffer.from('export default '+readFileSync(url,'utf8')).toString('base64');cache.set(url.href,r);return r}\n let {outputText}=ts.transpileModule");
s=s.replace("new URL(s+'.ts',url)","new URL(s.endsWith('.json')?s:s+'.ts',url)");
s=s.replace('drawImage(c,x,y){', 'drawImage(c,...args){if(args.length===8){const [sx,sy,sw,sh,dx,dy,dw,dh]=args;this.canvas.parts.push(`<svg x="${dx+this.x}" y="${dy+this.y}" width="${dw}" height="${dh}" viewBox="${sx} ${sy} ${sw} ${sh}" preserveAspectRatio="none"><use href="#${c.id}"/></svg>`);return}const [x,y]=args;');
s=s.replace('const canvas=art.renderStaticMap();', "const sprites=await import(moduleUrl(new URL('apps/web/src/office/game/sprites.ts',root)));\nsprites.registerOfficeSprites({id:'atlas'});\nconst atlas=readFileSync(new URL('apps/web/public/assets/office/furniture.png',root)).toString('base64');\nconst canvas=art.renderStaticMap();");
s=s.replace('<defs>${canvases', '<defs><image id="atlas" width="512" height="1536" href="data:image/png;base64,${atlas}" style="image-rendering:pixelated"/>${canvases');
s=s.replace('for(const o of map.OBJS)', "await sharp(Buffer.from(svg),{limitInputPixels:false}).extract({left:17*32,top:18*32,width:12*32,height:12*32}).resize({width:768,kernel:'nearest'}).png().toFile(fileURLToPath(new URL('scratch/lounge-detail.png',root)));\nfor(const o of map.OBJS)");
fs.writeFileSync(p,s);

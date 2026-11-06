process.on('uncaughtException', e=>{process.stderr.write(e.message);process.exit(1)});
import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
const require=createRequire(new URL('apps/web/package.json',root));
const ts=require('typescript');
const sharp=require(fileURLToPath(new URL('node_modules/.pnpm/sharp@0.35.5_@types+node@24.19.2/node_modules/sharp',root)));
const cache=new Map();
function moduleUrl(url){
 if(cache.has(url.href))return cache.get(url.href);
 if(url.pathname.endsWith('.json')){const r='data:text/javascript;base64,'+Buffer.from('export default '+readFileSync(url,'utf8')).toString('base64');cache.set(url.href,r);return r}
 let {outputText}=ts.transpileModule(readFileSync(url,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});
 outputText=outputText.replace(/from "((?:\.\.?\/|@\/)[^"\n]+)"/g,(_,s)=>`from "${moduleUrl(s.startsWith('@/')?new URL('apps/web/src/'+s.slice(2)+'.ts',root):new URL(s.endsWith('.json')?s:s+'.ts',url))}"`);
 const r='data:text/javascript;base64,'+Buffer.from(outputText).toString('base64');cache.set(url.href,r);return r;
}
const canvases=[];
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
class Canvas{
 constructor(){this.id='c'+canvases.length;this.width=0;this.height=0;this.parts=[];this.ctx=new Context(this);canvases.push(this)}
 getContext(){return this.ctx}
}
class Context{
 constructor(canvas){this.canvas=canvas;this.fillStyle='#000';this.globalAlpha=1;this.x=0;this.y=0;this.stack=[]}
 save(){this.stack.push([this.x,this.y,this.fillStyle,this.globalAlpha])}
 restore(){[this.x,this.y,this.fillStyle,this.globalAlpha]=this.stack.pop()}
 translate(x,y){this.x+=x;this.y+=y}
 beginPath(){}rect(){}clip(){}clearRect(){}
 fillRect(x,y,w,h){if(w<=0||h<=0)return;this.canvas.parts.push(`<rect x="${x+this.x}" y="${y+this.y}" width="${w}" height="${h}" fill="${esc(this.fillStyle)}" opacity="${this.globalAlpha}"/>`)}
 drawImage(c,...args){if(args.length===8){const [sx,sy,sw,sh,dx,dy,dw,dh]=args;this.canvas.parts.push(`<svg x="${dx+this.x}" y="${dy+this.y}" width="${dw}" height="${dh}" viewBox="${sx} ${sy} ${sw} ${sh}" preserveAspectRatio="none"><use href="#${c.id}"/></svg>`);return}const [x,y]=args;this.canvas.parts.push(`<use href="#${c.id}" x="${x+this.x}" y="${y+this.y}"/>`)}
 createImageData(w,h){return {width:w,height:h,data:new Uint8ClampedArray(w*h*4)}}
 putImageData(img,ox,oy){for(let y=0;y<img.height;y++){let x=0;while(x<img.width){const i=(y*img.width+x)*4;const c=[...img.data.slice(i,i+3)].join(',');let n=1;while(x+n<img.width){let j=i+n*4;if([...img.data.slice(j,j+3)].join(',')!==c)break;n++}this.fillStyle=`rgb(${c})`;this.fillRect(x+ox,y+oy,n,1);x+=n}}}
}
globalThis.document={createElement:()=>new Canvas()};
const art=await import(moduleUrl(new URL('apps/web/src/office/game/art.ts',root)));
const map=await import(moduleUrl(new URL('apps/web/src/office/game/map.ts',root)));
const sprites=await import(moduleUrl(new URL('apps/web/src/office/game/sprites.ts',root)));
sprites.registerOfficeSprites({id:'atlas'});
const atlas=readFileSync(new URL('apps/web/public/assets/office/furniture.png',root)).toString('base64');
Canvas.prototype.style={};Canvas.prototype.focus=function(){};
Canvas.prototype.setAttribute=function(){};
Canvas.prototype.addEventListener=function(){};
Canvas.prototype.removeEventListener=function(){};
Canvas.prototype.getBoundingClientRect=function(){return {width:this.width,height:this.height}};
Context.prototype.measureText=function(t){return {width:t.length*7}};
Context.prototype.fillText=function(t,x,y){this.canvas.parts.push('<text x="'+x+'" y="'+y+'" text-anchor="middle" font-family="sans-serif" font-size="12" fill="white">'+esc(t)+'</text>')};
globalThis.window={setInterval:()=>0,clearInterval:()=>{}};
globalThis.localStorage={getItem:()=>null};
const preview=await import(moduleUrl(new URL('apps/web/src/app/dev/map/preview.ts',root)));
let canvas;
preview.mountMapPreview({replaceChildren:c=>canvas=c,clientHeight:900,clientWidth:1200},'Lobby',false);
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}"><defs><image id="atlas" width="512" height="2048" href="data:image/png;base64,${atlas}" style="image-rendering:pixelated"/>${canvases.map(c=>`<g id="${c.id}">${c.parts.join('')}</g>`).join('')}</defs><use href="#${canvas.id}"/></svg>`;
await sharp(Buffer.from(svg),{limitInputPixels:false}).resize({width:1000,kernel:'nearest'}).png().toFile(fileURLToPath(new URL('scratch/avatar-wall-preview.png',root)));
console.log('Rendered real walk-through with player and new walls.');



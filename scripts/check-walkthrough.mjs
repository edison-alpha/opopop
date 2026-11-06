process.on('uncaughtException', e=>{process.stderr.write(e.message);process.exit(1)});
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
const require=createRequire(new URL('apps/web/package.json',root));
const ts=require('typescript');
const cache=new Map();
function moduleUrl(url){
 if(cache.has(url.href))return cache.get(url.href);
 if(url.pathname.endsWith('.json')){const r='data:text/javascript;base64,'+Buffer.from('export default '+readFileSync(url,'utf8')).toString('base64');cache.set(url.href,r);return r}
 let {outputText}=ts.transpileModule(readFileSync(url,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});
 outputText=outputText.replace(/from "((?:\.\.?\/|@\/)[^"\n]+)"/g,(_,s)=>`from "${moduleUrl(s.startsWith('@/')?new URL('apps/web/src/'+s.slice(2)+'.ts',root):new URL(s.endsWith('.json')?s:s+'.ts',url))}"`);
 const r='data:text/javascript;base64,'+Buffer.from(outputText).toString('base64');cache.set(url.href,r);return r;
}

let callback, serial=0, cancelled=false;
const events=new Map(), memory=new Map();
globalThis.window={requestAnimationFrame:f=>{callback=f;return ++serial},cancelAnimationFrame:()=>cancelled=true,addEventListener:(n,f)=>events.set(n,f),removeEventListener:n=>events.delete(n)};
globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};
class Element {
 constructor(tag){this.tag=tag;this.children=[];this.style={};this.events=new Map();this.width=0;this.height=0;this.scrollTop=0;this.scrollLeft=0;this.clientWidth=1824;this.clientHeight=1632;const target={measureText:t=>({width:t.length*7}),createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4),width:w,height:h}),fillText:(text,x,y)=>this.label={text,x,y}};this.ctx=new Proxy(target,{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)})}
 append(...c){this.children.push(...c)}replaceChildren(...c){this.children=c}getContext(){return this.ctx}setAttribute(){}focus(){}remove(){this.removed=true}getBoundingClientRect(){return {left:0,top:0,width:this.width,height:this.height}}addEventListener(n,f){this.events.set(n,f)}removeEventListener(n){this.events.delete(n)}
}
globalThis.document={createElement:tag=>new Element(tag)};
const preview=await import(moduleUrl(new URL('apps/web/src/app/dev/map/preview.ts',root)));
const map=await import(moduleUrl(new URL('apps/web/src/office/game/map.ts',root)));
const desks=await import(moduleUrl(new URL('apps/web/src/office/game/deskClaims.ts',root)));
const host=new Element('host'),cleanup=preview.mountMapPreview(host,'Full office',false),stage=host.children[0],canvas=stage.children[0];
const desk=desks.OFFICE_DESKS[4];
canvas.events.get('click')({clientX:(desk.deskTiles[0][0]+0.5)*32,clientY:(desk.deskTiles[0][1]+0.5)*32});
for(let time=0;time<20000;time+=16)callback(time);
assert.equal(canvas.label.x,(desk.chairTile[0]+0.5)*32+4);
assert.equal(canvas.label.y,(desk.chairTile[1]+1)*32-9-50,'Avatar should sit on arrival');
const control=stage.children[5],action=control.children.find(c=>c.textContent==='Move Desk Here');assert(action);
action.onclick();assert.equal(desks.getDeskClaim(desk.id).userName,'Kamu');assert.equal(action.textContent,'Release Desk');
canvas.events.get('keydown')({key:'ArrowDown',preventDefault(){}});callback(20000);const before=canvas.label.y;callback(20064);assert(canvas.label.y>before,'Walking must interpolate between tiles');
for(let time=20080;time<20400;time+=16)callback(time);
events.get('keyup')({key:'ArrowDown'});for(let time=20400;time<21000;time+=16)callback(time);const stopped=canvas.label.y;callback(22000);assert.equal(canvas.label.y,stopped,'Key release must stop walking');
canvas.events.get('keydown')({key:'ArrowDown',preventDefault(){}});events.get('blur')();callback(23000);assert.equal(canvas.label.y,stopped,'Blur must clear held keys');
cleanup();assert(cancelled);assert(stage.removed);assert.equal(events.size,0);
console.log('Walk-through checks passed: click desk, pathfinding, automatic sitting, claim/release UI, held-key interpolation, key release, blur and cleanup.');

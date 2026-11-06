import fs from 'node:fs';let s=fs.readFileSync('scripts/check-map.mjs','utf8');s=s.slice(0,s.indexOf('const map = await import'));s+=`
const {wallShape,HORIZONTAL_WALL_RISE}=await import(moduleUrl(new URL('apps/web/src/office/game/wallGeometry.ts',root)));
const grid=points=>{const set=new Set(points.map(p=>p.join(',')));return (x,y)=>set.has([x,y].join(','))};
for(const points of [[[0,0],[0,1],[1,1],[2,1]],[[1,0],[0,1],[1,1],[2,1]],[[2,0],[0,1],[1,1],[2,1]]]) {
 const isWall=grid(points),shapes=[0,1,2].map(x=>wallShape(x,1,isWall));
 for(const shape of shapes){assert.equal(shape.y,32-HORIZONTAL_WALL_RISE,'L/T corner must share the raised top edge');assert.equal(shape.h,32+HORIZONTAL_WALL_RISE)}
 const vertical=wallShape(points[0][0],0,isWall);assert.equal(vertical.horizontal,false);assert.equal(vertical.w,6,'Vertical partition stays thin');
}
const stacked=grid([[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]]);
assert.equal(wallShape(1,1,stacked).rise,0,'Stacked wall rows must not be raised twice');
assert.equal(wallShape(1,0,stacked).y,-HORIZONTAL_WALL_RISE);
console.log('Wall checks passed: L/T joins flush on both ends, thin vertical partitions, continuous raised faces and stacked-row heights.');
`;fs.writeFileSync('scripts/check-walls.mjs',s);

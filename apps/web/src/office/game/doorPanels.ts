import { HORIZONTAL_WALL_RISE } from "./wallGeometry"

export interface Point { x:number; y:number }
/** An upright panel projected into the same view as a raised horizontal wall. */
export function doorPanel(hingeX:number, baseY:number, width:number, side:1|-1, openness:number, swing:1|-1, tile=32) {
  const angle=Math.max(0,Math.min(1,openness))*Math.PI*.47
  const dx=side*Math.cos(angle)*width, dy=swing*Math.sin(angle)*width*.4
  const height=tile+HORIZONTAL_WALL_RISE-4
  const point=(u:number,v:number):Point=>({x:hingeX+dx*u,y:baseY+dy*u-height*v})
  const quad=(u0:number,v0:number,u1:number,v1:number)=>[point(u0,v0),point(u1,v0),point(u1,v1),point(u0,v1)]
  return { point, outline:quad(0,0,1,1), inset:quad(.14,.1,.86,.42), glass:quad(.14,.52,.86,.88), handle:[point(.88,.43),point(.88,.55)] }
}

import type { CalendarEvent } from "./calendar"

export const dayStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
export function addDays(date: Date, days: number) { const d=new Date(date); d.setDate(d.getDate()+days); return d }
export function weekStart(date: Date) { return addDays(dayStart(date),-date.getDay()) }
export function localDate(value: number | Date) { const d=new Date(value);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}` }
export function parseDate(date: string) { const [y,m,d]=date.split("-").map(Number);return new Date(y,m-1,d).getTime() }
export const overlaps = (start: number,end: number,min: number,max: number) => start<max&&end>min
export function visibleWeekEvents(events: CalendarEvent[], start: Date) {return events.filter(e=>overlaps(e.start,e.end,start.getTime(),addDays(start,7).getTime()))}

export function allDaySegments(events: CalendarEvent[], start: Date) {
  const days=Array.from({length:7},(_,i)=>addDays(start,i).getTime()),end=addDays(start,7).getTime()
  const lanes:number[]=[]
  return events.filter(e=>overlaps(e.start,e.end,days[0],end)).sort((a,b)=>a.start-b.start||b.end-a.end).map(event=>{
    let first=days.findIndex((_,i)=>overlaps(event.start,event.end,days[i],i===6?end:days[i+1]))
    if(first<0)first=0
    let last=first;while(last<6&&event.end>days[last+1])last++
    let lane=lanes.findIndex(end=>end<first);if(lane<0)lane=lanes.length;lanes[lane]=last
    return {event,first,last,lane}
  })
}

/** Partition overlapping events into lanes; separate groups can use the full column. */
export function timedSegments(events: CalendarEvent[], date: Date) {
  const min=dayStart(date).getTime(),max=addDays(dayStart(date),1).getTime()
  const items=events.filter(e=>overlaps(e.start,e.end,min,max)).map(event=>{
    const start=new Date(Math.max(min,event.start)),end=Math.min(max,event.end)
    return {event,start:Math.max(min,event.start),end,top:start.getHours()*60+start.getMinutes(),height:Math.max(20,(end-start.getTime())/60000),lane:0,lanes:1}
  }).sort((a,b)=>a.start-b.start||b.end-a.end)
  let group:typeof items=[],ends:number[]=[],until=0
  const finish=()=>{for(const item of group)item.lanes=ends.length;group=[];ends=[];until=0}
  for(const item of items){if(group.length&&item.start>=until)finish();let lane=ends.findIndex(end=>end<=item.start);if(lane<0)lane=ends.length;ends[lane]=item.end;item.lane=lane;group.push(item);until=Math.max(until,item.end)}finish()
  return items
}

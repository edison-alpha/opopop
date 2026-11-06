import type { Meeting } from "@/shared/protocol"
import { getEnv } from "@/shared/env"
import { store } from "../store"
import { localDate, parseDate } from "./calendarLayout"

export interface CalendarEvent {
  id:string; title:string; start:number; end:number; allDay?:boolean; room?:string; description?:string
  source:"oppera"|"google"; htmlLink?:string; color?:string; calendarId?:string; externalId?:string; writable?:boolean; recurring?:boolean; createdBy?:string
}
export interface GoogleCalendar { id:string; name:string; primary:boolean; writable:boolean; color:string }
export interface EventInput { title:string;start:number;end:number;allDay:boolean;room:string;description:string }
interface TokenResponse {access_token?:string;expires_in?:number;scope?:string;error?:string;error_description?:string}
interface GoogleOAuth {initTokenClient:(config:{client_id:string;scope:string;callback:(r:TokenResponse)=>void;error_callback:(r:{type:string})=>void})=>{requestAccessToken:(options:{prompt:string})=>void};hasGrantedAllScopes:(response:TokenResponse,...scopes:string[])=>boolean;revoke:(token:string,callback:()=>void)=>void}
declare global {interface Window {google?:{accounts:{oauth2:GoogleOAuth}}}}
const SCOPES=["https://www.googleapis.com/auth/calendar.events","https://www.googleapis.com/auth/calendar.calendarlist.readonly"]
const TOKEN_KEY="oppera.gcal.session",SELECTION_KEY="oppera.gcal.selection"
let sdkPromise:Promise<void>|null=null
export function loadGoogleIdentity():Promise<void> {
  if(window.google?.accounts?.oauth2)return Promise.resolve()
  return sdkPromise??=new Promise((resolve,reject)=>{
    const script=document.createElement("script");script.src="https://accounts.google.com/gsi/client";script.async=true
    const timer=setTimeout(()=>fail(),15000)
    const fail=()=>{clearTimeout(timer);script.remove();sdkPromise=null;reject(new Error("Google tidak dapat dimuat. Periksa koneksi lalu coba lagi."))}
    script.onerror=fail;script.onload=()=>{clearTimeout(timer);window.google?.accounts?.oauth2?resolve():fail()};document.head.append(script)
  })
}
export function googleEvent(item:any,calendar:GoogleCalendar):CalendarEvent|null {
  if(item.status==="cancelled"||!item.start||!item.end)return null
  const allDay=!!item.start.date,start=allDay?parseDate(item.start.date):Date.parse(item.start.dateTime),end=allDay?parseDate(item.end.date):Date.parse(item.end.dateTime)
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return null
  return {id:`google:${calendar.id}:${item.id}`,externalId:item.id,calendarId:calendar.id,title:item.summary||"(Untitled)",start,end,allDay,description:item.description??"",room:item.location??"",source:"google",htmlLink:item.htmlLink,color:calendar.color,writable:calendar.writable,recurring:!!item.recurringEventId}
}
export class CalendarService {
  private token:string|null=null;private expiresAt=0;private epoch=0;private controller:AbortController|null=null;private expiryTimer:ReturnType<typeof setTimeout>|null=null
  private events:CalendarEvent[]=[]
  calendars:GoogleCalendar[]=[];selectedIds:string[]=[];syncing=false;lastSync:number|null=null;error:string|null=null;expired=false
  readonly clientId=getEnv("VITE_GOOGLE_CLIENT_ID")
  constructor(){try{localStorage.removeItem("oppera.gcal.token");const saved=JSON.parse(sessionStorage.getItem(TOKEN_KEY)??"null");if(saved?.token&&saved.expiresAt>Date.now()){this.token=saved.token;this.expiresAt=saved.expiresAt;this.scheduleExpiry()}else if(saved){this.expired=true;sessionStorage.removeItem(TOKEN_KEY)}this.selectedIds=JSON.parse(localStorage.getItem(SELECTION_KEY)??"[]")}catch{}}
  get isConfigured(){return !!this.clientId}
  get isConnected(){return !!this.token&&Date.now()<this.expiresAt}
  get selectionKey(){return this.selectedIds.join("|")}
  get accountLabel(){return this.calendars.find(c=>c.primary)?.name??"Google Calendar"}
  get writableCalendars(){return this.calendars.filter(c=>c.writable)}
  private emit(){store.emit()}
  private scheduleExpiry(){if(this.expiryTimer)clearTimeout(this.expiryTimer);this.expiryTimer=setTimeout(()=>this.expire(),Math.max(0,this.expiresAt-Date.now()))}
  private expire(){this.token=null;this.expiresAt=0;this.expired=true;this.events=[];try{sessionStorage.removeItem(TOKEN_KEY)}catch{}this.error="Sesi Google berakhir. Hubungkan kembali untuk melanjutkan sinkronisasi.";this.emit()}
  async connect():Promise<void>{
    if(!this.clientId)throw new Error("Google Calendar belum diaktifkan untuk workspace ini. Hubungi admin workspace.")
    const oauth=window.google?.accounts?.oauth2;if(!oauth)throw new Error("Google masih dimuat. Coba lagi sebentar.")
    const epoch=++this.epoch
    const response=await new Promise<TokenResponse>((resolve,reject)=>{
      let done=false;const finish=(result:TokenResponse|Error)=>{if(done)return;done=true;clearTimeout(timer);result instanceof Error?reject(result):resolve(result)}
      const timer=setTimeout(()=>finish(new Error("Koneksi Google belum selesai. Coba hubungkan kembali.")),120000)
      const client=oauth.initTokenClient({client_id:this.clientId,scope:SCOPES.join(" "),callback:r=>r.error?finish(new Error(r.error==="access_denied"?"Izin Google dibatalkan. Kalender OPERRA tetap bisa digunakan.":r.error_description||"Google tidak dapat dihubungkan.")):finish(r),error_callback:r=>finish(new Error(r.type==="popup_closed"?"Jendela Google ditutup sebelum selesai.":"Izinkan pop-up untuk menghubungkan Google Calendar."))})
      client.requestAccessToken({prompt:"consent"})
    })
    if(epoch!==this.epoch)return
    if(!response.access_token||!oauth.hasGrantedAllScopes(response,...SCOPES))throw new Error("Izin kalender belum lengkap. Hubungkan ulang dan izinkan akses kalender.")
    this.token=response.access_token;this.expiresAt=Date.now()+Math.max(0,Number(response.expires_in??0)-30)*1000;this.expired=false;this.error=null
    try{sessionStorage.setItem(TOKEN_KEY,JSON.stringify({token:this.token,expiresAt:this.expiresAt}))}catch{}
    this.scheduleExpiry()
    try{await this.loadCalendars();if(epoch===this.epoch)this.emit()}catch(error){this.disconnect(false);throw error}
  }
  disconnect(revoke=true){const token=this.token;this.epoch++;this.controller?.abort();this.token=null;this.expiresAt=0;this.calendars=[];this.selectedIds=[];this.events=[];this.error=null;this.expired=false;this.lastSync=null;this.syncing=false;if(this.expiryTimer)clearTimeout(this.expiryTimer);try{sessionStorage.removeItem(TOKEN_KEY);localStorage.removeItem(SELECTION_KEY);localStorage.removeItem("oppera.gcal.ics")}catch{}if(revoke&&token)window.google?.accounts.oauth2.revoke(token,()=>{});this.emit()}
  setSelected(ids:string[]){this.selectedIds=ids.filter(id=>this.calendars.some(c=>c.id===id));try{localStorage.setItem(SELECTION_KEY,JSON.stringify(this.selectedIds))}catch{}this.events=this.events.filter(e=>this.selectedIds.includes(e.calendarId??""));this.emit()}
  private async request(path:string,init:RequestInit={},signal?:AbortSignal){
    if(!this.isConnected){this.expire();throw new Error(this.error!)}
    const response=await fetch(`https://www.googleapis.com/calendar/v3/${path}`,{...init,signal:signal?AbortSignal.any([signal,AbortSignal.timeout(20000)]):AbortSignal.timeout(20000),headers:{Authorization:`Bearer ${this.token}`,"Content-Type":"application/json",...init.headers}})
    if(!response.ok){if(response.status===401){this.expire();throw new Error(this.error!)}const body=await response.json().catch(()=>null);throw new Error(response.status===403?"Google menolak akses. Periksa izin Calendar API atau hubungkan ulang akun Anda.":body?.error?.message||`Google Calendar gagal merespons (${response.status}).`)}
    return response.status===204?null:response.json()
  }
  private async pages(path:string,params:URLSearchParams,signal?:AbortSignal){const items:any[]=[];const seen=new Set<string>();let token="";do{if(token)params.set("pageToken",token);const data=await this.request(`${path}?${params}`,{},signal);items.push(...(data.items??[]));token=data.nextPageToken??"";if(token&&seen.has(token))throw new Error("Google mengembalikan halaman kalender berulang. Coba sync lagi.");seen.add(token)}while(token);return items}
  async loadCalendars(){const items=await this.pages("users/me/calendarList",new URLSearchParams({maxResults:"250"}));this.calendars=items.filter(c=>c.accessRole!=="freeBusyReader").map(c=>({id:c.id,name:c.summaryOverride||c.summary||c.id,primary:!!c.primary,writable:c.accessRole==="owner"||c.accessRole==="writer",color:c.backgroundColor||"#0891b2"}));const selected=this.selectedIds.filter(id=>this.calendars.some(c=>c.id===id));if(!selected.length&&this.calendars.length)this.selectedIds=[(this.calendars.find(c=>c.primary)??this.calendars[0]).id];else this.selectedIds=selected}
  async sync(min:Date,max:Date):Promise<void>{
    if(!this.isConnected)return
    const epoch=++this.epoch;this.controller?.abort();const controller=new AbortController();this.controller=controller;this.syncing=true;this.error=null;this.emit()
    try{if(!this.calendars.length)await this.loadCalendars();const events=(await Promise.all(this.calendars.filter(c=>this.selectedIds.includes(c.id)).map(async calendar=>{const items=await this.pages(`calendars/${encodeURIComponent(calendar.id)}/events`,new URLSearchParams({singleEvents:"true",orderBy:"startTime",showDeleted:"false",maxResults:"2500",timeMin:min.toISOString(),timeMax:max.toISOString()}),controller.signal);return items.map(i=>googleEvent(i,calendar)).filter((e):e is CalendarEvent=>e!==null)}))).flat();if(epoch===this.epoch&&this.isConnected){this.events=events;this.lastSync=Date.now()}}
    catch(error){if(epoch===this.epoch&&!controller.signal.aborted){this.error=error instanceof Error?error.message:"Sinkronisasi gagal. Periksa koneksi Anda.";throw new Error(this.error)}}
    finally{if(epoch===this.epoch){this.syncing=false;this.emit()}}
  }
  async saveGoogle(input:EventInput,calendarId:string,event?:CalendarEvent){if(!this.calendars.some(c=>c.id===calendarId&&c.writable))throw new Error("Kalender ini hanya dapat dibaca.");if(!input.title.trim()||!Number.isFinite(input.start)||!Number.isFinite(input.end)||input.end<=input.start)throw new Error("Judul dan rentang waktu wajib valid.");const body={summary:input.title.trim(),description:input.description,location:input.room,start:input.allDay?{date:localDate(input.start)}:{dateTime:new Date(input.start).toISOString()},end:input.allDay?{date:localDate(input.end)}:{dateTime:new Date(input.end).toISOString()}};await this.request(`calendars/${encodeURIComponent(calendarId)}/events${event?`/${encodeURIComponent(event.externalId!)}`:""}`,{method:event?"PATCH":"POST",body:JSON.stringify(body)})}
  async deleteGoogle(event:CalendarEvent){if(!event.writable||!event.calendarId||!event.externalId)throw new Error("Event ini tidak dapat dihapus dari OPERRA.");await this.request(`calendars/${encodeURIComponent(event.calendarId)}/events/${encodeURIComponent(event.externalId)}`,{method:"DELETE"});this.events=this.events.filter(e=>e.id!==event.id);this.emit()}
  getAllEvents(meetings:Meeting[]):CalendarEvent[]{return [...this.events,...meetings.map(m=>({id:`oppera-${m.id}`,externalId:m.id,title:m.title,start:m.start,end:m.start+m.durationMin*60000,room:m.room,description:m.description,source:"oppera" as const,color:"#6366f1",createdBy:m.createdBy}))].sort((a,b)=>a.start-b.start)}
}
export const calendarService=new CalendarService()

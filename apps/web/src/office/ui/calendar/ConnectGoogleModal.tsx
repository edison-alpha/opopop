"use client"
import { useEffect, useState } from "react"
import { calendarService, loadGoogleIdentity } from "../../services/calendar"
import { X } from "../common/icons"
export function ConnectGoogleModal({onClose}:{onClose:()=>void}) {
 const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("")
 const [,refresh]=useState(0)
 useEffect(()=>{let active=true;if(calendarService.isConfigured)loadGoogleIdentity().then(()=>{if(active)setReady(true)}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[])
 const connect=async()=>{setBusy(true);setError("");try{await calendarService.connect();refresh(n=>n+1)}catch(e){setError(e instanceof Error?e.message:"Koneksi gagal.")}finally{setBusy(false)}}
 return <div className="modal-backdrop" onClick={()=>!busy&&onClose()}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="google-calendar-title" onClick={e=>e.stopPropagation()}>
 <div className="modal-head"><h2 className="modal-title" id="google-calendar-title">Google Calendar</h2><button className="icon-btn" disabled={busy} onClick={onClose} aria-label="Close"><X size={18}/></button></div>
 <p>Jadwal kantor tetap bisa digunakan tanpa akun Google. Hubungkan akun untuk menampilkan kalender Google Anda.</p>
 {!calendarService.isConfigured&&<p role="status">Integrasi Google belum dikonfigurasi. Admin perlu mengisi VITE_GOOGLE_CLIENT_ID pada konfigurasi aplikasi.</p>}
 {calendarService.isConnected&&<><p>{calendarService.accountLabel}</p><fieldset style={{display:"grid",gap:12,border:0,padding:0}}><legend>Kalender yang ditampilkan</legend>{calendarService.calendars.map(c=><label key={c.id} style={{display:"flex",gap:8,alignItems:"center"}}><input type="checkbox" checked={calendarService.selectedIds.includes(c.id)} onChange={e=>{calendarService.setSelected(e.target.checked?[...calendarService.selectedIds,c.id]:calendarService.selectedIds.filter(id=>id!==c.id));refresh(n=>n+1)}}/>{c.name}{!c.writable&&" · Hanya baca"}</label>)}</fieldset></>}
 {error&&<p role="alert">{error}</p>}
 <div className="modal-actions">{calendarService.isConnected?<><button className="btn btn-ghost" onClick={()=>{calendarService.disconnect();refresh(n=>n+1)}}>Disconnect</button><button className="btn btn-blue" onClick={onClose}>Done</button></>:<button className="btn btn-blue" disabled={busy||!ready} onClick={connect}>{busy?"Menghubungkan…":"Connect Google Calendar"}</button>}</div>
 </section></div>
}

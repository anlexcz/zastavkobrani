"use strict";
// Herní den a uzávěrka v pražském časovém pásmu.
export const shortDay=d=>d.toISOString().slice(0,10);
export const addDays = (day,n) => shortDay(new Date(Date.parse(day+"T12:00:00Z") + n*86400000));
export const diffDays=(a,b)=>Math.round((Date.parse(a+"T12:00:00Z")-Date.parse(b+"T12:00:00Z"))/86400000);
export function gameDay(date=new Date()){const f=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Prague",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",hourCycle:"h23"});const parts=Object.fromEntries(f.formatToParts(date).filter(p=>p.type!=="literal").map(p=>[p.type,p.value]));const d=parts.year+"-"+parts.month+"-"+parts.day;return Number(parts.hour)<3?addDays(d,-1):d;}
// Převod uzávěrky 03:00 Europe/Prague, včetně změn času.
export function pragueBoundaryUtc(day){
 const target=Date.parse(day+"T03:00:00Z");
 const f=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Prague",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"});
 let instant=target;
 for(let i=0;i<3;i++){
  const p=Object.fromEntries(f.formatToParts(new Date(instant)).filter(v=>v.type!=="literal").map(v=>[v.type,v.value]));
  const local=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);
  instant+=target-local;
 }
 return new Date(instant).toISOString();
}
export function nextGameBoundary(now=new Date()){return pragueBoundaryUtc(addDays(gameDay(now),1))}

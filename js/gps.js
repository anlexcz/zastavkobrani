"use strict";
// Čisté výpočty GPS; každá herní akce vždy požaduje nové geolokační měření.
export const GPS_STALE_MS=10000;
export function formatStopDistance(distance){
  if(distance<1000)return Math.round(distance)+" m";
  if(distance<10000)return (distance/1000).toFixed(1).replace(".",",")+" km";
  return Math.round(distance/1000)+" km";
}
export function haversineM(a,b,c,d){
  const rad=Math.PI/180,dl=(c-a)*rad,doLon=(d-b)*rad;
  const h=Math.sin(dl/2)**2+Math.cos(a*rad)*Math.cos(c*rad)*Math.sin(doLon/2)**2;
  return 6371000*2*Math.asin(Math.min(1,Math.sqrt(h)));
}
export function nearestStopDistance(stop,coords){
  return Math.min(...stop.points.filter(p=>!p.isMetro&&p.insidePrague).map(p=>
    haversineM(coords.latitude,coords.longitude,p.lat,p.lon)));
}
export function stopLocationState(stop,{position=null,permissionDenied=false,watch=null}={},now=Date.now()){
  if(permissionDenied)return {ok:false,status:"Poloha zamítnuta",distance:null};
  if(!position)return {ok:false,status:watch!==null?"Zjišťování polohy":"Poloha nedostupná",distance:null};
  const distance=nearestStopDistance(stop,{latitude:position.lat,longitude:position.lng});
  if(!Number.isFinite(distance))return {ok:false,status:"GPS bod není dostupný",distance:null};
  if(!Number.isFinite(position.timestamp)||now-position.timestamp>GPS_STALE_MS||position.timestamp>now+1000)return {ok:false,status:"Poloha není aktuální",distance};
  if(!Number.isFinite(position.accuracy)||position.accuracy<0||position.accuracy>25)return {ok:false,status:"Nepřesná GPS (±"+Math.round(position.accuracy)+" m)",distance};
  return {ok:distance<=30,status:distance<=30?"V dosahu 30 m":"Mimo dosah 30 m",distance};
}
export async function verifyGps(stop,{geolocation=globalThis.navigator?.geolocation,secure=globalThis.isSecureContext,now=Date.now,maxAttempts=2}={}){
 if(!geolocation||!secure)throw Error("Pro ověření polohy je nutné HTTPS a přístup ke GPS.");
 let last;
 for(let attempt=0;attempt<maxAttempts;attempt++){
  try{
   const pos=await new Promise((resolve,reject)=>geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,maximumAge:0,timeout:10000}));
   const age=now()-pos.timestamp,accuracy=pos.coords.accuracy,distance=nearestStopDistance(stop,pos.coords);
   if(!Number.isFinite(age)||age>GPS_STALE_MS||age< -1000)throw Error("GPS měření je zastaralé.");
   if(!Number.isFinite(accuracy)||accuracy<0||accuracy>25)throw Error("GPS není dost přesná. Potřebujeme přesnost nejvýše 25 m.");
   if(!Number.isFinite(distance)||distance>30)throw Error("Nejsi v pracovním dosahu 30 m od zastávky.");
   return {distance,accuracy,lat:pos.coords.latitude,lon:pos.coords.longitude};
  }catch(error){if(error.code===1)throw Error("Poloha byla zamítnuta. Povol ji v prohlížeči.");last=error instanceof Error?error:Error("GPS polohu se nepodařilo zjistit.");}
 }
 throw last||Error("GPS ověření selhalo.");
}

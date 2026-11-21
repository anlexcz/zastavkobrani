"use strict";
// Čisté výpočty GPS; každá herní akce vždy požaduje nové geolokační měření.
export const GPS_STALE_MS=15000;
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
  if(now-position.timestamp>GPS_STALE_MS)return {ok:false,status:"Poloha není aktuální",distance};
  if(position.accuracy>30)return {ok:false,status:"Nepřesná GPS (±"+Math.round(position.accuracy)+" m)",distance};
  return {ok:distance<=30,status:distance<=30?"V dosahu 30 m":"Mimo dosah 30 m",distance};
}
export function verifyGps(stop){
  return new Promise((resolve,reject)=>{
    if(!navigator.geolocation||!window.isSecureContext){
      reject(Error("Pro ověření polohy je nutné HTTPS a přístup ke GPS."));return;
    }
    navigator.geolocation.getCurrentPosition(
      pos=>{
        const age=Date.now()-pos.timestamp;
        const accuracy=pos.coords.accuracy;
        const distance=nearestStopDistance(stop,pos.coords);
        if(age>10000){reject(Error("GPS měření je zastaralé. Zkus to znovu."));return;}
        if(!Number.isFinite(accuracy)||accuracy>30){
          reject(Error("GPS zatím není dost přesná (±"+Math.round(accuracy)+" m). Potřebujeme přesnost nejvýše 30 m."));return;
        }
        if(!Number.isFinite(distance)||distance>30){
          reject(Error("Jsi "+Math.round(distance)+" m od nejbližšího bodu zastávky. Limit je 30 m."));return;
        }
        resolve({distance,accuracy,lat:pos.coords.latitude,lon:pos.coords.longitude});
      },
      err=>reject(Error(({1:"Poloha byla zamítnuta. Povol ji v nastavení prohlížeče.",2:"Polohu se nepodařilo zjistit.",3:"GPS nestihla polohu určit."})[err.code]||"GPS není dostupná.")),
      {enableHighAccuracy:true,maximumAge:0,timeout:20000}
    );
  });
}

"use strict";
// GPS sledování a mapové vykreslování se nedotýká herních účtů ani jejich bodů.
export function createGpsController({map,maplibregl,render,note,$}){
let gpsWatch=null,gpsMarker=null,gpsPosition=null,gpsPermissionDenied=false;
// Vizuální sledování GPS. Akce samostatně vyžadují nové přesné měření.
const gpsButton=$("gps-toggle"), gpsStatus=$("gps-status");
function gpsMessage(text) {gpsStatus.hidden=!text;gpsStatus.textContent=text;}
function accuracyPolygon(lng,lat,radius) {
  const coords=[];
  const latM=111320, lonM=111320*Math.cos(lat*Math.PI/180);
  for(let i=0;i<=64;i++){
    const angle=i*Math.PI/32;
    coords.push([lng+Math.cos(angle)*radius/lonM,lat+Math.sin(angle)*radius/latM]);
  }
  return {type:"Feature",geometry:{type:"Polygon",coordinates:[coords]},properties:{}};
}
function drawAccuracy(){
  if(!gpsPosition||!map.isStyleLoaded())return;
  const point=accuracyPolygon(gpsPosition.lng,gpsPosition.lat,gpsPosition.accuracy);
  if(!map.getSource("gps-accuracy")) {
    map.addSource("gps-accuracy",{type:"geojson",data:point});
    map.addLayer({id:"gps-area",type:"fill",source:"gps-accuracy",
      paint:{"fill-color":"#36a7e2","fill-opacity":.12}});
    map.addLayer({id:"gps-outline",type:"line",source:"gps-accuracy",
      paint:{"line-color":"#36a7e2","line-width":1.5}});
  } else map.getSource("gps-accuracy").setData(point);
}
map.on("style.load",drawAccuracy);
function disableGps(){
  if(gpsWatch!==null)navigator.geolocation.clearWatch(gpsWatch);
  gpsWatch=null;gpsPosition=null;gpsPermissionDenied=false;render();
  if(gpsMarker){gpsMarker.remove();gpsMarker=null;}
  if(map.getSource("gps-accuracy"))map.getSource("gps-accuracy").setData({
    type:"FeatureCollection",features:[]});
  gpsButton.setAttribute("aria-pressed","false");
  gpsButton.querySelector("span").textContent="Zapnout GPS";
  gpsMessage("");
}
function gpsError(error){
  gpsPermissionDenied=error.code===1;
  gpsPosition=null;
  gpsMessage(({1:"Přístup k GPS byl zamítnut.",2:"GPS polohu nelze určit.",3:"Časový limit GPS vypršel."})[error.code]||"GPS není dostupná.");
  if(gpsWatch!==null)navigator.geolocation.clearWatch(gpsWatch);
  gpsWatch=null;
  gpsButton.setAttribute("aria-pressed","false");
  gpsButton.querySelector("span").textContent="Zapnout GPS";
  render();
}
function requestGps(){
  gpsPermissionDenied=false;
  if(gpsWatch!==null){render();return;}
  if(!navigator.geolocation||!window.isSecureContext){
    gpsMessage("GPS vyžaduje HTTPS a podporu polohy v prohlížeči.");return;
  }
  gpsMessage("Zjišťuji polohu…");
  gpsButton.setAttribute("aria-pressed","true");
  gpsButton.querySelector("span").textContent="Vypnout GPS";
  gpsWatch=navigator.geolocation.watchPosition((position)=>{
    const coords=position.coords;
    gpsPosition={lng:coords.longitude,lat:coords.latitude,
      accuracy:Math.max(1,coords.accuracy||Infinity),timestamp:position.timestamp};
    gpsPermissionDenied=false;
    if(!gpsMarker){
      const el=document.createElement("div");el.className="gps-dot";
      gpsMarker=new maplibregl.Marker({element:el,anchor:"center"}).setLngLat([gpsPosition.lng,gpsPosition.lat]).addTo(map);
      map.flyTo({center:[gpsPosition.lng,gpsPosition.lat],zoom:Math.max(map.getZoom(),15)});
    }else gpsMarker.setLngLat([gpsPosition.lng,gpsPosition.lat]);
    drawAccuracy();
    gpsMessage("GPS přesnost ±"+Math.round(gpsPosition.accuracy)+" m · akce kontrolují nové měření");
    render();
  },gpsError,{enableHighAccuracy:true,maximumAge:5000,timeout:15000});
  render();
}
$("stop-request-location").onclick=()=>{
  if(gpsPermissionDenied){note("Povol polohu v nastavení oprávnění tohoto webu v prohlížeči.");}
  requestGps();
};
gpsButton.addEventListener("click",()=>{
  if(gpsWatch!==null){disableGps();return;}
  requestGps();
});

return {requestGps,disableGps,snapshot:()=>({position:gpsPosition,permissionDenied:gpsPermissionDenied,watch:gpsWatch})};
}

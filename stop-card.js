"use strict";
// Pracovní karta dle dokumentu 06, kap. 7. Žádné prohlášení o serverové GPS autorizaci.
const STOP_MODE_LABELS=Object.freeze({
  metro:"Metro",train:"Vlak",funicular:"Lanovka",tram:"Tramvaj",
  trolleybus:"Trolejbus",ferry:"Přívoz",urban_bus:"Městský autobus",
  regional_bus:"Regionální autobus",bus:"Autobus"
});
function escapeStopText(value){
  return String(value??"").replace(/[&<>"']/g,ch=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[ch]);
}
function stopCardHtml({stop,record,owner,selectedPlayer,selectedPlatform,gameDay,
    diffDays,captureScore,holdingScore,remaining,now=Date.now()}){
  if(!stop)return "";
  const protectedUntil=record?.protectedUntil?Date.parse(record.protectedUntil):NaN;
  const protection=Number.isFinite(protectedUntil)&&protectedUntil>now;
  const isMine=!!record?.owner&&record.owner===selectedPlayer;
  const days=record?.anchor?Math.max(1,diffDays(gameDay,record.anchor)+1):0;
    const owned=!!record?.owner;
  const score=stop.cats.length?captureScore(stop):"—",holding=stop.cats.length?holdingScore(stop):"—";
  const accent=owner?.color||"#929292";
  const status=!owned?"Neutrální":isMine?"Tvoje zastávka":protection?"Chráněná zastávka":"Obsazená zastávka";
  const ageLabel=!owned?"Volná k obsazení":days<=7?"Plný denní výnos":days<=21?"Bez denního výnosu":"Vypršení vlastnictví";
  const protectionInfo=protection?
    "Ochrana do "+new Date(protectedUntil).toLocaleString("cs-CZ",{timeZone:"Europe/Prague",day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"}):
    owned?"Bez aktivní ochrany":"Žádná ochrana";
  const possibleMaintain=isMine&&record?.anchor&&diffDays(gameDay,record.anchor)>=7;
  const actionMessage=isMine
    ?(possibleMaintain?"Lze provést údržbu v simulačním režimu.":"Údržba bude dostupná po 7 herních dnech.")
    :protection?"Převzetí blokuje aktivní 24hodinová ochrana."
    :remaining===0?"Dnes už nemáš volné pokusy na obsazení."
    :"Obsazení zde lze zatím pouze simulovat.";
  const modeChips=(stop.cats.length?stop.cats:["unknown"]).map(code=>
    '<span class="stop-mode">'+escapeStopText(STOP_MODE_LABELS[code]|| (code==="unknown"?"Druh dopravy neurčen":code))+'</span>').join("");
  const selectedPoint=stop.points.find(point=>point.id===selectedPlatform);
  const selectedLabel=selectedPoint?" · vybráno "+escapeStopText(selectedPoint.platform||selectedPoint.id):"";
  const platformButtons=stop.points.map(point=> {
    const chosen=point.id===selectedPlatform;
    const mode=point.isMetro?" · metro":"";
    const title=escapeStopText(point.platform||point.id);
    return '<button type="button" data-platform="'+escapeStopText(point.id)+'" class="stop-platform'+(chosen?" is-selected":"")+'" aria-pressed="'+String(chosen)+'">'+title+mode+'</button>';
  }).join("");
  const duration=owned?Math.min(21,days):0;
  return '<div class="stop-card" style="--card-owner:'+accent+'">'+
   '<div class="stop-owner"><span class="stop-owner-swatch" aria-hidden="true"></span>'+
    '<div class="stop-owner-text"><small>Aktuální vlastník</small><strong>'+escapeStopText(owner?.name||"Nikdo")+'</strong></div>'+
    '<span class="stop-status">'+status+'</span></div>'+
   '<div class="stop-modes" aria-label="Druhy dopravy">'+modeChips+'</div>'+
   '<div class="stop-metrics">'+
     '<div><strong>'+escapeStopText(score)+'</strong><span>Za obsazení</span></div>'+
     '<div><strong>'+escapeStopText(holding)+'</strong><span>Bodů / den*</span></div>'+
     '<div><strong>'+stop.points.length+'</strong><span>Stanovišť PID</span></div>'+
   '</div>'+
   '<section class="stop-lifecycle" aria-label="Stav vlastnictví">'+
     '<div class="stop-section-heading"><strong>Stav zastávky</strong><span>'+escapeStopText(ageLabel)+'</span></div>'+
     (owned?'<div class="stop-life-track" role="progressbar" aria-valuemin="0" aria-valuemax="21" aria-valuenow="'+duration+'" aria-label="Herní dny aktuálního vlastnictví"><span style="width:'+100*duration/21+'%"></span></div>':'')+
     '<div class="stop-detail-line"><span>'+escapeStopText(owned?"Herní den vlastnictví":"Vlastnictví")+'</span><b>'+escapeStopText(owned?days+". den":"Neutrální")+'</b></div>'+
     '<div class="stop-detail-line"><span>Ochrana před převzetím</span><b>'+escapeStopText(protectionInfo)+'</b></div>'+
   '</section>'+
   '<details class="stop-platforms"'+(selectedPoint?" open":"")+'><summary>Nástupiště a ověřovací body <span>'+stop.points.length+selectedLabel+'</span></summary>'+
     '<p class="stop-small-note">Přesné body PID. Způsobilost k GPS obsazení ještě nebyla schválena.</p>'+
     '<div class="platform-list">'+platformButtons+'</div>'+
   '</details>'+
   '<p class="stop-action-hint">'+escapeStopText(actionMessage)+'</p>'+
   '<p class="stop-small-note">* Denní výnos platí v prvních 7 herních dnech. Body a akce jsou nyní pouze testovací; GPS přítomnost není serverově ověřována.</p>'+
  '</div>';
}

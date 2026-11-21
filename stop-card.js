"use strict";
// Stručná karta podle aktuálního zadání. Původní obsáhlá karta Alphy 1.9 je nahrazena.
const STOP_MODE_LABELS=Object.freeze({
  metro:"Metro",train:"Vlak",funicular:"Lanovka",tram:"Tramvaj",
  trolleybus:"Trolejbus",ferry:"Přívoz",urban_bus:"Městský autobus",
  regional_bus:"Regionální autobus",bus:"Autobus"
});
// Existující veřejné piktogramy Temaki, nikoli vlastní dopravní ikony.
const STOP_MODE_ICONS=Object.freeze({
  metro:"subway",train:"train",funicular:"light_rail",tram:"tram",
  trolleybus:"trolleybus",ferry:"ferry",urban_bus:"bus",
  regional_bus:"bus",bus:"bus"
});
const TEMAKI_ICON_ROOT="assets/temaki/";
function stopModeIcon(code){
  const name=STOP_MODE_ICONS[code];
  return name?'<img class="stop-mode-icon" src="'+TEMAKI_ICON_ROOT+name+'.svg" alt="" width="19" height="19" loading="lazy" aria-hidden="true">':"";
}
function escapeStopText(value){
  return String(value??"").replace(/[&<>"']/g,ch=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[ch]);
}
function stopCountdown(until,now=Date.now()){
  const ms=Math.max(0,Date.parse(until)-now);
  const seconds=Math.ceil(ms/1000);
  const hours=Math.floor(seconds/3600);
  const minutes=Math.floor((seconds%3600)/60);
  const sec=seconds%60;
  return String(hours).padStart(2,"0")+":"+String(minutes).padStart(2,"0")+":"+String(sec).padStart(2,"0");
}
function stopCardHtml({stop,record,owner,selectedPlayer,gameDay,diffDays,captureScore,holdingScore,expiresAt=null,now=Date.now()}){
  if(!stop)return "";
  const hasOwner=!!record?.owner;
  const mine=hasOwner&&record.owner===selectedPlayer;
  const locked=hasOwner&&record.protectedUntil&&Date.parse(record.protectedUntil)>now;
  const age=record?.anchor?Math.max(1,diffDays(gameDay,record.anchor)+1):0;
  const fullYield=hasOwner&&age>=2&&age<=8;
  const modes=(stop.cats.length?stop.cats:["unknown"]).map(code=>{
    const label=escapeStopText(STOP_MODE_LABELS[code]||(code==="unknown"?"Druh dopravy neurčen":code));
    return '<span class="stop-mode" title="'+label+'" aria-label="'+label+'">'+stopModeIcon(code)+'</span>';
  }).join("");
  const points=stop.cats.length?captureScore(stop):"—";
  const yieldPoints=stop.cats.length?holdingScore(stop):"—";
  return '<div class="stop-card">'+
    (locked?'<div class="stop-protection"><span>Ochrana území</span><strong data-protection-countdown="'+escapeStopText(record.protectedUntil)+'">'+stopCountdown(record.protectedUntil,now)+'</strong></div>':'')+
    '<div class="stop-modes">'+modes+'</div>'+
    '<div class="stop-metrics">'+
      '<button type="button" class="stop-metric" data-score-detail="capture" aria-label="Zobrazit rozpis bodů za obsazení"><strong>'+escapeStopText(points)+'</strong><span>Bodů za obsazení</span><span class="stop-metric-more" aria-hidden="true">ⓘ</span></button>'+
      '<button type="button" class="stop-metric" data-score-detail="holding" aria-label="Zobrazit rozpis denního výnosu"><strong>'+escapeStopText(yieldPoints)+'</strong><span>'+ (hasOwner?'Aktuální výnos / den':'Plný výnos / den')+'</span><span class="stop-metric-more" aria-hidden="true">ⓘ</span></button>'+
    '</div>'+
    (hasOwner?'<div class="stop-life-summary"><span>'+escapeStopText(age===1?"Den akce · bez výnosu":fullYield?"Plný denní výnos":yieldPoints>0?"Klesající výnos":"Výnos dosáhl nuly")+'</span>'+
      '<span>'+age+'. herní den vlastnictví</span></div>':'')+
    (hasOwner&&age>=9&&expiresAt?'<div class="stop-expiry"><span>Do zániku bez údržby</span><strong data-expiry-countdown="'+escapeStopText(expiresAt)+'">'+stopCountdown(expiresAt,now)+'</strong></div>':'')+

  '</div>';
}

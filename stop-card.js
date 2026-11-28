"use strict";
// Stručná karta podle aktuálního zadání. Původní obsáhlá karta Alphy 1.9 je nahrazena.
const STOP_MODE_LABELS=TRANSPORT_MODE_LABELS;
const STOP_MODE_ICONS=TRANSPORT_MODE_ICONS;
const pointUnit=()=>globalThis.ZBIcons?.unit("stop-points")||"";
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
 const delta=Date.parse(until)-now;if(!Number.isFinite(delta))return "—";
 const s=Math.max(0,Math.ceil(delta/1000)),d=Math.floor(s/86400),h=Math.floor(s%86400/3600),m=Math.floor(s%3600/60);
 return d?d+" d "+h+" h":h?h+" h "+m+" min":m?m+" min "+s%60+" s":s+" s";
}
function stopExpiryCountdown(until,now=Date.now()){return stopCountdown(until,now);}
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
    (locked?'<div class="stop-protection"><span>Ochrana území</span><button type="button" class="countdown-trigger" data-protection-countdown="'+escapeStopText(record.protectedUntil)+'">'+stopCountdown(record.protectedUntil,now)+'</button></div>':'')+
    '<div class="stop-modes">'+modes+'</div>'+
    '<div class="stop-metrics">'+
      '<button type="button" class="stop-metric" data-score-detail="capture" aria-label="Zobrazit rozpis bodů za obsazení"><strong>'+escapeStopText(points)+pointUnit()+'</strong><span>Bodů za obsazení</span><span class="stop-metric-more" aria-hidden="true">ⓘ</span></button>'+
      '<button type="button" class="stop-metric" data-score-detail="holding" aria-label="Zobrazit rozpis denního výnosu"><strong>'+escapeStopText(yieldPoints)+pointUnit()+'</strong><span>'+ (hasOwner?'Aktuální výnos / den':'Plný výnos / den')+'</span><span class="stop-metric-more" aria-hidden="true">ⓘ</span></button>'+
    '</div>'+
    (hasOwner?'<div class="stop-life-summary"><span>'+escapeStopText(age===1?"Den akce · bez výnosu":fullYield?"Plný denní výnos":yieldPoints>0?"Klesající výnos":"Výnos dosáhl nuly")+'</span>'+
      '<span>'+age+'. herní den vlastnictví</span></div>':'')+
    (hasOwner&&age>=9&&expiresAt?'<div class="stop-expiry"><span>Do zániku bez údržby</span><button type="button" class="countdown-trigger" data-expiry-countdown="'+escapeStopText(expiresAt)+'">'+stopExpiryCountdown(expiresAt,now)+'</button></div>':'')+

  '</div>';
}

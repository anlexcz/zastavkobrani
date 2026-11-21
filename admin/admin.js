"use strict";
import {addDays,gameDay} from "../js/game-time.js";
import {ADMIN_SECTIONS,cloneOverrides,applyDraftChange,effectiveDaily,
        filterStops,exportOverrides,enforcePublishedDates} from "./core.js";

const $=id=>document.getElementById(id);
const today=gameDay();
const formatter=new Intl.DateTimeFormat("cs-CZ",{weekday:"short",day:"numeric",month:"numeric",year:"numeric",timeZone:"Europe/Prague"});
const formatDay=day=>formatter.format(new Date(day+"T12:00:00Z"));
const escapeHtml=text=>String(text??"").replace(/[&<>"']/g,char=>({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
})[char]);
const statusText={ready:"Funkční",draft:"Příprava změn",read:"Prohlížení",planned:"Připraveno"};
const statusTag=s=>'<span class="admin-status '+(s==="ready"?"is-ready":"")+'">'+statusText[s]+'</span>';
const state={
  stops:[],calendar:null,published:null,draft:null,view:"overview",
  selectedDate:addDays(today,1),pickedStopId:null,
  dailyQuery:"",territoryQuery:"",selectedTerritoryId:null,
  dirty:false,error:null
};
function alertUser(message,error=false){
 const el=$("admin-alert");
 el.textContent=message;el.classList.toggle("is-error",error);el.hidden=false;
}
function clearAlert(){$("admin-alert").hidden=true}
function heading(kicker,title,description){
 return '<div class="admin-topline">'+escapeHtml(kicker)+'</div><h1 class="admin-title">'+escapeHtml(title)+'</h1>'+
 '<p class="admin-lead">'+escapeHtml(description)+'</p>';
}
// Navigace: na mobilu přístupný boční panel; od 760px trvale viditelný sidebar.
const desktopMedia=window.matchMedia("(min-width:760px)");
let menuOpen=false;
let returnFocus=null;
function setMenuOpen(open,{restoreFocus=true}={}){
 const mobile=!desktopMedia.matches;
 const next=!!open&&mobile;
 if(next===menuOpen){
   $("admin-sidebar").inert=!mobile?false:!next;
   return;
 }
 if(next)returnFocus=document.activeElement;
 menuOpen=next;
 const sidebar=$("admin-sidebar"),toggle=$("admin-menu-toggle");
 sidebar.classList.toggle("is-open",next);
 sidebar.inert=mobile&&!next;
 if(next){sidebar.setAttribute("role","dialog");sidebar.setAttribute("aria-modal","true");}
 else{sidebar.removeAttribute("role");sidebar.removeAttribute("aria-modal");}
 $("admin-menu-scrim").hidden=!next;
 document.body.classList.toggle("is-menu-open",next);
 toggle.setAttribute("aria-expanded",String(next));
 toggle.setAttribute("aria-label",next?"Zavřít nabídku administrace":"Otevřít nabídku administrace");
 if(next){
   const selected=sidebar.querySelector('[aria-current="page"]');
   (selected||$("admin-sidebar-close")).focus();
 }else if(restoreFocus&&mobile&&returnFocus?.isConnected){
   returnFocus.focus();
 }
}
function initializeMenu(){
 $("admin-menu-toggle").addEventListener("click",()=>setMenuOpen(!menuOpen));
 $("admin-sidebar-close").addEventListener("click",()=>setMenuOpen(false));
 $("admin-menu-scrim").addEventListener("click",()=>setMenuOpen(false));
 desktopMedia.addEventListener("change",()=>{
   setMenuOpen(false,{restoreFocus:false});
   $("admin-sidebar").inert=!desktopMedia.matches;
 });
 $("admin-sidebar").inert=!desktopMedia.matches;
 document.addEventListener("keydown",event=>{
   if(!menuOpen)return;
   if(event.key==="Escape"){event.preventDefault();setMenuOpen(false);return}
   if(event.key!=="Tab")return;
   const focusable=[...$("admin-sidebar").querySelectorAll('button:not([disabled]),a[href]')];
   const first=focusable[0],last=focusable.at(-1);
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}
 });
}
function renderNavigation(){
 $("admin-menu").innerHTML=ADMIN_SECTIONS.map(section=>
   '<button type="button" data-view="'+section.id+'" aria-current="'+(state.view===section.id?"page":"false")+'">'+
   escapeHtml(section.title)+'</button>').join("");
 $("admin-menu").querySelectorAll("[data-view]").forEach(button=>{
  button.addEventListener("click",()=>{
    setMenuOpen(false,{restoreFocus:false});
    location.hash=button.dataset.view;
    // Při kliknutí na již aktivní sekci nedojde k hashchange.
    render();
    if(!desktopMedia.matches)$("admin-menu-toggle").focus({preventScroll:true});
  });
 });
 const current=ADMIN_SECTIONS.find(section=>section.id===state.view);
 $("admin-menu-current").textContent=current?.title||"Nabídka";
}
function render(){
 clearAlert();
 const requested=(location.hash.slice(1)||"overview").toLowerCase();
 state.view=ADMIN_SECTIONS.find(s=>s.id===requested)?requested:"overview";
 renderNavigation();
 if(state.error){$("admin-view").innerHTML=heading("CHYBA","Administrace", "Nepodařilo se načíst data.")+
   '<section class="admin-card"><p>'+escapeHtml(state.error)+'</p><p class="admin-muted">Zkontroluj publikované soubory a obnov stránku.</p></section>';return;}
 if(!state.calendar)return;
 switch(state.view){
  case "overview":renderOverview();break;
  case "daily":renderDaily();break;
  case "territories":renderTerritories();break;
  default:renderPlanned(state.view);
 }
}
function overviewKpi(value,name){
 return '<div class="admin-kpi"><strong>'+escapeHtml(value)+'</strong><span>'+escapeHtml(name)+'</span></div>';
}
function renderOverview(){
 const stops=state.stops;
 const points=stops.reduce((sum,stop)=>sum+stop.points.length,0);
 const reviewed=stops.reduce((sum,stop)=>sum+stop.points.filter(p=>p.captureEnabled).length,0);
 const upcoming=Object.keys(state.calendar.days).filter(d=>d>=today).length;
 $("admin-view").innerHTML=heading("PŘEHLED","Administrace","Připravená správa Zastávkobraní. Údaje pocházejí z veřejné alpha verze, nejde o produkční databázi.")+
 '<div class="admin-kpis">'+overviewKpi(stops.length.toLocaleString("cs-CZ"),"Kandidátních herních území")+
 overviewKpi(points.toLocaleString("cs-CZ"),"Fyzických bodů PID")+
 overviewKpi(upcoming,"Vygenerovaných dní od dneška")+
 overviewKpi(Object.keys(state.draft.dates).length,"Ručně přiřazených termínů")+'</div>'+
 '<div class="admin-grid"><section class="admin-card"><h2>Správa hry</h2><div class="admin-modules">'+
 ADMIN_SECTIONS.filter(s=>s.id!=="overview").map(s=>
   '<button class="admin-module" type="button" data-go="'+s.id+'"><span><strong>'+escapeHtml(s.title)+
   '</strong><small>'+escapeHtml(s.description)+'</small></span>'+statusTag(s.status)+'</button>').join("")+
 '</div></section><section class="admin-card"><h2>Stav implementace</h2>'+
 '<div class="admin-mini-grid"><div><strong>'+reviewed+'</strong><span>Schválených GPS bodů ve zdrojovém snapshotu</span></div>'+
 '<div><strong>'+ADMIN_SECTIONS.filter(s=>s.status==="planned").length+'</strong><span>Oblastí čeká na backend</span></div></div>'+
 '<div class="admin-divider"></div><h3>Co lze udělat nyní</h3>'+
 '<p class="admin-muted">Prohlížet zastávky a fyzické body PID, kontrolovat rozpis Zastávky dne, připravit ruční výjimky a stáhnout validovaný JSON pro následné zveřejnění přes GitHub.</p>'+
 '<div class="admin-note"><strong>Hranice bezpečnosti:</strong> Toto rozhraní je veřejné a není přihlášením administrátora. Bez serveru by bylo nebezpečné umožnit tu přímo změny hráčů, vlastnictví, bodů nebo oprávnění.</div>'+
 '<h3>Automatizace zastávky dne</h3><p class="admin-muted">Generátor doplňuje kalendář 14 dní dopředu. Následující běh zajistí workflow na GitHubu; ruční změny výjimek podléhají validaci.</p>'+
 '<p><a href="https://github.com/anlexcz/zastavkobrani/actions/workflows/generate-daily-stops.yml" target="_blank" rel="noopener noreferrer" class="admin-monospace">Otevřít generátor na GitHubu ↗</a></p>'+
 '</section></div>';
 $("admin-view").querySelectorAll("[data-go]").forEach(button=>button.onclick=()=>location.hash=button.dataset.go);
}
function downloadDraft(){
 try{
  const data=exportOverrides(state.draft,state.stops);
  const blob=new Blob([data],{type:"application/json;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");link.href=url;link.download="daily-stops.overrides.json";
  document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  alertUser("JSON byl připraven ke stažení. Do hry se zatím nic neuložilo.");
 }catch(error){alertUser(error.message,true)}
}
function renderDaily(){
 const current=effectiveDaily(state.selectedDate,state.calendar,state.draft,state.stops);
 const editAllowed=state.selectedDate>today;
 const chosen=current.stop;
 const generated=current.generated;
 const chosenId=state.pickedStopId||chosen?.id||"";
 const chosenStop=state.stops.find(s=>s.id===chosenId);
 const note=state.draft.dates[state.selectedDate]?.note||"";
 const visible=filterStops(state.stops,state.dailyQuery,{eligibleOnly:true,limit:30});
 const days=Array.from({length:15},(_,i)=>addDays(today,i));
 $("admin-view").innerHTML=heading("HERNÍ OBSAH","Zastávka dne",
    "Publikovaný kalendář, ruční volby konkrétních termínů a návrh změn pro budoucí administraci.")+
 '<div class="admin-grid wide-right"><section class="admin-card"><div class="admin-card-head"><div><h2>Kalendář</h2>'+
 '<p class="admin-small">Dnes a následujících 14 herních dní</p></div></div>'+
 '<div class="admin-list" id="admin-days">'+days.map(day=>{
   const x=effectiveDaily(day,state.calendar,state.draft,state.stops);
   return '<button type="button" class="admin-row '+(day===state.selectedDate?"is-selected":"")+'" data-day="'+day+'">'+
   '<span><strong>'+escapeHtml(formatDay(day))+'</strong><small>'+escapeHtml(x.stop?.name||"Zatím nepublikováno")+'</small></span>'+
   '<span class="admin-row-side '+(x.overridden?"manual":"")+'">'+(x.overridden?"Ručně":x.source==="random"?"Los":"—")+'</span></button>';
 }).join("")+'</div>'+
 '<div class="admin-divider"></div><label class="admin-field"><span class="admin-small">Přejít na konkrétní datum</span>'+
 '<input id="admin-date" type="date" value="'+state.selectedDate+'"></label>'+
 '</section><section class="admin-card"><div class="admin-card-head"><h2>Detail termínu</h2>'+statusTag("draft")+'</div>'+
 '<p class="admin-small">'+escapeHtml(formatDay(state.selectedDate))+
 (editAllowed?" · Lze upravit před začátkem herního dne":" · Aktivní nebo historický termín – jen pro čtení")+'</p>'+
 '<div class="admin-divider"></div><div class="admin-topline">PLATNÁ ZASTÁVKA</div>'+
 '<div class="admin-stop-title">'+escapeHtml(chosen?.name||"Zatím nepřiřazeno")+'</div>'+
 '<div class="admin-monospace">'+escapeHtml(chosen?.id||"Bez ID")+'</div>'+
 '<p class="admin-muted">Zdroj: '+(current.overridden?"ruční výjimka":current.source==="random"?"uložený los":"zatím bez publikovaného losu")+'</p>'+
 (current.overridden?'<p class="admin-flag">Původně vylosováno: '+escapeHtml(generated?.name||"Mimo zveřejněný horizont")+'</p>':'')+
 '<div class="admin-divider"></div><div class="admin-form">'+
 '<div class="admin-field"><label for="admin-stop-query">Vyhledat náhradní zastávku</label>'+
 '<input id="admin-stop-query" type="search" value="'+escapeHtml(state.dailyQuery)+
 '" placeholder="Název nebo ID zastávky" autocomplete="off" '+(editAllowed?"":"disabled")+'></div>'+
 (editAllowed?'<div class="admin-list" id="admin-stop-results">'+resultsHtml(visible,chosenId)+'</div>':
 '<div class="admin-note">Výměna zastávky během probíhajícího dne nebo zpětně je zablokovaná.</div>')+
 '<div class="admin-note"><strong>Vybraný kandidát:</strong> '+escapeHtml(chosenStop?.name||"Žádný")+
 '<div class="admin-monospace">'+escapeHtml(chosenStop?.id||"")+'</div></div>'+
 '<div class="admin-field"><label for="admin-note">Poznámka k výjimce (nepovinná)</label>'+
 '<textarea id="admin-note" maxlength="300" '+(editAllowed?"":"disabled")+' placeholder="Například tematická výzva k výročí">'+escapeHtml(note)+'</textarea></div>'+
 '<div class="admin-actions"><button type="button" class="admin-btn primary" id="admin-apply" '+(!editAllowed||!chosenStop?"disabled":"")+
 '>Připravit výjimku</button>'+
 '<button type="button" class="admin-btn ghost" id="admin-remove" '+(!editAllowed||!current.overridden?"disabled":"")+
 '>Vrátit původní los</button></div></div>'+
 '</section></div>'+
 '<section class="admin-card" style="margin-top:15px"><div class="admin-card-head"><div><h2>Publikace změn</h2>'+
 '<p class="admin-muted">Pracovní návrh není změnou na serveru.</p></div></div>'+
 '<div class="admin-actions"><button class="admin-btn primary" type="button" id="admin-download">Stáhnout JSON výjimek</button>'+
 '<label class="admin-btn" for="admin-import" style="display:inline-flex;align-items:center;cursor:pointer">Načíst JSON</label>'+
 '<input id="admin-import" type="file" accept=".json,application/json" hidden>'+
 '<button class="admin-btn ghost" type="button" id="admin-discard" '+(!state.dirty?"disabled":"")+
 '>Zahodit místní úpravy</button></div>'+
 '<div class="admin-divider"></div><ol class="admin-steps"><li>Proveď úpravy pro konkrétní budoucí data.</li>'+
 '<li>Stáhni validovaný soubor <strong>daily-stops.overrides.json</strong>.</li>'+
 '<li>V repozitáři nahraď soubor <strong>data/daily-stops.overrides.json</strong> jeho obsahem a potvrď commit. GitHub Actions rozpis automaticky přepočítají.</li></ol>'+
 '<p style="margin-top:13px"><a href="https://github.com/anlexcz/zastavkobrani/edit/main/data/daily-stops.overrides.json" target="_blank" rel="noopener noreferrer" class="admin-monospace">Upravit soubor přímo na GitHubu ↗</a></p>'+
 '<div class="admin-note"><strong>Bezpečnost:</strong> Ověření oprávnění k zápisu zajišťuje GitHub. Tato stránka neposílá tokeny ani hesla a nemění živá data. Pro produkci se publikace přesune do autentizované administrace.</div>'+
 '</section>';
 bindDaily();
}
function resultsHtml(stops,selectedId){
 return stops.map(s=>'<button type="button" class="admin-listitem '+(s.id===selectedId?"is-selected":"")+'" data-pick="'+escapeHtml(s.id)+'">'+
 '<span><strong>'+escapeHtml(s.name)+'</strong><small>'+escapeHtml(s.cats.join(" · "))+'</small></span>'+
 '<span class="admin-row-side">'+(s.id===selectedId?"Vybráno":"Vybrat")+'</span></button>').join("")||
 '<p class="admin-empty">Žádná odpovídající způsobilá zastávka.</p>';
}
function bindDaily(){
 $("admin-days").querySelectorAll("[data-day]").forEach(button=>button.onclick=()=>{
  state.selectedDate=button.dataset.day;state.pickedStopId=null;state.dailyQuery="";renderDaily();
 });
 $("admin-date").onchange=event=>{
  if(!event.target.value)return;
  state.selectedDate=event.target.value;state.pickedStopId=null;state.dailyQuery="";renderDaily();
 };
 const query=$("admin-stop-query");
 if(query)query.oninput=()=>{
  state.dailyQuery=query.value;
  const results=$("admin-stop-results");
  results.innerHTML=resultsHtml(filterStops(state.stops,state.dailyQuery,{eligibleOnly:true,limit:30}),state.pickedStopId||effectiveDaily(state.selectedDate,state.calendar,state.draft,state.stops).stop?.id);
  bindStopPicker(results);
 };
 const results=$("admin-stop-results");if(results)bindStopPicker(results);
 $("admin-apply").onclick=()=>{
  try{
   state.draft=applyDraftChange(state.draft,state.selectedDate,
     state.pickedStopId||effectiveDaily(state.selectedDate,state.calendar,state.draft,state.stops).stop?.id,
     $("admin-note").value,today,state.stops);
   state.dirty=true;state.pickedStopId=null;state.dailyQuery="";
   renderDaily();alertUser("Výjimka je pouze připravená v této stránce. Pro zveřejnění stáhni JSON a nahraj jej na GitHub.");
  }catch(error){alertUser(error.message,true)}
 };
 $("admin-remove").onclick=()=>{
  try{
    state.draft=applyDraftChange(state.draft,state.selectedDate,null,"",today,state.stops);
    state.dirty=true;state.pickedStopId=null;state.dailyQuery="";
    renderDaily();alertUser("Ruční výjimka byla odebrána pouze z pracovního návrhu.");
  }catch(error){alertUser(error.message,true)}
 };
 $("admin-download").onclick=downloadDraft;
 $("admin-discard").onclick=()=>{
  if(!confirm("Zahodit všechny dosud nepublikované úpravy?"))return;
  state.draft=cloneOverrides(state.published,state.stops);state.dirty=false;
  state.dailyQuery="";state.pickedStopId=null;renderDaily();alertUser("Místní úpravy byly zahozena.");
 };
 $("admin-import").onchange=async event=>{
  const file=event.target.files?.[0];if(!file)return;
  if(file.size>100000){alertUser("Soubor je příliš velký.",true);return}
  try{
   const parsed=JSON.parse(await file.text());
   const normalized=cloneOverrides(parsed,state.stops);
   state.draft=enforcePublishedDates(state.published,normalized,today);
   state.dirty=true;state.pickedStopId=null;state.dailyQuery="";
   renderDaily();alertUser("JSON načten do místního návrhu. Žádná změna nebyla publikována.");
  }catch(error){alertUser("Import se nezdařil: "+error.message,true)}
 };
}
function bindStopPicker(container){
 container.querySelectorAll("[data-pick]").forEach(button=>button.onclick=()=>{
  state.pickedStopId=button.dataset.pick;
  // Aktualizujeme pouze výběr a tlačítko; nesmazat rozepsanou poznámku.
  container.querySelectorAll("[data-pick]").forEach(x=>{
   x.classList.toggle("is-selected",x.dataset.pick===state.pickedStopId);
   x.querySelector(".admin-row-side").textContent=x.dataset.pick===state.pickedStopId?"Vybráno":"Vybrat";
  });
  const chosen=state.stops.find(s=>s.id===state.pickedStopId);
  const status=container.nextElementSibling;
  if(status?.classList.contains("admin-note")){
    status.innerHTML="<strong>Vybraný kandidát:</strong> "+escapeHtml(chosen?.name||"—")+
      '<div class="admin-monospace">'+escapeHtml(chosen?.id||"")+'</div>';
  }
  $("admin-apply").disabled=false;
 });
}
function renderTerritories(){
 const items=filterStops(state.stops,state.territoryQuery,{limit:60});
 const selected=state.stops.find(s=>s.id===state.selectedTerritoryId);
 const points=selected?.points||[];
 const eligible=selected&&selected.cats.length>0&&points.some(p=>p.insidePrague&&!p.isMetro);
 $("admin-view").innerHTML=heading("DATOVÝ KATALOG","Zastávky a GPS",
   "Prohlížení skutečného PID snapshotu. Zdrojové body nejsou automaticky schválená místa pro obsazování.")+
 '<div class="admin-grid wide-right"><section class="admin-card"><h2>Herní území</h2>'+
 '<div class="admin-field"><label for="admin-territory-query">Vyhledat zastávku podle názvu nebo ID</label>'+
 '<input id="admin-territory-query" type="search" autocomplete="off" placeholder="Např. Národní třída" value="'+escapeHtml(state.territoryQuery)+'"></div>'+
 '<p class="admin-small" style="margin:10px 0">Zobrazeno nejvýše 60 odpovídajících položek</p>'+
 '<div class="admin-list" id="admin-territory-results">'+items.map(s=>
  '<button class="admin-listitem '+(s.id===state.selectedTerritoryId?"is-selected":"")+'" type="button" data-territory="'+escapeHtml(s.id)+'"><span>'+
  '<strong>'+escapeHtml(s.name)+'</strong><small>'+escapeHtml(s.cats.join(" · "))+'</small></span>'+
  '<span class="admin-row-side">'+s.points.length+' bodů</span></button>'
 ).join("")+'</div></section>'+
 '<section class="admin-card"><h2>Detail území</h2>'+
 (selected?'<div class="admin-stop-title">'+escapeHtml(selected.name)+'</div>'+
 '<div class="admin-monospace">'+escapeHtml(selected.id)+'</div>'+
 '<div class="admin-divider"></div><div class="admin-mini-grid"><div><strong>'+points.length+'</strong><span>Fyzických bodů</span></div>'+
 '<div><strong>'+points.filter(p=>p.captureEnabled).length+'</strong><span>Schváleno k obsazení</span></div></div>'+
 '<h3>Druhy dopravy</h3><div>'+selected.cats.map(cat=>'<span class="admin-pill">'+escapeHtml(cat)+'</span>').join("")+'</div>'+
 '<h3>Kontrola způsobilosti</h3><p class="admin-small">'+(eligible?"Splňuje základní alpha podmínky pro Zastávku dne.":"Nesplňuje alpha podmínky pro Zastávku dne.")+'</p>'+
 '<h3>GPS body</h3><div class="admin-points">'+points.map(p=>
   '<div><strong>'+escapeHtml(p.platform||p.id)+'</strong> · '+escapeHtml(p.id)+
   '<br><span class="admin-monospace">'+Number(p.lat).toFixed(6)+', '+Number(p.lon).toFixed(6)+'</span>'+
   '<br><span class="admin-small">'+(p.captureEnabled?"Schválený":"Čeká na schválení")+
   ' · '+escapeHtml(p.review||"bez stavu")+'</span></div>').join("")+'</div>'+
 '<div class="admin-divider"></div><div class="admin-note">Úpravy názvů, kategorií, sloučení a povolených GPS bodů budou prováděny přes schvalovanou změnovou sadu. Zde se nyní žádná data nemění.</div>':
 '<p class="admin-empty">Vyber zastávku ze seznamu. Uvidíš její zdrojová data i stav GPS bodů.</p>')+
 '</section></div>';
 $("admin-territory-query").oninput=event=>{state.territoryQuery=event.target.value;renderTerritories();$("admin-territory-query").focus();$("admin-territory-query").setSelectionRange(state.territoryQuery.length,state.territoryQuery.length)};
 $("admin-territory-results").querySelectorAll("[data-territory]").forEach(button=>button.onclick=()=>{state.selectedTerritoryId=button.dataset.territory;renderTerritories()});
}
function renderPlanned(sectionId){
 const current=ADMIN_SECTIONS.find(s=>s.id===sectionId);
 const details={
 imports:["Ruční stažení a archivace zdrojových PID dat","Automatický výpočet rozdílů a návrh změn","Schválení, odložení a aktivace ve 03:00"],
 players:["Vyhledávání hráčů a jejich účtů","Role, pozastavení účtu a žádosti o výmaz","Moderace se zaznamenaným důvodem a auditní stopou"],
 ownership:["Přehled vlastníků a historie území","Kontrola bodového ledgeru, ochrany a údržby","Výjimečné opravy jako nové auditované události"],
 economy:["Zobrazení platných verzí herních pravidel","Příprava bonusů a časových akcí","Schválení a aktivace nové konfigurace"],
 achievements:["Definice tematických achievementů","Výběr skupiny zastávek a délky vlastnictví","Historie udělení a verzování definic"],
 audit:["Neměnná historie zásahů správců","Dohledání změn po uživateli nebo území","Povinné důvody a kontrola oprávnění"],
 system:["Protokoly denních uzávěrek a front","Diagnostika importů a generátoru zastávky dne","Bezpečné opakování neúspěšných úloh"]
 };
 $("admin-view").innerHTML=heading("PŘIPRAVENÝ MODUL",current.title,current.description)+
 '<div class="admin-grid"><section class="admin-card"><div class="admin-card-head"><h2>Plánované možnosti</h2>'+statusTag("planned")+'</div>'+
 '<div class="admin-modules">'+(details[sectionId]||[]).map(s=>'<div class="admin-module" style="cursor:default"><span><strong>'+escapeHtml(s)+'</strong></span><span class="admin-status">Připraveno</span></div>').join("")+
 '</div></section><section class="admin-card"><h2>Co chybí k zapojení</h2>'+
 '<p class="admin-muted">Pro tuto oblast je nutný produkční backend, databáze, přihlášení administrátora a serverová kontrola oprávnění.</p>'+
 '<div class="admin-note"><strong>Návrhový princip:</strong> Běžné změny přes administraci; citlivé zásahy jen po potvrzení. Historie i zdrojová PID data se nesmí přepisovat bez auditní stopy.</div>'+
 '<p style="margin-top:16px" class="admin-muted">Úmyslně zde nejsou nefunkční tlačítka pro zásahy do živé hry.</p></section></div>';
}
async function initialize(){
 try{
  if(typeof PID_PRAGUE==="undefined")throw new Error("Katalog PID_PRAGUE nebyl načten.");
  state.stops=PID_PRAGUE;
  const load=async path=>{
   const response=await fetch(path,{cache:"no-store"});
   if(!response.ok)throw new Error("Soubor "+path+" vrací HTTP "+response.status);
   return response.json();
  };
  const [calendar,overrides]=await Promise.all([
   load("../data/daily-stops.generated.json"),load("../data/daily-stops.overrides.json")
  ]);
  if(calendar.version!==1||!calendar.days)throw new Error("Neznámé schéma rozpisu.");
  state.calendar=calendar;
  state.published=cloneOverrides(overrides,state.stops);
  state.draft=cloneOverrides(overrides,state.stops);
 }catch(error){console.error("Administrace:",error);state.error=error.message}
 render();
}
window.addEventListener("hashchange",()=>{setMenuOpen(false,{restoreFocus:false});render()});
window.addEventListener("beforeunload",event=>{
 if(state.dirty){event.preventDefault();event.returnValue=""}
});
initializeMenu();
initialize();

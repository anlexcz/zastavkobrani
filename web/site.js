"use strict";
const root=document.querySelector("#root"), C=window.PROTO_CONTENT;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const link=(p,t,cls="")=>'<a class="'+cls+'" href="'+SiteRoutes.url(p)+'">'+t+'</a>';
const row=(p,t,v="")=>link(p,'<span>'+t+'</span><span class="muted">'+v+' ›</span>',"list-row");
const card=(t,v)=>'<div class="card"><small>'+t+'</small><div class="stat">'+v+'</div></div>';
const progress=n=>'<div class="progress" aria-label="'+n+' %"><span style="width:'+n+'%"></span></div>';
const notice='<div class="notice">LOKÁLNÍ ALFA · Skutečné účty zatím nejsou dostupné. Formulář neposílá žádné přihlašovací údaje.</div>';
const footer=()=>'<footer>'+["jak-hrat","pravidla","novinky","faq","vyvoj","kontakt","podminky","soukromi"].map(p=>link(p,C[p][0])).join("")+'<a href="admin/">Administrace (alfa)</a>'+'</footer>';
const brand=()=>link("","ZASTÁVKOBRANÍ","brand");
const publicHeader=()=>'<header>'+brand()+'<nav class="public-nav">'+link("jak-hrat","Jak hrát")+link("novinky","Novinky")+link("faq","FAQ")+link("login","Hrát","button primary")+'</nav></header>';
const title=(t,back)=> (back?link(back,"‹ Zpět","button"):"")+'<h1>'+t+'</h1>';
const art=()=>'<svg viewBox="0 0 500 360" role="img" aria-label="Ilustrační herní mapa"><rect width="500" height="360" fill="#202629"/>'+Array.from({length:8},(_,i)=>'<path d="M0 '+(i*55)+' Q230 '+(i*55-95)+' 500 '+(i*55+30)+'" stroke="#42484b" stroke-width="9" fill="none"/>').join("")+'<path d="M120 0Q70 150 160 210T140 360" stroke="#344b57" stroke-width="40" fill="none"/>'+Array.from({length:24},(_,i)=>'<circle cx="'+(25+(i*83)%450)+'" cy="'+(25+(i*61)%310)+'" r="22" fill="'+["#ba68c8","#64b5f6"][i%2]+'" opacity=".22"/><circle cx="'+(25+(i*83)%450)+'" cy="'+(25+(i*61)%310)+'" r="5" fill="'+["#ba68c8","#64b5f6"][i%2]+'"/>').join("")+'</svg>';
function landing(){return '<div class="hero"><div><div class="eyebrow">Geolokační hra v ulicích Prahy</div><span class="pill">Ve vývoji · lokální alfa</span><h1>CELÁ PRAHA.<br>TVOJE HERNÍ POLE.</h1><p>Obsazuj zastávky, ovládni svoje okolí a soupeř o vládu nad pražskými čtvrtěmi.</p><div class="row">'+link("login","Začít hrát","button primary")+link("jak-hrat","Jak se hraje","button")+'<a class="text-link" href="app/">Vyzkoušet GPS alfu</a>'+'</div></div><div class="hero-art">'+art()+'</div></div><h2>Město je tvoje hřiště</h2><div class="grid">'+[["Obsazuj zastávky","Vyraz do ulic a získej vlastní území."],["Ovládej čtvrti","Staň se vládcem své oblíbené části Prahy."],["Objevuj každý den","Splň zastávku dne a prozkoumávej město."],["Soutěž","Získávej zastávkobody a stoupej žebříčkem."]].map(x=>'<article class="card"><h3>'+x[0]+'</h3><p>'+x[1]+'</p></article>').join("")+'</div><section class="section"><h2>Novinky</h2>'+row("novinky/prototyp","Připravujeme první veřejnou verzi")+'</section>'+link("register","Vytvořit účet","button primary");}
function auth(p){const reg=p==="register";if(p==="logout")return '<div class="auth card stack"><h1>Opustil jsi hru</h1><p>Lokální testovací stav zůstává v tomto prohlížeči.</p>'+link("login","Znovu se přihlásit","button primary")+link("","Zpět na úvod","button")+'</div>';if(p==="forgot-password")return '<div class="auth card stack"><h1>Zapomenuté heslo</h1><p>Kontaktuj podporu. Administrátor po ověření nastaví dočasné heslo.</p>'+link("kontakt","Kontakt","button")+link("login","Zpět k přihlášení")+'</div>';if(p==="onboarding")return '<div class="auth stack"><h1>Vítej ve hře</h1>'+["Obsazuj zastávky","Hospodař s 10 akčními body","Udržuj území","Soutěž a objevuj"].map(t=>'<div class="card">'+t+'</div>').join("")+'<a class="button primary" href="app/">Přejít na mapu</a>'+'</div>';return '<form class="auth card stack" id="auth-form"><h1>'+ (reg?"Vytvoř si účet":p==="change-password"?"Změna hesla":"Přihlášení")+'</h1>'+notice+(p==="change-password"?"":'<label>Uživatelské jméno<input placeholder="Demo hráč" autocomplete="off"></label>')+(reg?'<label>E-mail (nepovinný)<input type="email" placeholder="Nepovinné" disabled></label>':'')+'<label>Heslo (v prototypu nezadávej)<input type="password" disabled placeholder="••••••••"></label>'+(reg?'<label>Heslo znovu<input type="password" disabled placeholder="••••••••"></label><label class="check"><input type="checkbox"> Ukázka souhlasu s podmínkami</label>':'')+'<button class="primary" type="submit"> '+(reg?"Vyzkoušet registraci":p==="change-password"?"Zpět do nastavení":"Vyzkoušet hru")+'</button>'+link("forgot-password","Zapomenuté heslo?")+link(reg?"login":"register",reg?"Už máš účet? Přihlásit se":"Nemáš účet? Registrovat se")+'</form>';}

const authPages=["login","register","logout","forgot-password","change-password","onboarding"];
function render(){
 const legacy=location.hash.slice(1).replace(/^\//,"");
 const basePath=new URL(document.baseURI).pathname;
 const p=SiteRoutes.resolve(location.pathname.slice(basePath.length),location.hash);
 if(legacy==="app"||legacy.startsWith("app/")){location.replace(new URL("app/",document.baseURI));return;}
 if(legacy==="admin"||legacy.startsWith("admin/")){location.replace(new URL("admin/",document.baseURI));return;}
 if(legacy&&Object.hasOwn(SiteRoutes.paths,legacy)&&p!==null){location.replace(new URL(SiteRoutes.url(p),document.baseURI));return;}
 
 const page=authPages.includes(p)?auth(p):p===""?landing():C[p]?'<article class="article">'+title(C[p][0])+'<p>'+esc(C[p][1])+'</p>'+(p==="vyvoj"?'<h2>Changelog</h2><p>'+esc(C.changelog[1])+'</p>':p==="novinky"?row("novinky/prototyp","Připravujeme první veřejnou verzi"):p==="jak-hrat"?link("pravidla","Podrobná pravidla","button"):"")+'</article>':title("Stránka nenalezena")+link("","Zpět na úvod","button");
 root.innerHTML=publicHeader()+'<main>'+page+'</main>'+footer();
 document.title=(C[p]?.[0]|| (p==="login"?"Přihlášení":p==="register"?"Registrace":"Zastávkobraní"))+(p?" | Zastávkobraní":"");
 window.scrollTo(0,0);
}
root.addEventListener("submit",e=>{if(e.target.id!=="auth-form")return;e.preventDefault();const p=SiteRoutes.resolve(location.pathname.slice(new URL(document.baseURI).pathname.length));location.href=new URL(p==="register"?SiteRoutes.url("onboarding"):"app/",document.baseURI)});
window.addEventListener("hashchange",render);render();

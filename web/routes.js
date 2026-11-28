(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.SiteRoutes=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const paths=Object.freeze({"":"","jak-hrat":"jak-hrat","pravidla":"jak-hrat/pravidla","novinky":"novinky","novinky/prototyp":"novinky/prototyp","faq":"faq","changelog":"vyvoj","vyvoj":"vyvoj","kontakt":"kontakt","podminky":"podminky","soukromi":"soukromi","login":"prihlaseni","register":"registrace","forgot-password":"obnova-hesla","logout":"odhlaseni","change-password":"zmena-hesla","onboarding":"uvod-do-hry","jak-hrat/zaciname":"jak-hrat/zaciname","jak-hrat/akcni-body":"jak-hrat/akcni-body","jak-hrat/obsazovani":"jak-hrat/obsazovani","jak-hrat/ochrana":"jak-hrat/ochrana","jak-hrat/zastavkobody":"jak-hrat/zastavkobody","jak-hrat/ctvrti":"jak-hrat/ctvrti","jak-hrat/zastavka-dne":"jak-hrat/zastavka-dne","jak-hrat/gps":"jak-hrat/gps","jak-hrat/zebricek":"jak-hrat/zebricek"});
const canonical=Object.fromEntries(Object.entries(paths).map(([key,path])=>[path,key]));
function url(key){if(!Object.hasOwn(paths,key))throw new Error("Unknown page: "+key);return paths[key]?paths[key]+"/":"./";}
function resolve(path,hash=""){const legacy=hash.replace(/^#\/?/,"");if(legacy&&Object.hasOwn(paths,legacy))return canonical[paths[legacy]];const clean=path.replace(/^\/+|\/+$/g,"").replace(/(?:^|\/)index\.html$/,"").replace(/\/$/,"");return Object.hasOwn(canonical,clean)?canonical[clean]:null;}
return {paths,url,resolve};
});

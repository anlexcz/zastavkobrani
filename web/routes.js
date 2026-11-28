(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.SiteRoutes=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const paths=Object.freeze({"":"","jak-hrat":"jak-hrat","pravidla":"jak-hrat/pravidla","novinky":"novinky","novinky/prototyp":"novinky/prototyp","faq":"faq","changelog":"vyvoj","vyvoj":"vyvoj","kontakt":"kontakt","podminky":"podminky","soukromi":"soukromi","login":"prihlaseni","register":"registrace","forgot-password":"obnova-hesla","logout":"odhlaseni","change-password":"zmena-hesla","onboarding":"uvod-do-hry"});
const canonical=Object.fromEntries(Object.entries(paths).map(([key,path])=>[path,key]));
function url(key){if(!Object.hasOwn(paths,key))throw new Error("Unknown page: "+key);return paths[key]?paths[key]+"/":"./";}
function resolve(path,hash=""){const legacy=hash.replace(/^#\/?/,"");if(legacy&&Object.hasOwn(paths,legacy))return canonical[paths[legacy]];const clean=path.replace(/^\/+|\/+$/g,"").replace(/(?:^|\/)index\.html$/,"").replace(/\/$/,"");return Object.hasOwn(canonical,clean)?canonical[clean]:null;}
return {paths,url,resolve};
});

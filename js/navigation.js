const screens=new Set(["map","daily","ranking","profile","profile-stops","profile-districts","profile-statistics","profile-activity","profile-settings","profile-help","player","stop"]);
export function encodeGameRoute(route){
 const p=new URLSearchParams();p.set("screen",screens.has(route.screen)?route.screen:"map");
 if(route.screen==="player"||route.screen==="stop"){if(route.player)p.set("player",route.player);}
 if(route.screen==="stop"&&route.stop){p.set("stop",route.stop);p.set("return",screens.has(route.returnScreen)&&route.returnScreen!=="stop"?route.returnScreen:"map");}
 return "#"+p.toString();
}
export function decodeGameRoute(hash){
 const p=new URLSearchParams(hash.replace(/^#/,"")),screen=p.get("screen");
 const route={screen:screens.has(screen)?screen:"map",player:p.get("player"),stop:p.get("stop"),returnScreen:p.get("return")};
 if(!screens.has(route.returnScreen)||route.returnScreen==="stop")route.returnScreen="map";
 if(route.screen==="stop"&&!route.stop)route.screen="map";
 if(route.screen==="player"&&!route.player)route.screen="ranking";
 return route;
}

"use strict";
// Deset fiktivních hráčů simulujících různé typy cestování Prahou.
// Deterministické rozdělení pro opakované testy, bez skutečných GPS tras či účtů.
const DEMO_PLAYERS = [
 {id:"p1",name:"Rys",color:"#EF4444",home:[14.454,50.126],radiusKm:3.0,focus:"Kobylisy a sever; místní autobus",modes:["bus"]},
 {id:"p2",name:"Sova",color:"#3B82F6",home:[14.440,50.106],radiusKm:3.1,focus:"Holešovice a Letná; lokální souboje",modes:["tram","bus"]},
 {id:"p3",name:"Jiskra",color:"#22C55E",home:[14.478,50.086],radiusKm:3.2,focus:"Žižkov a Karlín; tramvaje",modes:["tram"]},
 {id:"p4",name:"Fénix",color:"#F59E0B",home:[14.454,50.076],radiusKm:3.5,focus:"Vinohrady; tramvaje a metro; soupeř Jiskry",modes:["tram","metro"]},
 {id:"p5",name:"Mlok",color:"#A855F7",home:[14.391,50.102],radiusKm:3.1,focus:"Dejvice a Petřiny; spíše místní",modes:["bus"]},
 {id:"p6",name:"Kobra",color:"#06B6D4",home:[14.401,50.068],radiusKm:3.7,focus:"Smíchov; tramvajové přestupy",modes:["tram","metro"]},
 {id:"p7",name:"Maya",color:"#EC4899",home:[14.414,50.013],radiusKm:4.1,focus:"Modřany a Braník; tramvaj i autobus",modes:["tram","bus"]},
 {id:"p8",name:"Šíp",color:"#84CC16",home:[14.575,50.106],radiusKm:4.5,focus:"Černý Most a východ; autobusy",modes:["bus","metro"]},
 {id:"p9",name:"Kotva",color:"#F97316",home:[14.491,50.034],radiusKm:4.0,focus:"Chodov a Jižní Město; metro a autobusy",modes:["metro","bus"]},
 {id:"p10",name:"Tulák",color:"#14B8A6",home:null,radiusKm:100,focus:"Celá Praha; nepředvídatelný cestovatel",modes:[]}
];
function demoHash(value){
  let hash=2166136261;
  for(let i=0;i<value.length;i++)hash=Math.imul(hash^value.charCodeAt(i),16777619);
  return hash>>>0;
}
function demoDistanceKm(a,b){
  const lat=(a[1]+b[1])*.5*Math.PI/180;
  return Math.hypot((a[0]-b[0])*111.32*Math.cos(lat),(a[1]-b[1])*111.32);
}
function demoOwner(stop){
  // Více obsazených území v hustším centru a na hlavních trasách;
  // periferie a klidné oblasti zůstávají častěji neutrální.
  const centerDist=demoDistanceKm([stop.lon,stop.lat],[14.44,50.085]);
  const density=Math.exp(-.5*(centerDist/7.5)**2);
  const transit=stop.cats.some(m=>["tram","metro","train"].includes(m));
  const probability=Math.min(.88,.61+.17*density+(transit?0.055:0));
  if(demoHash("occupied:"+stop.id)/4294967296>=probability)return null;
  let winner=null,best=-Infinity;
  for(const player of DEMO_PLAYERS){
    const nearby=player.home?Math.exp(-.5*(demoDistanceKm(
      [stop.lon,stop.lat],player.home)/player.radiusKm)**2):0;
    const modeFit=player.modes.some(mode=>stop.cats.includes(mode));
    const roaming=player.home?0.17:1.3;
    const local=player.home?nearby*(modeFit?9:6.5):0;
    const weight=roaming+local;
    const u=Math.max(1e-9,(demoHash(stop.id+":"+player.id+":race")+.5)/4294967296);
    const race=Math.log(weight)-Math.log(-Math.log(u)); // deterministické vážené losování
    if(race>best){best=race;winner=player.id;}
  }
  return winner;
}

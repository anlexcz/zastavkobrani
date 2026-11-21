"use strict";
const DEMO_PLAYERS=Object.freeze([
  {id:"p1",name:"Tepa",color:"#ff3600"},
  {id:"p2",name:"Soupeř 22",color:"#3b82f6"}
]);
// Jednorázový výchozí stav na vybraném úseku tramvajové linky 22.
// Nepředstavuje uskutečněná převzetí a nedává soupeři body za obsazení.
const ROUTE_22_SEED=Object.freeze([
 "Bílá Hora","Malý Břevnov","Obora Hvězda","Vypich","Říčanova",
 "Břevnovský klášter","U Kaštanu","Drinopol","Marjánka","Malovanka",
 "Pohořelec","Brusnice","Pražský hrad","Královský letohrádek",
 "Malostranské náměstí","Újezd","Národní divadlo","Národní třída",
 "Karlovo náměstí","Štěpánská"
]);

import {addDays,diffDays} from "./game-time.js";
export function dailyStreak(visits,id,day){let n=0,d=day;if(!visits[d]?.[id])d=addDays(d,-1);while(visits[d]?.[id]){n++;d=addDays(d,-1);}return n;}
export function visitedStops(state,id){return new Set(state.events.filter(e=>e.player===id&&!e.seed&&["capture","maintain","visit"].includes(e.action)&&e.stopId).map(e=>e.stopId));}
export function dailyIncomeGroups(ledger,id,day){const groups=new Map();for(const e of ledger){const age=diffDays(day,e.day);if(e.player!==id||e.type!=="holding"||age<0||age>=30)continue;const g=groups.get(e.day)||{day:e.day,total:0,items:[]};g.total+=e.amount;g.items.push({stopId:e.stopId||null,amount:e.amount});groups.set(e.day,g);}return [...groups.values()];}

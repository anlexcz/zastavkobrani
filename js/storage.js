"use strict";
// Klíč a schéma testovací hry zůstávají kompatibilní se stávajícími localStorage daty.
export const STORAGE_KEY="zastavkobrani-route22-ap-v3";
export function loadStoredGame(initialize,storage=localStorage){
  try{
    const game=JSON.parse(storage.getItem(STORAGE_KEY));
    if(game&&game.version===3&&game.stops&&Array.isArray(game.ledger)&&Array.isArray(game.events))return game;
  }catch(error){console.warn("Testovací hru nelze načíst:",error)}
  return initialize();
}
export function saveStoredGame(game,storage=localStorage){
  storage.setItem(STORAGE_KEY,JSON.stringify(game));
}

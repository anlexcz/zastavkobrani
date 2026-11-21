"use strict";
// Jediný katalog dopravních kategorií pro bodování i prezentaci.
// Herní slučování druhů dopravy zůstává odpovědností scoring.js.
const TRANSPORT_MODE_LABELS=Object.freeze({
  metro:"Metro",train:"Vlak",funicular:"Lanovka",tram:"Tramvaj",
  trolleybus:"Trolejbus",ferry:"Přívoz",urban_bus:"Městský autobus",
  regional_bus:"Regionální autobus",bus:"Autobus"
});
const TRANSPORT_MODE_ICONS=Object.freeze({
  metro:"subway",train:"train",funicular:"light_rail",tram:"tram",
  trolleybus:"trolleybus",ferry:"ferry",urban_bus:"bus",
  regional_bus:"bus",bus:"bus"
});

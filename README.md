# Zastávkobraní – aktuální mobilní alfa (UI v1, 21. 11. 2026)

[Otevřít současnou alfu](https://anlexcz.github.io/zastavkobrani/?v=ui-v1)

**Funkční UI v lokálním demu:** mapa celého katalogu PID; karta zastávky s dosavadními modaly rozpisu bodů a historie; odpočty ochrany a sestupné fáze vlastnictví; sekundární GPS akce „Splnit zastávku dne“ na kartě aktuální denní výzvy; obrazovka Zastávka dne s odpočtem do pražské uzávěrky ve 03:00 a rozbalovací historií předchozích 30 dnů; žebříček se dvěma rozsahy bodů (30 dní / celkem) a aktuálním počtem zastávek; profil s přepínáním testovacích hráčů a resetem. AP jsou nově v horní liště.

**Omezení:** nadále pouze localStorage a dva demonstrační hráči. Denní zastávka se pro demo vybírá reprodukovatelně podle data a dostupných kategorií/bodů, nikoliv serverovým losováním. Odměny výzev nejsou určeny, takže návštěvy zatím nepřidávají body. Neschválené GPS body a produkční serverové ověřování zůstávají otevřeným technickým úkolem. Přenos na server nemá měnit schválený UI tok.

---

# Alfa – aktuální schválená ekonomika 21. 11. 2026 (v3: obsazení ×2)

[Otevřít aktuální alfu](https://anlexcz.github.io/zastavkobrani/?v=economy-v3)

Schválené jednorázové sazby: autobus 16, tramvaj/trolejbus/lanovka/přívoz 24, metro/vlak 32. Koeficienty 100/50/25, neutralita +16, při převzetí bez neutrality. Dříve používané ×3 (24/36/48, neutralita +24) je překonané.

Denní příjem: model C ×6 = 6/12/12/18 bodů pro 1/2/3/4+ druhy. Den akce 0; následuje 7 plných výnosových dní a 7 sestupných (pro základní váhu C: 6,5,4,3,2,1,0). Celý nepřerušený cyklus má 63× váha C bodů.

AP: 10 denně; běžné území 1 AP, významné (zatím pracovní 3+ druhů) 2 AP, převzetí +1 AP. Ochrana 24 hodin. Jde o klientskou alfu s lokálním testovacím stavem linky 22. Dříve připsané body nejsou zpětně přepočtené; reset v profilu obnoví ukázková data podle současných pravidel. Produkční serverová databáze dosud není implementovaná.

---

# HISTORICKÉ POZNÁMKY – test AP, historie a dat linky 22 (21. 11. 2026; staré sazby nejsou aktuální)

[Testovací web](https://anlexcz.github.io/zastavkobrani/?v=ap22history1)

## Aktuální testovací režim
- Praha nad auditovanými PID územími; fiktivní lokální hráči Tepa a Soupeř 22.
- Na vybraných reálných zastávkách linky 22 jsou pouze **syntetická obsazení, převzetí a historie**. Čas a vlastník jsou vygenerované testovací údaje, ne reálné hry. Jedna pětina zastávek ze seed listu zůstává neutrální.
- Historie se při každém skutečně provedeném testovacím obsazení/údržbě doplní; lokální stav je uložen jen v prohlížeči. Reset v profilu obnoví testovací scénář. Klíč úložiště je `zastavkobrani-route22-ap-v3`.
- Schválená ekonomika: 10 AP na herní den (03:00 Europe/Prague), základní cena 1 nebo 2 AP, za převzetí +1 AP; bez limitu počtu akcí. Obsazení, převzetí i údržba vyvolají ochranu na 24 hodin.
- Významnost od **3 kategorií** je zatím pracovní nastavení. Sestupná sedmidenní výnosová křivka je **pracovní demo parametr**, nikoli schválená finální posloupnost.
- Zisky při obsazení 8/12/16 podle druhu, další kategorie 50 % a další 25 %, autobusové druhy při obsazení společně; neutrální bonus +8. Denní model C 1/2/2/3, den akce bez výnosu.
- Na mapě a v profilu jsou zbývající AP. Historie konkrétní zastávky je ve spodní části karty.
- GPS akce zůstávají ověřované čerstvou klientskou polohou do 30 m. **Nejde o produkční zabezpečení ani o skutečnou serverovou databázi.** Před spuštěním je nutná serverová validace a transakční historie.

## Ověření
```bash
node --check app.js
node --check scoring.js
node --check stop-card.js
node --test tests/*.test.cjs
```

---

## Starší dokumentace (historická, již není aktivní konfigurací)

# Zastávkobraní – rozpis bodů a UX karty, 21. 11. 2026

[Otevřít aktuální mobilní verzi](https://anlexcz.github.io/zastavkobrani/?v=gps26score)

## Aktuální chování
- Dva testovací hráči Tepa a Soupeř 22, lokální herní stav, neomezená obsazení výhradně v testovacím režimu; produkční pravidla tří obsazení/den, ochrana, údržba a autoritativní GPS server zůstávají v dokumentaci.
- Karta: jeden hlavní akční ovladač, potvrzení obsazení Ano vlevo / Ne vpravo bez systémového potvrzovacího dialogu. Druhy dopravy zobrazené jen ikonami Temaki, žádný počet označníků, žádná technická poznámka.
- GPS: 30m kandidátní oblasti a kontrola čerstvého klientského měření. Vzdálenost je drobný nenápadný údaj vpravo pod tlačítkem. V případě nepovolené polohy má být dostupná možnost jejího vyžádání.
- Oba číselné boxy lze rozkliknout. Samostatný modal s `role="dialog"` ukazuje dopravu, příspěvek za každou kategorii, korekci aktuálního denního výnosu, samostatnou část Bonusy a Celkem. Zavření křížkem, Escape, klepnutím na pozadí. Při zavření se nemění aktuální zastávka ani lokální hra.

## Jediný bodový výpočet
`scoring.js` definuje pracovní schválené sazby, `captureBreakdown(stop,context)` a `holdingBreakdown(stop,context)`. Zdrojové kategorie `stop.cats` se deduplikují. Pro obsazení se `urban_bus` a `regional_bus` slučují do `bus`, nejvyšší základ má 100 % sazby, zbylé kategorie 50 %. Denní výnos vychází z jedné jednotky za každou kategorii, městský/regionální autobus se neslučuje. U vlastněné staré zastávky je v rozpisu samostatná korekce na nulu. `captureScore` a `holdingScore` v app.js volají tyto stejné funkce, takže detail není druhým odděleným výpočtem.

`ACTIVE_SCORE_BONUSES=[]` je záměrně prázdné: nebyly schválené podmínky ani sazby žádného konkrétního bonusu. Rozpis umí přijmout předem vyhodnocené pojmenované bonusové položky v `context.bonuses`, ale NEIMPLEMENTUJE obecný bonusový engine ani neprohlašuje klienta za autoritu. Před produkčním spuštěním musí server vracet autoritativní detail a připisovat body v jediné transakci. Bonusové podmínky, časová platnost, kombinace a editace administrací zůstávají otevřené.

## Reprodukce a ověření
```bash
node --check scoring.js
node --check stop-card.js
node --check app.js
node --test tests/*.test.cjs
```
Regresní testy: `tests/scoring.test.cjs`, `tests/stop-card.test.cjs`, `tests/pid-map.test.cjs`. Příklady pro kontrolu: metro + tram + bus = 23 za obsazení / 3 denně; tram + urban_bus + regional_bus = 12 za obsazení / 3 denně; samotná tram 10 / 1. Zastaralé vlastnictví ukazuje základní denní hodnotu i korekci na nulu. Pro terénní test je důležité ověřit pohyb pod/za 30 m, ztrátu GPS, blokace a vzhled rozpisu na mobilu.

Související projektová dokumentace na Google Disku: 00 (stav projektu), 02 (bodování), 03 (technika), 05 (databázový návrh) a 06 (UX). Historické zápisy starých alphas jsou ponechány jako historie; aktuálním stavem jsou novější doplňky datované 21. 11. 2026.

---

# Terénní test – upravené obsazování a mapový detail (21. 11. 2026)

[Spustit verzi gps25field](https://anlexcz.github.io/zastavkobrani/?v=gps25field)

- **Pouze testovací režim** `FIELD_TEST_UNLIMITED_CAPTURES=true`: odstraňuje denní limit tří obsazení, profil zobrazuje ∞. Produkční limit tří obsazení v herní dokumentaci **zůstává schválený**; při ukončení testu se režim musí vypnout. Pravidla ochrany, cooldownu a sedmidenní údržby jsou nadále aktivní.
- Jediný hlavní ovladač: u cizí/neobsazené zastávky obsazení, u vlastní údržba. Opačná akce je skrytá. Při potvrzení se přímo ve stejné pevně vysoké oblasti vymění obsazovací tlačítko za dotaz a **Ano vlevo / Ne vpravo**, s krátkou animací a respektováním `prefers-reduced-motion`.
- Kontrola dostupné GPS polohy nadále průběžně mění stav tlačítka (GPS watch a pravidelné přepočítání po 5 s); mimo poloměr 30 m je v akční barvě utlumené a deaktivované. Vzdálenost k nejbližšímu povrchovému kandidátnímu bodu se zobrazuje pod akcí; samotná akce ověřuje nové měření. Bez souhlasu uživatele se průběžné sledování nespouští.
- Kandidátní sloučené 30m oblasti se na mapě zobrazují již od zoomu **14,5** místo 15,2. Skutečný radius zůstává 30 m.
- Lokální stav dosavadních dvou hráčů zůstává zachovaný (beze změny storage klíče). Toto není produkční serverové GPS ověření ani schválení veřejné přístupnosti PID bodů.
- Ověřená syntaxe všech změněných JS souborů a statická kontrola návaznosti HTML/JS. Kompletní Node testy ani vizuální mobilní vykreslení nelze v aktuálním prostředí potvrdit.

---

# GPS akční tlačítko a dopravní piktogramy (21. 11. 2026)

[Otevřít aktuální test na telefonu](https://anlexcz.github.io/zastavkobrani/?v=gps24action)

- Karta zobrazuje pouze jednobarevné piktogramy dopravních kategorií bez badge a viditelného názvu. Textový název zůstává jako `aria-label` a `title` pro přístupnost.
- Podle schváleného UX má karta pouze jednu primární akci přes celou šířku: pro cizí/neobsazenou zastávku obsazení a pro vlastní údržbu. Pro obsazení se zobrazuje inline potvrzení Ano/Ne.
- Stav tlačítka se průběžně odvozuje od aktualizované GPS polohy (vzdálenost nejvýše 30 m od příslušného povrchového kandidátního PID bodu, přesnost zařízení nejvýše ±30 m, stáří měření nejvýše 15 s), denního limitu, ochrany, cooldownu a případně stáří vlastnictví. Mimo dosah je barevné tlačítko utlumené a **skutečně disabled**; časové blokace zůstávají šedé.
- Pod tlačítkem je živý údaj vzdálenosti a možnost „Povolit polohu“. Lokalizační oprávnění se žádá až po úkonu uživatele. Po pokusu o obsazení se dělá nové geolokační měření (maximumAge 0), takže stará pozice neopravňuje k akci.
- Stav se kontroluje při GPS aktualizaci a nejméně každých pět sekund. Dosavadní lokální stav dvou hráčů zůstává zachován.
- Pořád jde o klientský terénní test bez serverové autorizace a bez administrátorsky schválených GPS bodů. Nejde o skutečně zabezpečenou produkční hru.

---

# GPS test – oprava mapových okruhů a karty (21. 11. 2026)

[Otevřít aktuální verzi](https://anlexcz.github.io/zastavkobrani/?v=gps23areas)

- Opraveny GPS oblasti: od zoomu 15,2 se vykresluje jeden geograficky sloučený polygon 30m kruhů příslušných kandidátních povrchových PID bodů na každou herní zastávku. Žádné sčítání průhledností jednotlivých kruhů; 390m strategické polygony zůstávají oddělené.
- Zobrazení GPS oblastí patří přepínači **Zastávky** a není závislé na nastavení **Barevná území**. Opravené styly dávají viditelnější obrys, výplň a zvýraznění vybrané zastávky.
- Neobsazená zastávka je označena „Neobsazená zastávka“.
- Kategorie dopravy mají ikony z existující sady **Temaki** (CC0-1.0); sedm potřebných SVG je lokálně uloženo v `assets/temaki/`, takže se při zobrazení karty nemusí načítat z CDN. Pro pozemní lanovku zůstává do výběru přesnějšího symbolu pracovní železniční piktogram `light_rail`, nikoli kabinová lanovka.
- Toto je stále **lokální GPS test**, nikoli produkčně schválená mapa capture_points nebo serverově bezpečné dobývání. Všechny zdrojové PID body mají příznak `captureEnabled:false`; veřejně dostupná povolená místa musí později potvrdit administrace.
- Proběhla kontrola syntaxe a vlastní funkční smoke testy zdrojů/vrstev/karty; kompletní Node CI a skutečné vykreslení na Androidu zůstává k ověření.

---

# Zastávkobraní — GPS terénní test (21. 11. 2026)

[Otevřít testovací hru](https://anlexcz.github.io/zastavkobrani/?v=gps21)

**Aktuální implementace na GitHub Pages je testovací lokální režim, nikoliv produkční multiplayer.** Dva přepínatelné profily: Tepa (p1) začíná bez zastávek a Soupeř 22 (p2) začíná s 20 konkrétními zastávkami mezi Bílou Horou a Štěpánskou. Po prvním spuštění je scénář uložen v `localStorage`; přepnutí hráče nemění společný lokální herní stav. Reset vrací oba profily do výchozího scénáře. Staré simulace mají jiný klíč a nepřenášejí se.

**Obsazení, převzetí, údržba i zastávka dne vyžadují aktuální GPS měření při kliknutí.** Klient používá `getCurrentPosition` s vysokou přesností, nepřijímá měření starší než 10 s a vyžaduje hlášenou přesnost nejvýše 30 m. Nejbližší bod PID v příslušném území (mimo metro) musí být vzdálen nejvýše 30 m. Obsazení vyžaduje potvrzení. Kontrolují se 3 obsazení za herní den, 24h ochrana, 24h opakování téhož hráče a dostupnost údržby po 7 herních dnech. Neúspěšné GPS ověření akci nezapíše.

**Důležité před veřejným spuštěním:** všech 3 659 PID bodů má dosud `captureEnabled:false` a nemá schválenou veřejnou přístupnost. Terénní test používá přímo jejich souřadnice pouze v izolovaném lokálním scénáři. Tím se **neschvalují** herní body. GPS pochází z klienta a lze ji podvrhnout; bez účtů, serverové databáze a serverového validačního API nejde o důvěryhodné, sdílené ani bezpečné produkční převzetí. Před vydáním je nutný backend s transakčními kontrolami a schválené capture_points. Přesnost ±30 m sama o sobě nedokazuje skutečnou fyzickou přítomnost do 30 m. Za jízdy tramvaje testovat jen bezpečně, bez ovládání telefonu při řízení.

**Kontrola zdrojů:** všech 20 názvů je ověřeno proti PID datům a obsahuje kategorii `tram`. Syntaxe `app.js` byla ověřena. GitHub Actions spouští `node --test tests/*.test.cjs`; fyzické GPS chování vyžaduje test na mobilu a dokončený server později integrační testy.

---

# Zastávkobraní — Alpha 2.0: zjednodušená karta zastávky

[Otevřít aktuální mapu](https://anlexcz.github.io/zastavkobrani/?v=alpha20) · [Vizuální specifikace – kapitola 30](https://docs.google.com/document/d/1aYjOdabqtIEnw13ROaFMkpbyH9MKoaK2uOY3l5AGMDE/edit)

Po mobilní kontrole karty z Alphy 1.9 bylo zrušeno označení „Herní zastávka“ nad názvem, velký box vlastníka, metrika počtu PID označníků i rozbalovací seznam fyzických stanovišť. Nad názvem zastávky je krátká identifikace vlastníka, horní okraj celého panelu má úzký vodorovný proužek v barvě vlastníka. Karta dále obsahuje druhy dopravy, bodování a stručnou informaci o fázi výnosu.

Je-li aktivní 24h ochrana, karta nahoře zobrazuje živý časový odpočet HH:MM:SS. U cizí chráněné zastávky je převzetí zablokováno a přímo text deaktivovaného tlačítka odpočítává zbývající čas; při expiraci se karta automaticky aktualizuje. U vlastní zastávky tlačítko údržby indikuje počet zbývajících herních dní do zpřístupnění. Jde pouze o demo bez serverově ověřených GPS akcí.

**Autorský status:** změny vlastníka, horního proužku a odstranění platforem jsou výslovný požadavek uživatele; přesná vizuální podoba odpočtů je pracovní implementace, protože dřívější detailní schválení není dostupné. Vše je oddělené od herních dat a od detailní mapové vrstvy PID stanovišť.

Regresní testy: `node --test tests/stop-card.test.cjs`. Kód: `stop-card.js`, `app.js`, `style.css`, `index.html`.

---

# Zastávkobraní — Alpha 1.9: jemný glow a karta zastávky

[Spustit mapu](https://anlexcz.github.io/zastavkobrani/?v=alpha19) · [Specifikace v dokumentu 06](https://docs.google.com/document/d/1aYjOdabqtIEnw13ROaFMkpbyH9MKoaK2uOY3l5AGMDE/edit)

## Změny oproti Alphě 1.8

**Hranice vlastnictví** nyní používají tři MapLibre line vrstvy nad strategickou výplní, avšak pod zastávkovými body: `game-owner-border-glow` (široký rozmazaný světelný barevný pás), `game-owner-border` (úzký tmavý základ), `game-owner-border-highlight` (subtilní barevná linka). Toto řešení vizuálně připomíná vnitřní glow, fyzicky však používá rozmazanou linku na hraně, nikoliv geometricky oříznutý světelný pás pouze uvnitř polygonu. Barevná vrstva se používá na hranách hráč/neutrální a hráč/vnější plocha; rozhraní dvou různých vlastníků si zachovává čistou tmavou hranici. Společné hrany stejného vlastníka jsou nadále filtrovány už před renderem. Všechny tři vrstvy se vypínají přepínačem `Barevná území`. Viz `stop-map.js`.

**Karta zastávky** zůstává schváleným mobilním spodním sheetem. Nový samostatný `stop-card.js` generuje z herního stavu bezpečně escapovaný přehled: vlastník s barevným indikátorem, stav ochrany, dopravní kategorie, body za obsazení a plný denní výnos, počet fyzických stanovišť PID, herní stáří zastávky, ochranná lhůta a rozbalitelný výčet platforem. Výběr platformy centruje mapu na přesné PID souřadnice. `app.js` řídí akce a údržbu, jejichž dostupnost nyní vysvětluje karta; `style.css` sdílí globální barevné a typografické tokeny. Konkrétní rozložení je pracovní návrh podle [kapitoly 7 a nové kapitoly 29 dokumentu 06](https://docs.google.com/document/d/1aYjOdabqtIEnw13ROaFMkpbyH9MKoaK2uOY3l5AGMDE/edit), nikoliv dříve schválený pixelově přesný návrh.

**Bezpečnostní omezení:** všech 3 659 fyzických PID bodů v prototypu má `captureEnabled:false`. Karta proto výslovně označuje současné herní akce jako „Simulovat obsazení / převzetí / údržbu“ – nikoliv serverem ověřené GPS akce. Zobrazený kandidátní GPS kruh není oprávněním ke skutečnému dobývání.

**Testy:** `node --test tests/*.test.cjs`, včetně nového `tests/stop-card.test.cjs` (vlastník, ochrana, životní cyklus, PID stanoviště a bezpečnost textových údajů) a nových mapových testů vrstev glow. Mobilní vizuální zkouška obou komponent zůstává nutná.

---

# Zastávkobraní — Alpha 1.8: trvalé tečky a hranice hráčských území

[Otevřít mapu](https://anlexcz.github.io/zastavkobrani/) · [Mapová specifikace](https://docs.google.com/document/d/1aYjOdabqtIEnw13ROaFMkpbyH9MKoaK2uOY3l5AGMDE/edit)

**Zastávkové body nezmizí při žádném zoomu.** Předchozí časné i pozdní body byly sjednoceny do jediné nativní vrstvy MapLibre `game-territory` nad neclusterovaným GeoJSON zdrojem `game-stop-points` se všemi 1 487 herními zastávkami. Vrstvě není nastaven `maxzoom` ani clusterový filtr; je dostupná od zoomu 0 až po detail fyzických stanovišť. Poloměr se mírně mění podle zoomu (např. 2,7 px při 10,65 a 5,5 px při 16), ale geografická poloha je pevná. Prstencové clustery jsou samostatná doplňková vrstva a při jejich výskytu zastávky nevypínají; kreslí se NAD tečkami kvůli čitelnému číslu. Od zoomu 16 se vedle nich zobrazují fyzická nástupiště; kandidátní GPS okruhy jsou samostatná vrstva.

**Vnější hranice stejného hráče:** statická topologie `pid-owner-boundaries.js` mapuje 3 171 skupin vnějších a společných hran 1 487 Voroného buněk. Při výpočtu vizualizace `ownerBoundaryGeoJSON` vynechává všechny společné hrany, pokud obě sousední zastávky vlastní stejný hráč; neobkresluje ani sousedící neutrální plochy. Na rozhraní různých hráčů vykresluje kontrastní tmavý silnější obrys, u přechodu hráč/neutrální místo nebo okraj území používá hráčskou barvu. Výsledkem je výrazný vnější obvod souvislého území jednoho hráče, nikoliv síť hran každé jednotlivé zastávky. Vrstva `game-owner-border` je NAD strategickou výplní a POD body zastávek a je řízena stejným přepínačem „Barevná území“. Po převzetí zastávky se barvy/viditelnost hranic aktualizují z lokálního vlastnictví bez přepočítání polygonů.

**Reprodukovatelná topologie:** `python scripts/export_owner_borders.py pid-strategic.js pid-owner-boundaries.js`, vyžaduje Shapely. Překreslení polygonů samotných nadále používá `scripts/export_strategic_areas.py`. Zdrojová data jsou pouze vizuální a nevymezují žádné schválené GPS území.

**Ověření:** `node --test tests/pid-map.test.cjs` a `node --test tests/*.test.cjs`. Přepínání vrstev zůstává, stejně jako deset modelových hráčů a oddělený localStorage. Rozměry hranic a bodů jsou pracovní vizuální parametry pro mobilní ověření.

---

# Zastávkobraní — Alpha 1.7: vrstvy mapy a časné body zastávek

[Otevřít aplikaci](https://anlexcz.github.io/zastavkobrani/) · [Specifikace mapy](https://docs.google.com/document/d/1aYjOdabqtIEnw13ROaFMkpbyH9MKoaK2uOY3l5AGMDE/edit)

**Nové oproti Alphě 1.6:** Již na úvodním celopražském zoomu 10,65 jsou přesně georeferencované malé barevné body všech 1 487 herních území, nikoliv pouze barevné strategické Voroného plochy. Drobné body tvoří oddělený neclusterovaný GeoJSON source `game-early-stop-points` s MapLibre vrstvou `game-early-stops` přibližně od zoomu 9,5 do 11,6. Od zoomu 11,6 je nahrazují hlavní značky a prstencové clustery. Zůstává 10 fiktivních hráčů, 3 659 PID stanovišť, 390metrové orientační strategické polygony a oddělené detailní 30metrové kandidátní GPS oblasti.

**Mobilní přepínač vrstev:** tlačítko s ikonou vrstev otevře dva nezávislé checkboxy: `Zastávky` a `Barevná území`. První ovládá veškeré herní body, prstencové clustery a platformy. Druhý ovládá statické strategické oblasti i detailní GPS náhledové plochy. Obě volby jsou ve výchozím stavu zapnuté. Vypnutí obou nechá čistý MapLibre podklad. Nastavení se ukládá zvlášť pod `zastavkobrani-map-layers-v1`, nezávisle na simulovaném vlastnictví. Vypnutí území také ukončí výpočet a zobrazování jejich kandidátního GPS polygonového GeoJSON zdroje, takže šetří výkon. Zobrazení těchto polygonů neopravňuje k obsazování, všechny GPS body zůstávají neschválené.

**Automatický test:** `node --test tests/pid-map.test.cjs`. Nové regresní kontroly ověřují 1 487 časných stop features, jejich viditelnost ve výchozím zoomu a vzájemnou nezávislost obou přepínačů.

---

# Zastávkobraní — Alpha 1.6: strategická Praha a deset hráčů

[Otevřít mapu](https://anlexcz.github.io/zastavkobrani/) · [Mapová specifikace](https://docs.google.com/document/d/1aYjOdabqtIEnw13ROaFMkpbyH9MKoaK2uOY3l5AGMDE/edit)

**Testovací hra, nikoliv produkce.** Úplný audit PID Stop Listu (snapshot 19. 11. 2026): 1 487 kandidátních herních území a 3 659 fyzických stop bodů. Všech 3 659 bodů má `captureEnabled:false`: žádná vykreslená oblast není schváleným místem GPS obsazení.

## Strategická vizualizace města

`pid-strategic.js` obsahuje 1 487 statických, jednotlivě adresovatelných Polygon features. Jde o omezené Voroného buňky nad reprezentativními body PID groups: oblast každé zastávky tvoří průnik nejbližší buňky s kruhem **390 metrů** kolem příslušné skupiny. Buňky se nepřekrývají; ve větší hustotě se dělí o souvislý prostor, v řidších částech Prahy zůstávají mezery. Nejde o oficiální hranice Prahy a geometrie se explicitně neořezává polygonem města. Nejde ani o dobývací dosah.

Polygony jsou přidány jako `game-strategic` GeoJSON zdroj a `game-strategic-fill` vrstva; bez hranic mezi plochami (stejní vlastníci vizuálně splývají), barva podle `territoryId → owner → color`. Při změně vlastnictví se mění barva feature, nikoliv samotná geometrie. Polygony se zobrazují do zoomu 15,5, pak nastupují podrobné kandidátní GPS oblasti od zoomu 15,2 a PID nástupiště od zoomu 16.

Clustery (MapLibre `clusterRadius:45`, `clusterMaxZoom:12.9`) jsou skryté při zobrazení celé Prahy; barevné prstence jsou viditelné až od zoomu 11,6, souhrnné body zastávek od zoomu 12,8 a jejich popisky od zoomu 14,1. Podrobné platformy od zoomu 16, písmena platformy od 17,2. Clustery počítají *herní území*, nikoliv nástupiště. Prstenec rozděluje podíl barev podle vlastníků včetně neutrální části. Při změně vlastnictví se refreshují relevantní GeoJSON zdroje. Základní mapa je OpenFreeMap Liberty upravená v map-style.js, nikoliv vlastní nekompletní styl.

## Deset testovacích hráčů

`demo-world.js` definuje 10 jednoslovných hráčů: Rys, Sova, Jiskra, Fénix, Mlok, Kobra, Maya, Šíp, Kotva a Tulák. Každý má vlastní barvu, fiktivní domovskou oblast, prostorový dosah a preferované módy (tram/metro/bus). Jiskra/Fénix se překrývají ve východním širším centru; Rys/Sova severně od centra. Tulák hraje po celé Praze. Tato charakteristika je **vymyšlený simulační scénář**, nikoliv skutečná data o uživatelích či cestování. `demoOwner(stop)` používá stabilní hash identifikátoru, geografické váhy, preference dopravního módu a pseudonáhodné vážené losování.

Z 1 487 území je testově obsazeno **1 076 (72,4 %)**, 411 neutrálních. Hráči drží: Rys 66, Sova 76, Jiskra 97, Fénix 97, Mlok 97, Kobra 122, Maya 142, Šíp 132, Kotva 138 a Tulák 109. Výsledek je zreprodukovatelný a nevyžaduje server. Tato simulace má vlastní lokální úložiště `zastavkobrani-alpha-prague-10players-v1`; dřívější testy se nemažou. Reset založí prázdný stav bez znovuvytvoření demo při dalším otevření.

## Reprodukce

Z dat auditu PID: `python scripts/export_prague.py zastavkobrani_territories.csv zastavkobrani_stop_points.csv pid-prague.js`. Strategické polygony: `pip install numpy scipy shapely` a `python scripts/export_strategic_areas.py zastavkobrani_territories.csv pid-strategic.js`.

`index.html` načítá MapLibre, `map-style.js`, `pid-prague.js`, `pid-strategic.js`, `demo-world.js`, Turf, `stop-map.js` a `app.js`. Github Pages main/root. Statické soubory před kompresí: PID cca 360 kB a strategické buňky cca 555 kB. Při úpravách publikované Alphy zvyšovat asset query cache klíče.

Kontrola: `node --test tests/*.test.cjs`; GitHub Actions `.github/workflows/verify-alpha.yml`. Reálné mobilní testování zůstává nutné, zejména čitelnost desetibarevných prstenců, výkon WebGL při celopražském zobrazení, první načtení polygonů, přechody zoomu a klikací priority vrstev.

**Stav rozhodnutí:** vyvážená strategická mapa schválená jako směr; 390 m, průhlednosti, jednotlivé zoomy a konkrétní simulační osobnosti jsou pracovní testovací parametry. Schválené GPS hranice a backend herních akcí v této Alpha nejsou implementovány.

---

## Historický vývoj a starší poznámky (částečně překonané)

Následující části README jsou archivním záznamem postupu Alphy. Informace o 12 orientačních zastávkách, Transitland souřadnicích, samostatných GPS kruzích a dřívějších mapových stylech již nejsou aktuální. Rozhoduje výše uvedený stav a dokument 06/24.

# Zastávkobraní Alpha

První funkční testovací prototyp geolokační hry. Obsahuje mapu, tři pevné hráče přepínané v horním menu a společný herní stav uložený v **localStorage jediného prohlížeče**.

## Spuštění
Publikovat `main` přes **Settings → Pages → Deploy from a branch → main / root**. Pro mapu je třeba internetové připojení (MapLibre GL JS a vektorové dlaždice OpenFreeMap).

## Funkce
- 12 **orientačních ukázkových** pražských zastávek, nikoliv kompletní ověřený PID katalog
- Tři hráči bez hesla, obsazování a převzetí, 3 úspěšná obsazení za herní den
- Ochrana území 24 skutečných hodin
- Údržba po sedmi herních dnech, 7 výnosových + 14 nevýnosových dní, následná expirace
- Body, 30denní lokální žebříček, zastávka dne bez zatím neurčené bodové odměny
- Reset lokálních dat

## Důležité limity
Všechna herní data zůstávají **jen na jednom zařízení v daném prohlížeči**. Jiné telefony nesdílejí společný stav. Neexistuje server, zabezpečení ani skutečná databáze. **GPS se v mapě zobrazuje pouze orientačně, ale herní akce se GPS neověřují**, protože ukázkové souřadnice nejsou validované bezpečně dostupné capture points. Denní uzávěrky se dopočítávají až při otevření stránky, nejsou prováděné serverem ve 03:00. Testovací časy a výzvy neslouží jako produkční autorita.

Další plán: import auditovaných PID dat, oddělení herního engine a úložiště, automatické testy, backend s transakční databází a administrace.

Schválená pravidla jsou v projektové dokumentaci na Google Disku; případné sporné implementační detaily v Alphě nejsou nově schválenými pravidly.

## Mapový podklad (Alpha)
Používáme **MapLibre GL JS**, bezklíčový **OpenFreeMap** a vlastní styl v souboru `map-style.js`. Styl vykresluje vodu, parky, ulice, železniční a tramvajové tratě (pokud je data rozlišují). **Budovy, POI a domovní čísla nezobrazuje.** Změna barev se provádí pomocí centrálního objektu `MAP_COLORS`. Zdrojový styl Liberty slouží pouze jako poskytovatel vektorového zdroje a fontů, vrstvy Zastávkobraní se sestavují lokálně. Styl i podklad jsou nadále pracovní prototyp, dokud nebude ověřen na mobilu.

## GPS
Tlačítko na mapě aktivuje opt-in sledování polohy pouze pro orientační zobrazení modrého bodu a přesnostního kruhu. Souřadnice se neukládají. GPS neopravňuje k obsazení – to zatím zůstává čistou simulací.

## Rychlé kontroly
`node --test tests/map-style.test.cjs` ověřuje složení stylu bez API klíče a oddělení tramvají a železnice. Testy neověřují, zda externí dlaždice skutečně zobrazují jednotlivé pražské koleje ani stav GitHub Pages.

## Alpha 1.0 – testovací oblast Kobylisy
Původních 12 bodů mimo Kobylisy bylo nahrazeno 14 zastávkami: Kobylisy, Služská, Ke Stírce, Střelničná, Březiněveská, Líbeznická, Vozovna Kobylisy, Mirovická, Sídliště Kobylisy, Kyselova, Okrouhlická, Vychovatelna, Hercovka a Písečná. Mapa se otevírá na Kobylisy.

Souřadnice 11 zastávek byly odvozeny dekódováním polohových geohash identifikátorů veřejně dohledatelných stop záznamů Transitland; Březiněveská má bod přímo z OSM (mapcarta.com/N4096977771). **Mirovická** a **Sídliště Kobylisy** mají pouze orientační referenční body z nedalekých adres/hřiště, na mapě jsou označeny přerušovaným obrysem; nejsou to ověřené zastávkové GPS body. Jejich přesné souřadnice je nutné doplnit z aktuálního PID Stop Listu. Ani ostatní vybrané platformové geohashe automaticky nezaručují herní bezpečný capture point.

Původní alpha localStorage nebyl mazán; nové testovací území používá vlastní úložiště a začíná s prázdným herním stavem. Dopravní kategorie jsou pouze testovací zjednodušení, nikoliv úplný klasifikátor PID Stop Listu.

## Alpha 1.1 – skutečný PID katalog a pevná geometrie

Původní experimentální Transitland a orientační souřadnice nahrazuje **původní auditní export PID Stop Listu z 19. 11. 2026**. Ve statickém souboru `pid-kobylisy.js` je 14 skupin a všech 51 jejich stop pointů včetně PID `point_id`, platform a dopravních kategorií. Všechna stanoviště jsou georeferencovaná a žádné nevzniklo odhadem. Zdroj: `zastavkobrani_territories.csv` a `zastavkobrani_stop_points.csv` z auditního balíku.

Mapa nyní používá **GeoJSON circle/symbol vrstvy v MapLibre** namísto HTML tlačítek jako markerů. Tím se poloha značky při zoomování nemění proti podkladové geografii. Chování:
- oddálení: MapLibre shlukuje výhradně herní skupiny (14 území), zobrazuje počet území; kliknutí shluk přiblíží;
- bližší zobrazení: jedno herní území jako bod, popisky s kolizní kontrolou;
- od zoomu 16: místo skupinového bodu jednotlivá stanoviště PID, všechny stále náleží společnému území a sdílejí vlastnictví;
- od zoomu 17,5: obrysy kandidátních 30m GPS okruhů a platformové popisky (od 17,2); GPS okruhy **nejsou schváleny pro skutečné obsazení**.

V auditu mají všechny vybrané stop body `capture_enabled=false`, u běžných `manual_access_review`, u metra `metro_surface_point_required`. Zobrazení fyzického platformového bodu nedokazuje veřejně bezpečné GPS stanoviště; zejména body M1/M2 na metru nemusejí být dosažitelné na povrchu. V Alphě zůstává obsazování výslovně simulační bez skutečné GPS autorizace.

Pro změnu dat skupin upravit výhradně `pid-kobylisy.js`; geometrické vrstvy v `stop-map.js`, samotná herní logika v `app.js`. Lokální uložený test používá samostatný klíč `zastavkobrani-alpha-pid-v2`, původní data zůstávají nedotčená. Pro další import je nutné nahradit ručně sestavený statický export reprodukovatelným importním skriptem.

## Alpha 1.2 – sloučené 30m oblasti území
Vykreslování kandidátních GPS oblastí je nově zajištěno přímo v `stop-map.js` přes Turf.js 7.2.0. Kolem skutečných bodů PID vzniknou 30m kruhy, které se **sjednotí zvlášť pro každé territory_id** pomocí `turf.union`. Výsledkem je jeden Polygon/MultiPolygon na herní zastávku; překryvy téže zastávky nemají vnitřní obrysy ani násobené průhlednosti. Oddělené části zachovávají skutečné rozestupy a nejsou uměle propojeny. Území jiných zastávek se neslučují.

Pracovní zoomy: souvislá oblast od 15,2; jednotlivá nástupiště od 16; názvy jednotlivých platforem od 17,2. Oblasti zůstávají i po rozpadu a jsou vykresleny POD body. Klepnutí na oblast otevře detail odpovídající skupiny. Barvy ploch se aktualizují podle vlastníka, vybrané území má zvýrazněný obrys. Datový model, GPS pravidla ani 51 zdrojových bodů se nemění. Stále jde jen o kandidátní oblasti: všechny původní stop body mají `captureEnabled:false` a samy nezakládají nárok na skutečné GPS obsazení. V produkci bude třeba používat pouze explicitně schválené capture points a serverovou validaci.

Kontrola nad exportem PID: 14 nezávislých výstupních herních území z 51 zdrojových bodů. Více oddělených komponent je v některých skupinách přirozené (např. Kobylisy), proto se používá i MultiPolygon. Na mobilech dále ověřit rendering a rychlost Turf union při prvním otevření.

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

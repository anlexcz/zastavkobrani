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

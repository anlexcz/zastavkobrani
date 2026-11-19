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

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

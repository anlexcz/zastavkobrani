# Zastávkobraní Alpha

První funkční testovací prototyp geolokační hry. Obsahuje mapu, tři pevné hráče přepínané v horním menu a společný herní stav uložený v **localStorage jediného prohlížeče**.

## Spuštění
Publikovat `main` přes **Settings → Pages → Deploy from a branch → main / root**. Pro mapu je třeba internetové připojení (Leaflet a mapové podklady OpenStreetMap).

## Funkce
- 12 **orientačních ukázkových** pražských zastávek, nikoliv kompletní ověřený PID katalog
- Tři hráči bez hesla, obsazování a převzetí, 3 úspěšná obsazení za herní den
- Ochrana území 24 skutečných hodin
- Údržba po sedmi herních dnech, 7 výnosových + 14 nevýnosových dní, následná expirace
- Body, 30denní lokální žebříček, zastávka dne bez zatím neurčené bodové odměny
- Reset lokálních dat

## Důležité limity
Všechna herní data zůstávají **jen na jednom zařízení v daném prohlížeči**. Jiné telefony nesdílejí společný stav. Neexistuje server, zabezpečení ani skutečná databáze. **GPS se záměrně neověřuje**, protože ukázkové souřadnice nejsou validované bezpečně dostupné capture points. Denní uzávěrky se dopočítávají až při otevření stránky, nejsou prováděné serverem ve 03:00. Testovací časy a výzvy neslouží jako produkční autorita.

Další plán: import auditovaných PID dat, oddělení herního engine a úložiště, automatické testy, backend s transakční databází a administrace.

Schválená pravidla jsou v projektové dokumentaci na Google Disku; případné sporné implementační detaily v Alphě nejsou nově schválenými pravidly.

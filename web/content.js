window.SITE_CONTENT = {
  "chapters": [
    [
      "zaciname",
      "Začínáme",
      "map",
      "Vyraz ke skutečné zastávce a otevři její detail. Zkontroluj vlastníka, cenu akce a dostupnou polohu. Úspěšnou akcí získáš území nebo potvrdíš návštěvu.",
      "Hra je určena pro mobilní prohlížeč. Není nutné cestovat dopravním prostředkem; stačí bezpečně dojít ke schválenému bodu."
    ],
    [
      "akcni-body",
      "Akční body",
      "zap",
      "Každý herní den máš 10 akčních bodů. Obnovují se ve 03:00 pražského času.",
      "Obsazení zastávky s jedním druhem dopravy stojí 1, se dvěma a více 2. Převzetí stojí o jeden bod více. Údržba stojí vždy 1."
    ],
    [
      "obsazovani",
      "Obsazování a přebírání",
      "map",
      "Neutrální zastávku můžeš obsadit, cizí po skončení ochrany převzít. Akci musíš potvrdit v detailu a splnit podmínky GPS.",
      "Při převzetí získáš vlastnictví, původní vlastník nepřichází o již získané zastávkobody. Městský a regionální autobus jsou jediný druh dopravy."
    ],
    [
      "ochrana",
      "Ochrana a údržba",
      "shield",
      "Obsazení, převzetí i údržba spouští 24 hodin ochrany od okamžiku akce. Během ochrany nelze zastávku převzít ani udržovat.",
      "Den akce je bez výnosu, následuje sedm plných a sedm sestupných výnosových dní. Bez další údržby se zastávka po skončení cyklu stane neutrální. Údržba po skončení ochrany obnoví celý cyklus."
    ],
    [
      "zastavkobody",
      "Zastávkobody",
      "stop-points",
      "Jednorázovou odměnu určuje druh dopravy a jeho pořadí podle hodnoty. Nejvyšší se počítá celý, druhý z poloviny, další ze čtvrtiny. Obsazení neutrální zastávky přidá 16 zastávkobodů.",
      "Plný denní výnos podle počtu druhů dopravy: 1 = 6, 2 = 12, 3 = 12, 4 a více = 18. V sestupné fázi se vyplácí 6/6 až 0/6 plného výnosu. Body se přičítají při uzávěrce; již získané se neodečítají."
    ],
    [
      "ctvrti",
      "Čtvrti a průzkum",
      "ranking",
      "Vládcem čtvrti je jednoznačný lídr s nejméně třemi právě vlastněnými zastávkami. Při shodě čtvrť vládce nemá. Titul nepřidává zastávkobody.",
      "Průzkum počítá unikátní zastávky navštívené úspěšným obsazením, převzetím, údržbou nebo splněním Zastávky dne. Samotná přítomnost nestačí. Návštěvy zůstávají i po ztrátě vlastnictví."
    ],
    [
      "zastavka-dne",
      "Zastávka dne",
      "daily",
      "Každý herní den je jedna společná zastávka. Za úspěšné splnění získáš 64 zastávkobodů bez spotřeby akčních bodů a nezávisle na vlastnictví.",
      "Každých sedm po sobě jdoucích splnění přidá 256 zastávkobodů. Vynechaný den přeruší sérii. Automatický výběr neopakuje zastávku z posledních 30 herních dní; ruční výjimka je možná."
    ],
    [
      "gps",
      "Poloha a férové hraní",
      "search",
      "Akce vyžaduje čerstvé GPS měření, nejvýše 10 sekund staré a s hlášenou přesností nejvýše 25 metrů. Pracovní dosah od schváleného bodu je 30 metrů.",
      "Při nedostatečné poloze aplikace zkusí nové měření. Neúspěšná akce nespotřebuje akční body. Nevstupuj do kolejiště, vozovky ani nepřístupných míst. Běžné prohlížení mapy nevytváří serverovou historii pohybu."
    ],
    [
      "zebricek",
      "Žebříčky",
      "ranking",
      "Žebříček zobrazuje získané zastávkobody za právě probíhající herní den a předchozích 29 dní nebo za celou historii.",
      "Počet právě vlastněných zastávek je vždy aktuální. Průzkum je osobní statistikou, nikoliv samostatným soutěžním žebříčkem."
    ]
  ],
  "faq": [
    [
      "Potřebuji aplikaci?",
      "Ne. Zastávkobraní je určené pro mobilní webový prohlížeč."
    ],
    [
      "Musím jet MHD?",
      "Ne, ke schválenému ověřovacímu bodu můžeš bezpečně dojít pěšky."
    ],
    [
      "Proč nejde obsadit zastávka?",
      "Zkontroluj polohu, její přesnost, dostupné akční body a ochranu zastávky."
    ],
    [
      "Kdy začíná nový herní den?",
      "Ve 03:00 v časovém pásmu Europe/Prague."
    ],
    [
      "Je nutné ověřit účet?",
      "Ne. Dobrovolné ruční ověření přes Discord nemá vliv na herní akce ani odměny."
    ],
    [
      "Mohu hrát bez internetu?",
      "Ne. Při výpadku budou dostupné pouze již načtené informace; herní akce vyžadují spojení se serverem."
    ],
    [
      "Kdy bude hra spuštěna?",
      "Termín zatím není stanoven. Aktuálně je dostupná lokální demonstrační alfa."
    ]
  ],
  "news": [
    {
      "slug": "prototyp",
      "title": "Připravujeme první veřejnou verzi",
      "date": "2026-11-28",
      "summary": "Vzniká veřejný web a společný design herní aplikace.",
      "body": "Zastávkobraní je zatím ve vývoji. Lokální alfa nabízí mapu, testovací hráče, kartu zastávky a základní herní obrazovky. Skutečné účty, serverové ověřování a čtvrti se připravují."
    }
  ],
  "development": [
    {
      "title": "Funkční lokální alfa",
      "items": [
        "Mapa a karta zastávky",
        "Lokální herní simulace a profil",
        "Základ veřejného webu a administrace"
      ]
    },
    {
      "title": "Ve vývoji",
      "items": [
        "Produkční účty a serverová autorizace",
        "Čtvrti a průzkum",
        "Připojení administrace k serveru"
      ]
    },
    {
      "title": "Později",
      "items": [
        "Discord notifikace",
        "Sbírky zastávek",
        "Úspěchy"
      ]
    }
  ],
  "changes": [
    {
      "date": "2026-11-28",
      "title": "Frontend – vývojová verze",
      "items": [
        "Oddělení veřejné části, hry a administrace",
        "České adresy veřejných stránek",
        "Společný designový systém a navigace"
      ]
    }
  ],
  "contact": {
    "discord": null,
    "email": null
  }
};

# Zastávkobraní backend: etapa 1

Modulární základ API v Node.js 24, bez zásahů do stávajícího frontendového prototypu. Zatím pouze `GET /api/health/live` (běh procesu) a `GET /api/health/ready` (dotaz `SELECT 1` do PostgreSQL). Žádné herní tabulky ani migrace v této etapě nevznikají.

## Lokální spuštění na VPS (zatím pouze loopback)

```bash
cd /srv/zastavkobrani
git fetch origin
git checkout feat/backend-foundation
cd backend
npm ci
npm test
```

`npm ci` vyžaduje committovaný lockfile (připravený samostatně před serverovým nasazením). Bez lockfile nepoužívejte `npm ci`; nejprve na vývojovém stroji proveďte `npm install --package-lock-only` a lockfile commitněte. Neinstalujte globální balíčky.

Zabezpečení: **aplikaci nespouštět jako vlastníka schématu databáze**. Nejprve vytvořit oddělenou roli `zastavkobrani_app` (NOLOGIN lze změnit až s připraveným lokálním peer mapováním; při SCRAM použít tajemství mimo Git). Peer přes Unix socket vyžaduje shodu OS a DB identity nebo výslovné `pg_ident.conf` mapování. Nepoužívat automaticky stávající vlastnickou DB roli pro veřejný web.

Konfigurace používá environment proměnné; ukázka je v `.env.example`, soukromý environment file patří mimo Git. Při nasazení vytvořit samostatný read-only release pro běžící proces, oddělený od Git working tree. Produkční nasazení, Nginx, systemd, DNS, emaily a herní API nejsou součástí etapy 1.

Po přípravě oddělené role ověřit lokálně:
```bash
HOST=127.0.0.1 PORT=3087 PGHOST=/var/run/postgresql PGDATABASE=zastavkobrani_staging PGUSER=zastavkobrani_app npm start
# V jiném terminálu:
curl -fsS http://127.0.0.1:3087/api/health/live
curl -fsS http://127.0.0.1:3087/api/health/ready
```

První endpoint musí vrátit 200. Druhý vrátí 200 pouze při správně nastaveném PostgreSQL přístupu; jinak 503, což je bezpečné chování.

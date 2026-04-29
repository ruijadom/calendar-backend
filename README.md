# Calendar backend (Fastify + PostgreSQL + Drizzle)

Minimal REST API + SSE for the Communicator appointments calendar. Single-tenant MVP (one Postgres per deploy). The schema lives in TypeScript ([`src/db/schema.ts`](src/db/schema.ts)); SQL migrations are generated under [`drizzle/`](drizzle/) and applied with `npm run migrate` (Drizzle migrator).

## Quick local setup (Docker + `.env`)

**Prerequisites:** Node 20+, Docker (for Postgres).

**1. API + database** (from [`calendar-backend/`](./)):

```bash
cd calendar-backend
npm install
npm run local:setup   # env:init → .env, db:up, db:wait, build, migrate, **seed**
npm run local:dev     # default PORT=3001 in .env — Swagger: http://localhost:3001/documentation
```

[`docker-compose.yml`](./docker-compose.yml) expõe Postgres em **`localhost:5433`** (user/db **`calendar`** / password **`calendar`**) para não colidir com um Postgres local na porta **5432**. O [`.env.example`](./.env.example) já usa essa porta. Ajusta `DATABASE_URL` no teu `.env` se mudares o mapeamento.

**Erro `password authentication failed for user "calendar"`**

1. Garante que o container deste repo está a correr: `docker compose up -d` (dentro de `calendar-backend/`).
2. Se já tinhas criado o volume **antes** de usares estes users, recria-o: `docker compose down -v && docker compose up -d` (apaga dados do volume `calendar_pg_data`).
3. Confirma que o `.env` tem `...@localhost:5433/calendar` (não `5432`) se usares o compose deste projecto.
4. Se preferires o teu Postgres na 5432, define `DATABASE_URL` com o user/password **desse** servidor (e não uses o compose, ou muda o mapeamento de portas).

**Ainda `28P01`?** Corre `npm run db:url` dentro de `calendar-backend/` — mostra a URL **efectiva** depois de carregar `.env`. Se aparecer `:5432` com user `calendar`, provavelmente tinhas `export DATABASE_URL=...` no shell; os nossos scripts agora fazem **override** a partir do `.env`, mas convém `unset DATABASE_URL` no terminal ou corrige o `.env` para `...@localhost:5433/...`.

**2. Communicator (repo root)** — copia variáveis Vite:

```bash
cp .env.example .env.local
# Communicator Vite usa a porta 3000; a API do calendário deve ser outra (ex.: 3001).
# Confirma VITE_CALENDAR_API_URL=http://localhost:3001 (já vem no exemplo)
```

Arranca o frontend com o teu comando habitual (`npm run dev`, etc.). Sem `VITE_CALENDAR_API_URL`, o módulo appointments usa mocks.

**Parar Postgres:** `cd calendar-backend && npm run db:down`

### Seed (dados de exemplo)

`npm run seed` (ou faz parte de `local:setup`) insere **~22 eventos** com `providerId` / nomes alinhados ao módulo de appointments do Communicator (`ALL_USERS` / lista de clínicas no repo do frontend), para o calendário mostrar médicos e cores correctos ao ligar `VITE_CALENDAR_API_URL`.

- Cada linha tem `metadata.seedTag = "communicator-dev"`. Voltar a correr `npm run seed` **remove** só essas linhas e reinsere (idempotente para dev).
- Em CI/produção: `npm run build && npm run migrate && npm run seed:dist` (usa `dist/`).

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (Railway plugin provides this). |
| `PORT` | No | Listen port (Railway sets this automatically). |
| `CORS_ORIGIN` | No | Comma-separated allowed browser origins (e.g. `http://localhost:3000` for Communicator dev, or `https://communicator.example.com`). If unset, CORS is permissive for development. |
| `API_KEY` | No | If set, all `/api/v1/*` routes require `X-API-Key` header or `apiKey` query string (`EventSource` cannot set custom headers; use `?apiKey=` on the stream URL). |
| `PUBLIC_API_URL` | No | Public base URL of this API (no trailing slash), e.g. `https://calendar-api.up.railway.app`. Used as the OpenAPI **server** URL in Swagger so “Try it out” hits the right host. Defaults to `http://localhost:$PORT` when unset. |

## Swagger / OpenAPI

After the server starts:

| URL | Description |
|-----|-------------|
| [`/documentation`](http://localhost:3001/documentation) | Swagger UI (interactive docs). Local default `PORT=3001` so it does not clash with Communicator on `:3000`. |
| [`/documentation/json`](http://localhost:3001/documentation/json) | OpenAPI 3.1 JSON spec. |

Route schemas live on each handler (`schema` in Fastify); shared fragments are in [`src/openapi/schemas.ts`](src/openapi/schemas.ts). Registration is in [`src/swagger.ts`](src/swagger.ts).

On **Railway**, set `PUBLIC_API_URL` to your service’s HTTPS URL so Swagger’s requests are not sent to `localhost`.

## Tests

- **`npm test`** — Vitest: unit tests (validation, schemas) always run; **integration** tests are skipped unless `DATABASE_URL` is set **and** (`CALENDAR_INTEGRATION=1` or `CI=true`).
- **Integration** clears the **`events`** table before each case — use a dedicated Postgres (e.g. local Docker from this repo), not production.

```bash
cd calendar-backend
npm install
npm test
# With local .env + Postgres (migrations applied):
CALENDAR_INTEGRATION=1 npm test
# Or only the integration file:
npm run test:integration
```

## Scripts

```bash
npm install
npm run build
DATABASE_URL=... npm run migrate
DATABASE_URL=... npm run seed   # opcional: dados de exemplo
DATABASE_URL=... npm start
```

Schema changes:

1. Edit [`src/db/schema.ts`](src/db/schema.ts).
2. `DATABASE_URL=... npm run db:generate` — updates SQL in `drizzle/` and `drizzle/meta/`.
3. Commit the new migration + snapshot, then deploy (release runs `npm run migrate`).

Optional: `npm run db:studio` — Drizzle Studio (needs `DATABASE_URL`).

Só API com hot-reload (se já tens `.env` e Postgres a correr):

```bash
cd calendar-backend
npm run dev
```

## Railway

1. Create a new project from this directory (or connect the repo and set **Root Directory** to `calendar-backend`).
2. Add the **PostgreSQL** plugin; Railway injects `DATABASE_URL` into the API service.
3. Set `CORS_ORIGIN` to your Communicator web origin(s).
4. Set `PUBLIC_API_URL` to the public HTTPS URL of this service (Swagger “Try it out”).
5. Optionally set `API_KEY` for a shared secret.
6. Deploy: Nixpacks runs `npm install` and `npm run build`. **Release** runs `npm run migrate` (see `railway.toml`). **Start** runs `npm start`.

## Communicator (Vite frontend)

| Variable | Description |
|----------|-------------|
| `VITE_CALENDAR_API_URL` | Base URL of this API (no trailing slash). If unset, appointments use local mocks only. |
| `VITE_CALENDAR_API_KEY` | Optional; sent as `X-API-Key` on REST and as `apiKey` on the SSE URL. |

`CORS_ORIGIN` on the API must include the Communicator web origin.

## API

- `GET /health` — liveness; checks DB with `SELECT 1`.
- `GET /api/v1/events?startDate=&endDate=` — list events overlapping the range (ISO 8601).
- `GET /api/v1/events/:id` — single event.
- `POST /api/v1/events` — create (JSON body, camelCase). Emits SSE `created`.
- `PATCH /api/v1/events/:id` — partial update.
- `DELETE /api/v1/events/:id` — soft delete.
- `GET /api/v1/events/stream` — Server-Sent Events (`event: created` after inserts).

## Error format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "...",
    "details": [{ "field": "endDate", "message": "..." }]
  }
}
```

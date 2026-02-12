# Atempo MVP1

Monorepo TypeScript con MVP1 end-to-end para 4 roles:
- `ATHLETE` (app mobile Expo)
- `COACH` (web)
- `PSY_CLUB` (web)
- `PSY_ATEMPO` (web)

## Stack

- `apps/api`: NestJS + Prisma + Postgres + JWT/refresh + RBAC
- `apps/web`: Next.js (App Router) + Tailwind
- `apps/mobile`: React Native (Expo)
- `packages/shared`: enums y tipos compartidos

## Estructura

```txt
apps/
  api/
  web/
  mobile/
packages/
  shared/
```

## Requisitos

- Node 20+
- pnpm 9+
- Docker (opcional, recomendado para Postgres)

## Variables de entorno

Copia:
- `apps/api/.env.example` -> `apps/api/.env`
- `apps/web/.env.example` -> `apps/web/.env.local`
- `apps/mobile/.env.example` -> `apps/mobile/.env`

## Arranque rapido (local)

1. Instalar dependencias:

```bash
pnpm install
```

2. Levantar Postgres con Docker:

```bash
docker compose up -d postgres
```

3. Generar cliente Prisma + migrar + seed:

```bash
pnpm --filter @atempo/api prisma:generate
pnpm migrate
pnpm seed
```

4. Ejecutar apps:

```bash
pnpm dev:api
pnpm dev:web
pnpm dev:mobile
```

- API: `http://localhost:4000`
- OpenAPI Swagger: `http://localhost:4000/docs`
- Web: `http://localhost:3000`

## Arranque con Docker (API + Postgres)

```bash
docker compose up --build
```

Esto levanta Postgres y API, ejecuta `prisma db push` + `seed` al iniciar.

## Scripts raiz

- `pnpm dev`
- `pnpm dev:api`
- `pnpm dev:web`
- `pnpm dev:mobile`
- `pnpm migrate`
- `pnpm seed`
- `pnpm test`
- `pnpm test:e2e`

## Credenciales demo seed

Password para todos: `password123`

Staff:
- `coach1@atempo.dev` (`COACH`)
- `coach2@atempo.dev` (`COACH`)
- `psyclub1@atempo.dev` (`PSY_CLUB`)
- `psyatempo1@atempo.dev` (`PSY_ATEMPO`)

Athletes:
- `athlete1@atempo.dev` ... `athlete10@atempo.dev` (`ATHLETE`)

## API (resumen de endpoints)

### Auth
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /auth/me`
- `POST /auth/logout`

### Athlete (`ATHLETE`)
- `POST /athlete/onboarding`
- `GET /athlete/home`
- `POST /athlete/checkins`
- `GET /athlete/checkins`
- `GET /athlete/chat`
- `POST /athlete/chat`

### Staff (`COACH|PSY_CLUB|PSY_ATEMPO`)
- `GET /staff/athletes`
- `GET /staff/athletes/:athleteUserId`
- `POST /staff/athletes/:athleteUserId/notes`
- `GET /staff/athletes/:athleteUserId/export.csv`

## RBAC implementado

- `ATHLETE`: solo su onboarding, home, check-ins y chat.
- `COACH`: atletas de su club, check-ins agregados y notas `COACH_VISIBLE`.
- `PSY_CLUB`: atletas de su club, check-ins completos y notas `INTERNAL|COACH_VISIBLE`.
- `PSY_ATEMPO`: acceso total del club demo, y crea notas `INTERNAL`.

## Testing API

Incluye minimo requerido:
- 5 unit tests (auth, guard, checkins, visibilidad notas, CSV)
- 2 e2e (login-refresh-me y restriccion RBAC staff)

Comandos:

```bash
pnpm --filter @atempo/api test
pnpm --filter @atempo/api test:e2e
```

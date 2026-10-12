# Galileo EDU

Plataforma de gestión escolar: alumnos, matrículas, grados, secciones, cursos, notas,
asistencia, pensiones/recibos y un portal para familias, con boletas y boletines en PDF.

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19**
- **Prisma 7** + PostgreSQL (Supabase)
- **NextAuth v5** (Auth.js) con credenciales y roles
- **Tailwind CSS v4**
- **Vitest** para pruebas unitarias

## Requisitos

- Node.js 20+
- Una base de datos PostgreSQL (Supabase u otra)

## Configuración

1. Instala dependencias:

   ```bash
   npm install
   ```

2. Crea tu archivo de entorno a partir del ejemplo y completa los valores:

   ```bash
   cp .env.example .env
   ```

   | Variable | Requerida | Descripción |
   | --- | --- | --- |
   | `DATABASE_URL` | Sí | Conexión de la aplicación (con pooling). |
   | `DIRECT_URL` | No | Conexión directa para migraciones/CLI. |
   | `AUTH_SECRET` | Sí | Secreto de sesión, mínimo 32 caracteres (`npx auth secret`). |
   | `AUTH_URL` | No | URL base de la app. |

   Las variables se validan al iniciar (`src/lib/env.ts`); si falta o es inválida alguna, la app no arranca.

3. Aplica migraciones y datos de ejemplo:

   ```bash
   npm run db:setup
   ```

## Scripts

| Script | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo. |
| `npm run build` / `npm start` | Compilación y servidor de producción. |
| `npm run lint` | ESLint. |
| `npm run test` / `npm run test:watch` | Pruebas con Vitest. |
| `npm run db:generate` | Genera el cliente de Prisma. |
| `npm run db:migrate` | Aplica migraciones pendientes (producción/CI). |
| `npm run db:migrate:dev` | Crea y aplica una migración nueva (desarrollo). |
| `npm run db:seed` | Carga los datos de ejemplo. |
| `npm run db:setup` | Migra y carga los datos de ejemplo. |
| `npm run db:backup` | Exporta la base de datos a `backups/`. |
| `npm run db:restore -- <archivo.json> --yes` | Restaura un backup (borra los datos actuales). |

## Base de datos y migraciones

El esquema vive en `prisma/schema.prisma` y las migraciones versionadas en `prisma/migrations/`.

- **Desarrollo:** cambia el esquema y ejecuta `npm run db:migrate:dev -- --name <descripcion>`.
  Esto genera un nuevo archivo SQL en `prisma/migrations/` que **debe commitearse**.
- **Producción/CI:** ejecuta `npm run db:migrate` (usa `prisma migrate deploy`) antes de arrancar.
- La base de datos existente se "baseló" con la migración `20261012000000_init`, marcada como
  aplicada sin volver a ejecutar el SQL. Para comprobar el estado: `npx prisma migrate status`.

> No uses `prisma db push`: omite el historial de migraciones y puede provocar desincronización.

## Copias de seguridad

- **Supabase** realiza copias automáticas del proyecto (consulta el plan contratado). Es el
  mecanismo principal de recuperación.
- **Manual/portátil:** `npm run db:backup` genera un JSON con todas las tablas en `backups/`
  (ignorado por git). Restaura con `npm run db:restore -- backups/<archivo>.json --yes`.

## Despliegue

1. Configura las variables de entorno en el proveedor.
2. Aplica migraciones: `npm run db:migrate`.
3. Compila y arranca: `npm run build && npm start`.

El flujo de CI (`.github/workflows/ci.yml`) ejecuta lint, typecheck y pruebas en cada push.

## Roles

`SUPER_ADMIN`, `ADMIN`, `DIRECTOR`, `COORDINADOR`, `PROFESOR`, `ALUMNO`, `APODERADO`.
La lógica de permisos está en `src/lib/roles.ts` y el guard de acciones en `src/app/admin/_actions.ts`.

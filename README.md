# Pedidos PO

Aplicación interna para crear y gestionar pedidos de sofás por módulos.

## Stack

- Next.js para la aplicación web.
- Supabase para autenticación, base de datos, políticas RLS y almacenamiento privado de tarifas.
- Vercel para el despliegue desde GitHub.

## Arranque local

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Configura los valores de `.env.local` sin incluirlos nunca en Git:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
```

## Catálogo

Un administrador importa los archivos Excel desde `/catalog`. El original se guarda en el bucket privado `catalog-source` de Supabase y cada carga genera una versión de catálogo en borrador. Solo una versión puede estar publicada.

Los archivos Excel no se suben al repositorio. Las migraciones y la lógica de importación sí se versionan en Git.

## Roles

- `representante`: crea pedidos y consulta únicamente los propios.
- `pedidos`: consulta todos los pedidos y avanza su estado.
- `admin`: incluye las capacidades de pedidos y gestiona las versiones de catálogo.

Los estados permitidos son: `pendiente` → `confirmado` → `en_fabricacion`.

## Despliegue

La rama `main` es la rama de producción en Vercel. Configura las tres variables de entorno anteriores únicamente en el entorno Production del proyecto Vercel.

En Supabase, define la URL de producción en **Authentication → URL Configuration** y registra la URL de devolución de llamada de la aplicación. Para el dominio actual:

```text
https://pedidostpo.vercel.app
https://pedidostpo.vercel.app/auth/callback
```

Antes de fusionar una Pull Request, ejecuta:

```powershell
npm run build
git diff --check
```

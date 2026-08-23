# Enlace a video: https://drive.google.com/file/d/11p_ExRZz2p4r0Iu-MFpldRCiawK0RfIn/view?usp=share_link
# Enlace a slides: https://drive.google.com/file/d/1byfsO_mTJQMiKM_BEPLgdtGEdlHdGTGF/view?usp=share_link
# Enlace repositorio Github: https://github.com/iapedroortiz-dev/pedidostpo.git

# Pedidos TPO

Aplicación interna para gestionar pedidos de sofás modulares, desde la selección de los artículos de catálogo hasta su envío a fabricación.

## Impacto para la empresa

Antes de esta aplicación, los representantes remitían los pedidos en formatos no homogéneos —papel, correo electrónico, WhatsApp u otros canales— y sin una estructura común. El departamento de pedidos tenía que interpretar, comprobar y trasladar manualmente esa información al sistema ERP, lo que generaba un cuello de botella, aumentaba el riesgo de errores y ralentizaba la tramitación.

Pedidos TPO estandariza la captura de cada pedido: obliga a seleccionar clientes y artículos de un catálogo publicado, registrar las cantidades y conservar el detalle de las líneas solicitadas. Así, el departamento de pedidos recibe información estructurada y completa, puede revisarla y avanzar su estado con mayor rapidez antes de introducirla en el ERP. El objetivo es reducir trabajo manual, minimizar incidencias y agilizar el flujo entre representantes, pedidos y fabricación.

## Qué permite hacer

- Crear pedidos para clientes asignados, indicando la fecha, los artículos o módulos, sus cantidades y notas.
- Seleccionar artículos de una tarifa publicada, incluyendo categoría y orientación izquierda/derecha cuando aplique.
- Consultar el histórico de pedidos con cliente, modelo, unidades, fecha y estado.
- Avanzar los pedidos por el flujo operativo: `pendiente` → `confirmado` → `en_fabricacion`.
- Consultar un panel con indicadores de actividad, unidades solicitadas, pedidos recientes y modelos más demandados.
- Importar y publicar versiones de catálogo a partir de archivos Excel.
- Administrar las cuentas operativas y sus permisos.

## Roles y permisos

| Rol | Capacidades |
| --- | --- |
| `representante` | Crea pedidos para sus clientes asignados y consulta únicamente los pedidos propios. |
| `pedidos` | Consulta todos los pedidos y puede confirmarlos o enviarlos a fabricación. |
| `admin` | Tiene las capacidades operativas del rol `pedidos` y además administra catálogos y usuarios. |

Los usuarios desactivados no pueden acceder a la aplicación. Los permisos se aplican tanto en la interfaz como en la base de datos mediante políticas RLS de Supabase.

## Flujo de trabajo

1. Un administrador importa una tarifa Excel desde `/catalog` y se crea una versión de catálogo en estado de borrador.
2. El administrador revisa y publica esa versión. Solo puede haber una versión publicada a la vez.
3. Un representante o administrador crea un pedido con un cliente disponible, artículos del catálogo y cantidades.
4. El pedido se registra inicialmente como `pendiente`.
5. El departamento de pedidos o un administrador lo confirma y, después, lo envía a fabricación.

El pedido conserva la versión de catálogo utilizada y sus líneas de artículo, lo que permite consultar qué se solicitó incluso cuando se publique una tarifa posterior.

## Pantallas principales

- `/dashboard`: resumen de actividad y accesos a las operaciones disponibles para el rol.
- `/pedidos`: creación de pedidos y bandeja de pedidos visibles para el usuario.
- `/catalog`: importación, consulta y publicación de versiones de catálogo; solo para administradores.
- `/usuarios`: alta, edición, activación y asignación de roles de usuarios operativos; solo para administradores.

## Tecnología

- **Next.js y React** para la aplicación web.
- **Supabase** para autenticación, base de datos, funciones SQL, políticas RLS y almacenamiento privado de tarifas.
- **Vercel** para el despliegue desde GitHub.

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

## Catálogo y datos

El archivo Excel original se guarda en el bucket privado `catalog-source` de Supabase. Cada carga crea una versión de catálogo en borrador e incorpora los modelos y artículos de la tarifa, además de actualizar los clientes incluidos en la importación.

Los Excel no se suben al repositorio. Las migraciones de base de datos y la lógica de importación sí se versionan en Git, dentro de `supabase/migrations` y `app/api/catalog/import`.

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

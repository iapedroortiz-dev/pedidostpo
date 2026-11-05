# Capturas del manual visual

Estas imágenes se generan desde los componentes reales de pedidos, con datos ficticios y sin conexión a Supabase. Son referencias de formación, no pedidos ni operaciones reales.

## Regenerar

En Windows, con las dependencias del proyecto ya instaladas y Microsoft Edge disponible:

```powershell
node scripts/capture-help.cjs --write
node --test tests/help.test.cjs
```

Sin `--write`, las capturas se guardan únicamente en el directorio temporal anunciado por el script. `HELP_BROWSER` permite indicar otro ejecutable compatible con Chromium. No se instala software ni se leen archivos `.env`.

El script transforma copias temporales de los componentes: sustituye la obtención de datos por fixtures, conserva el árbol de presentación y deshabilita los envíos. Usa un perfil de navegador nuevo, una lista cerrada de recursos locales y bloqueo de solicitudes ajenas al servidor de demostración. No añade rutas de demostración al producto.

| Imagen | Contenido |
| --- | --- |
| `crear-pedido.png` | Formulario con cliente ficticio, búsqueda de tejido y artículos añadidos. |
| `resumen-pedido.png` | Vista previa abierta mediante la interacción real del formulario. |
| `mis-pedidos.png` | Seguimiento de un pedido ficticio desde el perfil de representante. |
| `revisar-pedido.png` | Detalle de un pedido pendiente ficticio. |
| `pedido-gestionado.png` | Fixture del mismo pedido en estado gestionado; no se ejecuta una transición en la base de datos. |

Revise las cinco imágenes antes de publicarlas. Si cambia la interfaz de pedidos, regenere las capturas. El script comprueba también la ayuda por perfil, la carga de imágenes, el menú contraído y la ausencia de desbordamiento a 1280 y 390 píxeles. Los directorios temporales quedan identificados para su inspección y eliminación posterior; no se versionan.

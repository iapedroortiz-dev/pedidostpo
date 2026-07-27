# Pedidos PO — MVP

Aplicación web ligera para estandarizar pedidos de sofás por módulos. Incluye la creación por parte de ventas y la recepción/consulta por parte del departamento de pedidos.

## Arranque local

```powershell
npm install
npm run dev
```

Abrir `http://localhost:3000`.

## Catálogo desde Excel

El archivo `TARIFA NACIONAL PEDRO ORTIZ - 2026.xlsx` es la fuente del catálogo. La aplicación lo interpreta al solicitar `/api/catalog`, sin convertirlo a un listado manual: los textos de modelos, módulos, mecanismo y la necesidad de orientación Izq./Der. provienen directamente de sus columnas B, C y D.

- En local, guarda los cambios en ese Excel: la aplicación los detecta al volver a la pestaña o, como máximo, en 15 segundos. El botón **Actualizar** permite forzar la lectura al momento.
- En Vercel, sube el Excel actualizado al repositorio y despliega: la siguiente carga leerá ese archivo actualizado.
- **Importar Excel** permite revisar otro archivo de tarifa en la sesión actual, sin sobrescribir el archivo original.

El Excel debe mantener el patrón actual: una fila de modelo con `Opcion` en la columna C, seguida de sus módulos.

## Alcance del MVP

Los pedidos se guardan en `localStorage` del navegador para que el flujo pueda probarse sin infraestructura. En la siguiente iteración, se pueden reemplazar las funciones de lectura/escritura de pedidos por Supabase para compartirlos entre vendedores y el departamento de pedidos, manteniendo la misma interfaz.

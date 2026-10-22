# Onboarding: administrador

Guía para preparar las cuentas, mantener el catálogo y supervisar los pedidos en Pedidos TPO. El perfil interno es `admin`.

> **Antes de practicar:** utilice únicamente un entorno de formación autorizado. Trabajar desde un servidor local no garantiza que la base de datos sea de pruebas. Crear pedidos, importar catálogos o modificar cuentas puede alterar datos reales y enviar correos.

## 1. Preparar el primer acceso

Solicite al responsable del sistema la dirección de la aplicación, una cuenta administradora activa y el contacto de soporte. Confirme qué entorno está utilizando y el procedimiento interno para considerar un pedido gestionado.

1. Abra la aplicación e introduzca su **Correo electrónico** y **Contraseña** en **Acceso al sistema**.
2. Pulse **Entrar**. Debe ver los accesos **Panel**, **Pedidos**, **Catálogo** y **Usuarios**.
3. Si no recuerda la contraseña, seleccione **He olvidado mi contraseña** y después **Enviar enlace de recuperación**.
4. Abra el enlace recibido. La pantalla de recuperación se titula **Activa tu cuenta**: complete **Nueva contraseña**, **Repite la contraseña** y pulse **Activar cuenta**. Debe tener al menos 12 caracteres.

La respuesta de recuperación no confirma si existe una cuenta con ese correo. Si el enlace no es válido, solicite uno nuevo. No comparta contraseñas ni enlaces de recuperación por canales públicos.

## 2. Crear y mantener las cuentas operativas

En **Usuarios**, abra **Nueva cuenta operativa**:

1. Introduzca nombre, correo electrónico, rol y contraseña inicial; repita la contraseña.
2. Seleccione **Representante** o **Departamento de pedidos**, según las responsabilidades de la persona.
3. Pulse **Crear usuario** y compruebe que aparece en **Usuarios registrados**.
4. Entregue las credenciales por un canal privado. La contraseña inicial no vuelve a mostrarse.

Las contraseñas creadas o restablecidas desde esta sección deben tener al menos 12 caracteres e incluir letras y números. El alta crea una cuenta activa: **no espere una invitación automática por correo ni un cambio obligatorio de contraseña al primer acceso**.

| Necesidad | Acción disponible |
| --- | --- |
| Corregir datos de una cuenta operativa | Modificar sus campos y pulsar **Guardar datos**. |
| Cambiar sus funciones | Seleccionar el rol y pulsar **Guardar rol**. |
| Retirar o devolver acceso | Pulsar **Desactivar** o **Activar**; desactivar no elimina la cuenta. |
| Asignar una nueva contraseña | Abrir **Restablecer contraseña** y pulsar **Guardar contraseña**. |
| Cambiar su propia contraseña | Usar **Cambiar mi contraseña**, indicar la actual y pulsar **Actualizar contraseña**. |

Este formulario no permite crear administradores ni gestionar las cuentas administradoras de la lista. Para ello, contacte con el responsable técnico; no utilice credenciales de otra persona.

## 3. Preparar el catálogo y la asignación de clientes

La asignación de clientes se mantiene mediante el Excel del catálogo, no desde una pantalla independiente de clientes. Cree primero las cuentas de representantes y compruebe sus correos, roles y estado activo.

En **Catálogo → Subir nueva tarifa**, utilice un archivo `.xlsx` de hasta 5 MB con estas hojas:

| Hoja | Columnas que debe revisar |
| --- | --- |
| `PRODUCTOS` | `Cod.`, `Descripción`, `Tipo`, `Opción`. El modelo se obtiene de la primera palabra de la descripción. |
| `CLIENTES` | `Cod.`, `Nombre Comercial` y una columna cuyo encabezado contenga `Representante` para indicar el correo de asignación. |
| `TEJIDOS` | `COD_TAPIZADO`, `NOMBRE_TAPIZADO`, `TIPO_TAPIZADO`: `P` para piel y `T` para tela. |

Un correo de representante inexistente bloquea la importación. Dejar su valor vacío deja ese cliente sin asignar. Compruebe que el correo pertenece realmente al representante previsto: no basta con que exista una cuenta.

> **Importar un borrador ya cambia datos:** la importación actualiza o reactiva clientes por código y modifica sus asignaciones inmediatamente, antes de publicar. Los clientes omitidos no se eliminan mediante esta importación. Un fallo posterior puede dejar aplicados los cambios de clientes; no interprete el error como una reversión completa.

## 4. Importar, revisar y publicar

1. Seleccione el Excel. El campo **Nombre de la version** es opcional; si se omite, se obtiene del archivo. Si lo completa, use un nombre único de hasta 120 caracteres.
2. Pulse **Importar como borrador**.
3. Compruebe el mensaje con los modelos, elementos, tejidos y clientes actualizados.
4. En **Historial de catalogos**, revise las cantidades y despliegue los modelos para comprobar códigos, descripciones, categorías y lados.
5. Solo cuando la revisión sea correcta, pulse **Publicar** en el borrador.
6. Compruebe el mensaje **Catálogo publicado correctamente.**

Solo puede haber una versión publicada: publicar la nueva archiva la anterior. La interfaz no ofrece un recorrido para volver a publicar una versión archivada.

**Eliminar** y **Eliminar modelos seleccionados** son operaciones definitivas con confirmación. Existen restricciones para catálogos publicados y pedidos pendientes asociados. No las utilice como ejercicio inicial ni como forma de deshacer una importación de clientes.

## 5. Supervisar y operar pedidos

El **Panel** ofrece el resumen global: pedidos, unidades, pendientes, gestionados, modelos más solicitados y actividad reciente. El ranking de modelos cuenta pedidos, no unidades; la actividad reciente muestra cinco pedidos.

- Para crear un pedido, siga el recorrido de la [guía de representante](representante.md#3-crear-un-pedido), utilizando los clientes disponibles para su cuenta administradora.
- Para revisar detalles y cambiar el estado, siga la [guía del departamento de pedidos](pedidos.md#3-revisar-y-gestionar-un-pedido).
- El flujo actual es **Pendiente → Gestionado**. No equivale por sí solo a fabricación, entrega ni registro automático en un ERP.
- **Marcar como gestionado** aplica el cambio directamente; no hay botón de deshacer en la pantalla.

## 6. Resolver incidencias sin duplicar operaciones

| Situación | Qué hacer |
| --- | --- |
| Un representante no encuentra clientes | Revise su cuenta activa, el correo de asignación y la hoja `CLIENTES`. Corregir mediante importación requiere revisar sus efectos sobre los demás clientes. |
| No aparece el formulario de pedido | Compruebe que existe un catálogo publicado con modelos y tejidos y que hay clientes disponibles. |
| Falla una importación | Anote el mensaje y revise el estado del catálogo y los clientes antes de repetirla. |
| Un pedido muestra una advertencia de correo o adjunto | Compruebe primero si el pedido ya está registrado; no lo cree de nuevo automáticamente. |
| Falla el acceso o la recuperación | Verifique correo y cuenta activa. Si persiste, contacte con soporte sin enviar contraseñas. |

## Lista de comprobación del onboarding

- [ ] Identifico el entorno autorizado y el contacto de soporte.
- [ ] Distingo los permisos de representante y departamento de pedidos.
- [ ] Sé crear, desactivar y restablecer una cuenta operativa.
- [ ] Entiendo que importar un borrador ya afecta a clientes y asignaciones.
- [ ] Sé revisar un catálogo antes de publicarlo.
- [ ] Conozco el criterio interno para marcar pedidos como gestionados.
- [ ] Sé cerrar la sesión mediante **Cerrar sesión**.

**Alcance de esta guía:** describe el código disponible en el repositorio; no certifica la configuración del correo ni las migraciones aplicadas en cada entorno. Si el despliegue muestra otro comportamiento, comuníquelo al responsable antes de realizar operaciones sensibles.

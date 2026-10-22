# Onboarding: departamento de pedidos

Guía para revisar los pedidos recibidos y registrar su gestión en Pedidos TPO. El perfil interno es `pedidos`.

> **Antes de practicar:** utilice un entorno de formación autorizado. Una aplicación abierta en local puede estar conectada a datos reales. Cambiar el estado de un pedido guarda el cambio inmediatamente.

## 1. Acceder por primera vez

Solicite a administración la dirección de la aplicación, su correo de acceso y la contraseña inicial. Confirme también el contacto de soporte y el criterio del departamento para considerar un pedido gestionado.

1. Abra **Acceso al sistema**, complete **Correo electrónico** y **Contraseña** y pulse **Entrar**.
2. Compruebe que aparecen **Panel** y **Pedidos** en el menú.
3. Si no dispone de la contraseña, pulse **He olvidado mi contraseña** y **Enviar enlace de recuperación**.
4. Abra el enlace recibido. En **Activa tu cuenta**, introduzca una nueva contraseña de al menos 12 caracteres, repítala y pulse **Activar cuenta**.

El mensaje de recuperación es genérico y no confirma que exista una cuenta. Si el enlace no es válido, solicite otro. Si la cuenta está desactivada, contacte con administración. No comparta contraseñas ni enlaces de recuperación.

## 2. Entender su alcance

| Puede hacer | No está disponible para este perfil |
| --- | --- |
| Consultar el panel y todos los pedidos. | Crear pedidos. |
| Revisar artículos, tejidos, notas y adjuntos. | Administrar usuarios, clientes o catálogos. |
| Cambiar un pedido pendiente a gestionado. | Editar, cancelar o eliminar pedidos desde esta pantalla. |

En **Panel**, revise los indicadores **Pedidos**, **Unidades**, **Pendientes** y **Gestionados**. **Actividad reciente** muestra cinco pedidos, no toda la bandeja. El ranking **Más solicitados** cuenta pedidos por modelo, no unidades.

Use **Ver pedidos** o **Ir a pedidos** para abrir la bandeja completa.

## 3. Revisar y gestionar un pedido

1. Abra **Pedidos** y despliegue **Todos los pedidos**, bajo **BANDEJA OPERATIVA**.
2. Localice el pedido por su número y compruebe cliente, código, modelos, unidades y fecha del pedido. No confunda esta fecha con **Registrado**, que indica cuándo se guardó en el sistema.
3. Abra **Ver detalle del pedido** y revise:
   - **Tejido** y **Notas**.
   - **Artículos**: códigos, descripción, mecanismo, orientación y cantidades.
   - **Adjuntos**, si se incluyeron documentos.
4. Resuelva los datos incompletos con el representante o administración antes de dar la gestión por terminada.
5. Complete el procedimiento interno acordado por el departamento y pulse **Marcar como gestionado**.
6. Compruebe el mensaje **Estado del pedido actualizado.** y la etiqueta **Gestionado**.

> **Este cambio no tiene botón de deshacer:** se guarda sin una confirmación adicional. Verifique el número de pedido antes de pulsarlo. Si lo marca por error, anote el número y contacte con administración; no cree otro pedido para compensarlo.

### Qué significan los estados

| Estado | Interpretación en la aplicación |
| --- | --- |
| **Pendiente** | El pedido todavía no se ha marcado como gestionado. |
| **Gestionado** | Un usuario autorizado ha registrado su gestión. |

El recorrido disponible es **Pendiente → Gestionado**. La etiqueta no acredita por sí sola fabricación, entrega ni sincronización con un ERP. El responsable del departamento debe concretar qué tareas previas exige para marcarla.

## 4. Avisos por correo y documentos adjuntos

Los avisos de nuevos pedidos pueden llegar a los usuarios activos de este perfil, según la configuración del entorno. El enlace **Gestionar pedido en la plataforma** abre el pedido correspondiente; puede ser necesario iniciar sesión.

- La bandeja de la aplicación es la referencia aunque no llegue el correo.
- No marque un pedido como gestionado únicamente por haber recibido su aviso.
- Los enlaces de descarga de adjuntos caducan a los 15 minutos. Recargue la página para obtener uno nuevo.
- Trate los documentos y datos de clientes como información interna; no los comparta fuera de los canales autorizados.

## 5. Incidencias habituales

| Situación | Qué hacer |
| --- | --- |
| No llega un aviso por correo | Compruebe la bandeja de pedidos y consulte a administración; no suponga que no se creó el pedido. |
| No aparece el botón de gestión | Compruebe si ya está **Gestionado** y si está usando la cuenta correcta. |
| Un adjunto no abre | Recargue la página. Si sigue fallando o no tiene enlace, comunique el número de pedido a administración. |
| Hay datos incorrectos o incompletos | Coordine la corrección con el representante y administración. La pantalla no ofrece edición del pedido. |
| Falla el cambio de estado | Anote el mensaje y recargue para comprobar el estado antes de repetir la acción. |

## Lista de comprobación del onboarding

- [ ] Accedo con una cuenta propia y sé recuperar la contraseña.
- [ ] Distingo el panel de actividad de la bandeja completa.
- [ ] Sé revisar artículos, tejidos, notas y adjuntos.
- [ ] Conozco el criterio interno para considerar un pedido gestionado.
- [ ] Entiendo que no hay un botón para revertir el estado.
- [ ] Sé comunicar una incidencia con el número de pedido, sin compartir contraseñas.
- [ ] Termino la sesión mediante **Cerrar sesión**.

**Referencia:** consulte la [guía de administrador](administrador.md) para conocer las tareas que requieren ese perfil. Esta guía refleja el código del repositorio; la entrega de correos y la configuración del despliegue deben confirmarse en el entorno utilizado.

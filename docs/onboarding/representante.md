# Onboarding: representante

Guía para crear pedidos de los clientes asignados y consultar su estado en Pedidos TPO. El perfil interno es `representante`.

> **Antes de practicar:** confirme con administración que utiliza un entorno de formación autorizado. Abrir la aplicación en local no garantiza que los datos sean de prueba. **Enviar pedido a pedidos** registra una operación real y puede enviar avisos por correo.

## 1. Preparar el primer acceso

Necesita una cuenta activa, clientes activos asignados y un catálogo publicado con modelos y tejidos. Solicite a administración la dirección de acceso, su correo, la contraseña inicial y el contacto para incidencias. El alta ordinaria no envía una invitación automática.

1. En **Acceso al sistema**, complete **Correo electrónico** y **Contraseña** y pulse **Entrar**.
2. Compruebe que aparecen **Panel** y **Pedidos**.
3. Si no recuerda la contraseña, pulse **He olvidado mi contraseña** y **Enviar enlace de recuperación**.
4. Abra el enlace recibido. En la pantalla **Activa tu cuenta**, escriba y repita una contraseña de al menos 12 caracteres y pulse **Activar cuenta**.

La respuesta de recuperación no revela si existe una cuenta con ese correo. Si el enlace es inválido, solicite uno nuevo; si no puede acceder, contacte con administración. No comparta su cuenta ni sus enlaces de recuperación.

## 2. Conocer su espacio de trabajo

- **Panel:** muestra **Resumen de mis pedidos**, indicadores, modelos más solicitados y cinco pedidos recientes. El ranking cuenta pedidos por modelo, no unidades.
- **Pedidos → Crear pedido:** permite preparar y enviar pedidos para los clientes disponibles de su cuenta.
- **Pedidos → Mis pedidos:** permite consultar el resumen y estado de sus propios pedidos.

Este perfil no administra usuarios ni catálogos y no puede cambiar estados. El detalle operativo ampliado y la descarga de adjuntos de pedidos enviados están disponibles para administración y el departamento de pedidos, no para representantes.

## 3. Crear un pedido

### A. Elegir cliente, fecha, modelo y tejido

1. Abra **Pedidos** y despliegue **Crear pedido**.
2. Seleccione **Cliente** y revise **Fecha del pedido**.
3. Seleccione **Modelo**.
4. En **Tejido**, busque por código o nombre y seleccione un resultado. Escribir texto sin elegir un resultado no registra el tejido.

La pantalla permite dejar el tejido sin seleccionar e indicarlo manualmente en **Notas**. Si utiliza esa alternativa, proporcione datos inequívocos para que el departamento pueda tramitarlo.

Si no aparece el formulario, lea el aviso: puede faltar un catálogo publicado, tejidos o clientes asignados. Solicite la revisión a administración; no seleccione otro cliente para evitar el bloqueo.

### B. Configurar los artículos

1. En **Configura la modulación**, abra el desplegable del modelo.
2. Utilice los filtros de material (**Todos / Tela / Piel**), tipo de módulo, mecanismo (**Fijo / Relax / Deslizante**) y orientación, según lo disponible. También puede usar **Buscar módulo o artículo**.
3. Pulse **+ Añadir artículo** para incorporar cada línea.
4. Revise **Artículos añadidos** y ajuste las cantidades con `−` y `+`. Reducir una línea a cero la elimina de la selección.
5. Si aparece **Añadir módulos de otro modelo**, utilícelo para volver al selector y añadirlos al mismo pedido. Revise después el conjunto completo.

### C. Revisar antes de enviar

1. Complete **Notas** con las indicaciones necesarias.
2. Si hace falta, use **Adjuntar documento**.
3. Abra **Ver resumen del pedido** y compruebe cliente, fecha, modelos, códigos, orientación, tejido y cantidades. **Seguir editando** permite volver al formulario; la vista previa no envía el pedido.
4. Cuando todo sea correcto, pulse **Enviar pedido a pedidos**.
5. Espere el mensaje **Pedido #… creado correctamente.** y compruebe su aparición en **Mis pedidos**. Conserve el número para cualquier consulta.

| Campo | Límite |
| --- | --- |
| Líneas del pedido | De 1 a 100. |
| Cantidad por línea | Número entero de 1 a 999. |
| Notas | Hasta 2000 caracteres. |
| Adjunto | Un archivo PDF, JPG/JPEG o PNG de hasta 3 MB. |

> **No repita el envío automáticamente ante una advertencia:** puede haberse guardado el pedido aunque falle el correo o el adjunto. Compruebe primero **Mis pedidos** y el mensaje mostrado. Si se informa de un fallo al guardar las líneas, contacte con administración antes de volver a enviarlo: puede existir un registro incompleto.

## 4. Consultar el estado

Abra **Pedidos → Mis pedidos** y localice el número. Podrá ver cliente, modelos, unidades, fecha, datos de tejido cuando estén informados y estado.

| Estado | Qué indica |
| --- | --- |
| **Pendiente** | El pedido aún no se ha marcado como gestionado. |
| **Gestionado** | Administración o el departamento de pedidos ha registrado su gestión. |

El recorrido actual es **Pendiente → Gestionado**. No significa por sí solo que el pedido esté fabricado o entregado.

No hay controles para editar, cancelar o eliminar un pedido enviado. Si detecta un error, comunique el número y la corrección necesaria al departamento de pedidos; no cree un duplicado sin coordinarlo.

## 5. Resolver incidencias

| Situación | Qué hacer |
| --- | --- |
| No aparece un cliente | Pida a administración que revise su asignación y estado activo. |
| Faltan modelos o tejidos | Solicite la revisión del catálogo publicado. |
| El tejido no figura en el resumen | Vuelva al formulario y seleccione un resultado de la búsqueda, o detállelo en notas. |
| Se rechaza el documento | Compruebe formato y tamaño antes de enviarlo. |
| Aparece un aviso después de enviar | Compruebe si el pedido existe antes de repetir. Si necesita ayuda, facilite el número y el mensaje. |
| Necesita modificar un pedido enviado | Contacte con el departamento de pedidos; no hay edición disponible en esta pantalla. |

## Lista de comprobación del onboarding

- [ ] Utilizo una cuenta propia y sé recuperar la contraseña.
- [ ] Veo los clientes que debo atender y sé a quién comunicar una ausencia.
- [ ] Sé añadir artículos y comprobar tejido, orientación y cantidades.
- [ ] Reviso el resumen antes de enviar y conservo el número del pedido.
- [ ] Distingo **Pendiente** de **Gestionado** y no lo confundo con entrega.
- [ ] Sé actuar ante un error sin duplicar pedidos.
- [ ] Al terminar, pulso **Cerrar sesión**.

**Siguiente paso:** consulte la [guía del departamento de pedidos](pedidos.md) para conocer cómo se revisa el envío. Esta guía refleja el código del repositorio; la configuración de correo y del entorno debe confirmarse con administración.

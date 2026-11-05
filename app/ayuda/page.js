import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';
import styles from './help.module.css';

export const metadata = { title: 'Ayuda | Pedidos PO' };

const guides = [
  {
    id: 'crear-pedido', role: 'representante', title: 'Crear y enviar un pedido',
    description: 'Del cliente al envío, sin olvidar los detalles.',
    image: 'crear-pedido.png',
    alt: 'Formulario real de pedido con el cliente ficticio Tienda Ejemplo Demo, resultados de búsqueda de tejido y artículos añadidos.',
    steps: [
      ['Elija cliente, fecha y modelo', 'Abra Pedidos → Crear pedido. Compruebe el cliente y la fecha antes de configurar los artículos.'],
      ['Seleccione tejido y artículos', 'Busque el tejido y seleccione un resultado: escribir su nombre no basta. Use + Añadir artículo y ajuste las cantidades con − y +.'],
      ['Revise antes de enviar', 'Complete las notas y, si lo necesita, adjunte un PDF o imagen de hasta 3 MB. Abra Ver resumen del pedido; Seguir editando permite corregirlo.'],
      ['Envíe una sola vez', 'Pulse Enviar pedido a pedidos y espere la confirmación con el número. Compruebe después Mis pedidos.'],
    ],
    warning: 'Si aparece una advertencia de correo o adjunto, el pedido puede estar registrado. Compruébelo antes de repetir el envío.',
  },
  {
    id: 'resumen-pedido', role: 'representante', title: 'Revisar el resumen antes de enviar',
    description: 'Una última comprobación de cliente, tejido y artículos.',
    image: 'resumen-pedido.png',
    alt: 'Vista previa real de un pedido ficticio antes del envío, con cliente, tejido, artículos y cantidades.',
    steps: [
      ['Compruebe el resumen', 'Antes del envío, Ver resumen del pedido muestra cliente, tejido, artículos y cantidades. Esta vista previa no envía nada.'],
      ['Corrija lo necesario', 'Pulse Seguir editando si necesita cambiar la selección. Compruebe también las notas y las cantidades de cada artículo.'],
      ['Confirme desde el formulario', 'Cierre el resumen y pulse Enviar pedido a pedidos solo cuando haya revisado la información.'],
    ],
    warning: 'La vista previa no es una confirmación de envío. Espere el mensaje con el número de pedido y compruebe su aparición en Mis pedidos.',
  },
  {
    id: 'consultar-pedido', role: 'representante', title: 'Consultar mis pedidos',
    description: 'Localice un envío y compruebe su estado.',
    image: 'mis-pedidos.png',
    alt: 'Bandeja real Mis pedidos de un representante con un pedido ficticio pendiente y su número, cliente, unidades y fecha.',
    steps: [
      ['Abra su bandeja', 'Entre en Pedidos → Mis pedidos. Aquí aparecen los pedidos que ha enviado con su cuenta.'],
      ['Localice el número enviado', 'Consulte el cliente, la fecha, las unidades y el estado. Conserve el número para cualquier consulta.'],
      ['Consulte cualquier corrección', 'Si necesita cambiar un pedido enviado, comunique su número al departamento de pedidos. No hay edición, cancelación ni eliminación en esta pantalla.'],
    ],
    warning: 'Pendiente significa que aún no se ha registrado la gestión. Gestionado no significa que el pedido esté fabricado o entregado.',
  },
  {
    id: 'gestionar-pedido', role: 'pedidos', title: 'Revisar y gestionar un pedido',
    description: 'Revise toda la información antes de cambiar el estado.',
    image: 'revisar-pedido.png',
    alt: 'Detalle operativo real de un pedido ficticio pendiente con tejido, notas, artículos y el botón Marcar como gestionado.',
    steps: [
      ['Abra la bandeja', 'Entre en Pedidos → Todos los pedidos y localice el número. La fecha del pedido y la fecha de registro son datos distintos.'],
      ['Revise el detalle', 'Abra Ver detalle del pedido. Compruebe tejido, notas, códigos, orientación, cantidades y adjuntos, si los hay.'],
      ['Complete la gestión acordada', 'Resuelva las dudas con el representante y siga el procedimiento interno del departamento. Después pulse Marcar como gestionado.'],
    ],
    warning: 'El cambio se guarda directamente y no tiene botón de deshacer. Compruebe el número de pedido antes de pulsarlo.',
  },
  {
    id: 'comprobar-gestion', role: 'pedidos', title: 'Comprobar la gestión y resolver incidencias',
    description: 'La bandeja es la referencia, aunque no llegue el aviso por correo.',
    image: 'pedido-gestionado.png',
    alt: 'La misma pantalla operativa con un pedido ficticio en estado Gestionado, sin el botón de cambio de estado.',
    steps: [
      ['Compruebe el estado', 'Tras la confirmación, el pedido debe mostrar Gestionado. Esto no acredita fabricación, entrega ni registro automático en un ERP.'],
      ['Revise aunque no llegue el correo', 'Los avisos dependen de la configuración. Consulte la bandeja; no dé por inexistente un pedido porque no recibió su aviso.'],
      ['Recargue los enlaces caducados', 'Los enlaces de adjuntos caducan a los 15 minutos. Recargue la página; si el problema continúa, comunique el número de pedido a administración.'],
    ],
    warning: 'Si cambió un estado por error o detecta información incorrecta, contacte con administración. No cree otro pedido para compensarlo.',
  },
];

export default async function HelpPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect('/login?next=%2Fayuda');

  const { data: profile, error } = await supabase.from('profiles').select('role, active').eq('id', userId).single();
  if (error || !profile?.active) redirect('/login?error=Usuario%20sin%20acceso%20activo.');
  if (!['admin', 'pedidos', 'representante'].includes(profile.role)) redirect('/dashboard');

  const visibleGuides = guides.filter((guide) => profile.role === 'admin' || guide.role === profile.role);
  const audience = profile.role === 'admin' ? 'Representantes y departamento de pedidos'
    : profile.role === 'pedidos' ? 'Departamento de pedidos' : 'Representantes';

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div><p className="eyebrow">MANUAL VISUAL · {audience}</p><h1>¿Cómo puedo ayudarte?</h1><p>Elija una tarea y siga los pasos con las capturas de referencia.</p></div>
        <Link href="/pedidos" className="secondary-button">Ir a pedidos</Link>
      </header>
      <p className={styles.notice}>Las capturas muestran la aplicación con <strong>datos ficticios</strong>. No son pedidos reales ni un entorno de práctica. En las pantallas operativas, sus acciones sí pueden modificar datos reales.</p>
      <nav className={styles.index} aria-label="Tareas de ayuda">
        {visibleGuides.map((guide, index) => <a href={`#${guide.id}`} key={guide.id}><span>{index + 1}</span><div><strong>{guide.title}</strong><small>{guide.description}</small></div><b aria-hidden="true">↓</b></a>)}
      </nav>
      {visibleGuides.map((guide) => (
        <section className={styles.card} id={guide.id} key={guide.id} aria-labelledby={`${guide.id}-title`}>
          <p className="eyebrow">{guide.role === 'pedidos' ? 'DEPARTAMENTO DE PEDIDOS' : 'REPRESENTANTES'}</p>
          <h2 id={`${guide.id}-title`}>{guide.title}</h2>
          <ol className={styles.steps}>{guide.steps.map(([title, text]) => <li key={title}><strong>{title}</strong><p>{text}</p></li>)}</ol>
          <p className={styles.warning}><strong>Importante:</strong> {guide.warning}</p>
          <details className={styles.capture} open>
            <summary>Ver captura de referencia</summary>
            <figure>
              <a href={`/assets/help/${guide.image}`} target="_blank" rel="noreferrer" aria-label={`Ampliar captura: ${guide.title} (nueva pestaña)`}>
                <img src={`/assets/help/${guide.image}`} alt={guide.alt} width="1280" height="1200" loading="lazy" />
              </a>
              <figcaption>Demostración local con datos ficticios. <a href={`/assets/help/${guide.image}`} target="_blank" rel="noreferrer">Ampliar captura (nueva pestaña)</a></figcaption>
            </figure>
          </details>
        </section>
      ))}
      <section className={styles.card} aria-labelledby="help-access">
        <h2 id="help-access">Acceso y otras dudas</h2>
        <details><summary>No recuerdo mi contraseña</summary><p>En la pantalla de acceso, pulse He olvidado mi contraseña y solicite un enlace. En Activa tu cuenta, introduzca y repita una contraseña de al menos 12 caracteres. Nunca comparta el enlace ni su contraseña.</p></details>
        {profile.role !== 'pedidos' && <details><summary>No veo un cliente, modelo o tejido</summary><p>Solicite a administración que revise la cuenta activa, los clientes asignados y el catálogo publicado con sus tejidos. No elija otro cliente para evitar el bloqueo.</p></details>}
        <p>Para comunicar una incidencia, indique el número de pedido y el mensaje que aparece, sin incluir contraseñas. Al terminar, utilice <strong>Cerrar sesión</strong>.</p>
      </section>
    </main>
  );
}

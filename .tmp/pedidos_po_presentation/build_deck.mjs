import fs from 'node:fs/promises';
import { Presentation, PresentationFile } from '@oai/artifact-tool';

const OUT = 'C:/Users/USUARIO/Downloads/codex/pedidosTPO/Presentacion_Pedidos_PO_Arquitectura.pptx';
const DIR = 'C:/Users/USUARIO/Downloads/codex/pedidosTPO/.tmp/pedidos_po_presentation/output';
const W = 1280, H = 720;
const C = { ink:'#101828', muted:'#475467', light:'#F2F4F7', line:'#D0D5DD', blue:'#3D8DFF', pale:'#EAF5FB', mint:'#D9F8E8', amber:'#FFF2CC', white:'#FFFFFF', dark:'#0B1220' };

async function save(path, blob) { await fs.writeFile(path, new Uint8Array(await blob.arrayBuffer())); }
function box(slide, x, y, w, h, fill=C.white, line=C.line, name) {
  return slide.shapes.add({ geometry:'rect', name, position:{left:x,top:y,width:w,height:h}, fill, line:{style:'solid',fill:line,width:1} });
}
function text(slide, value, x, y, w, h, size=20, opts={}) {
  const s = slide.shapes.add({ geometry:'textbox', name:opts.name, position:{left:x,top:y,width:w,height:h}, fill:'none', line:{style:'solid',fill:'none',width:0} });
  s.text = value;
  s.text.style = { fontSize:size, fontFace:'Helvetica Neue', color:opts.color||C.ink, bold:opts.bold||false, alignment:opts.align||'left', verticalAlignment:opts.valign||'top', autoFit:'shrinkText', insets:{left:0,right:0,top:0,bottom:0} };
  return s;
}
function rule(slide, x, y, w, color=C.line, thickness=1) { return slide.shapes.add({geometry:'rect',position:{left:x,top:y,width:w,height:thickness},fill:color,line:{style:'solid',fill:color,width:0}}); }
function arrow(slide, x, y, w, h=22, fill=C.blue) { return slide.shapes.add({geometry:'rightArrow',position:{left:x,top:y,width:w,height:h},fill,line:{style:'solid',fill,width:0}}); }
function dot(slide,x,y,fill=C.blue) { return slide.shapes.add({geometry:'ellipse',position:{left:x,top:y,width:14,height:14},fill,line:{style:'solid',fill,width:0}}); }
function node(slide, label, sub, x, y, w, h, fill=C.light, accent=C.blue) {
  box(slide,x,y,w,h,fill,C.line);
  rule(slide,x,y,6,accent,6);
  text(slide,label,x+20,y+18,w-34,30,22,{bold:true});
  if(sub) text(slide,sub,x+20,y+54,w-34,h-64,16,{color:C.muted});
}
function note(slide, sources) { slide.speakerNotes.textFrame.setText(`[Sources]\n${sources}`); slide.speakerNotes.setVisible(true); }
function chrome(slide, section, n) { text(slide,section.toUpperCase(),56,28,460,20,13,{bold:true,color:C.muted}); text(slide,String(n).padStart(2,'0'),1180,28,44,20,13,{align:'right',color:C.muted}); rule(slide,56,57,1168); }
function title(slide, headline, sub, n, section='Pedidos PO') { chrome(slide,section,n); text(slide,headline,56,84,1120,70,38,{bold:true}); if(sub) text(slide,sub,56,160,1050,42,20,{color:C.muted}); }
function addSlide(p){ const s=p.slides.add(); s.background.fill=C.white; return s; }

function s1(p) {
  const s=addSlide(p); rule(s,56,56,7,554,C.blue,7); text(s,'PEDIDOS PO',86,55,400,26,18,{bold:true,color:C.muted});
  text(s,'Un flujo de pedidos\ncontrolado, trazable\ny preparado para fábrica.',86,185,920,255,60,{bold:true});
  text(s,'Revisión de arquitectura e ingeniería de software',88,490,660,34,24,{color:C.muted});
  text(s,'Next.js · Supabase · Vercel',88,544,420,28,19,{color:C.blue,bold:true});
  box(s,900,150,280,350,C.pale,C.pale); text(s,'PEDIDO',932,192,180,30,21,{bold:true,color:C.muted});
  text(s,'# 00142',932,230,200,60,40,{bold:true}); rule(s,932,315,210); text(s,'Cliente · catálogo publicado\nEstado · trazabilidad',932,342,210,65,17,{color:C.muted});
  note(s,'Repositorio local: README.md, package.json.');
}
function s2(p) {
  const s=addSlide(p); title(s,'El problema: convertir una tarifa cambiante en órdenes fiables','El MVP elimina la dependencia de Excel y canaliza el pedido hasta fabricación con permisos y estados explícitos.',2,'Objetivo');
  node(s,'Entrada','Tarifa Excel + hoja CLIENTES',56,270,255,160,C.pale);
  arrow(s,325,338,68);
  node(s,'Normalización','Modelos, artículos, clientes y asignaciones',412,270,255,160,C.light);
  arrow(s,681,338,68);
  node(s,'Operación','Pedido con líneas, cliente, versión y estado',768,270,255,160,C.mint,'#1F9D55');
  arrow(s,1037,338,68);
  node(s,'Fabricación','Bandeja operativa y transición controlada',1124,270,100,160,C.amber,'#D49200');
  text(s,'Resultado: una fuente de verdad operativa; el Excel original queda privado y fuera de Git.',56,520,1120,45,24,{bold:true});
  note(s,'Repositorio local: README.md; app/api/catalog/import/route.js; app/pedidos/actions.js.');
}
function s3(p) {
  const s=addSlide(p); title(s,'Stack: una aplicación web server-first sobre BaaS gestionado','Separación pragmática: UI React, lógica de servidor Next.js y servicios de plataforma en Supabase.',3,'Tecnología');
  const items=[['Frontend','Next.js 16\nReact 19\nApp Router'],['Backend BFF','Server Components\nServer Actions\nRoute Handler'],['Plataforma','Supabase Auth\nPostgres + RLS\nStorage privado'],['Entrega','GitHub\nVercel\nmain → producción']];
  items.forEach((it,i)=>{const x=56+i*292; box(s,x,275,250,205,i===2?C.pale:C.light); text(s,it[0],x+18,298,212,32,22,{bold:true}); rule(s,x+18,344,78,C.blue,3); text(s,it[1],x+18,365,210,90,18,{color:C.muted});});
  text(s,'Dependencias destacadas: @supabase/ssr, @supabase/supabase-js y jszip para lectura de XLSX.',56,560,1110,28,18,{color:C.muted});
  note(s,'Repositorio local: package.json; lib/supabase/*.js; README.md.');
}
function s4(p) {
  const s=addSlide(p); title(s,'Arquitectura de ejecución: el navegador no recibe secretos','Los caminos privilegiados se concentran en el servidor y las reglas de datos se aplican también en PostgreSQL.',4,'Arquitectura');
  // edges first
  arrow(s,290,328,70); arrow(s,610,328,70); arrow(s,930,328,70); arrow(s,682,470,190,18,C.muted);
  node(s,'Usuario','Representante · Pedidos · Admin',56,270,220,140,C.pale);
  node(s,'Next.js','Pages + Server Actions\nAPI /catalog/import',370,270,225,140,C.light);
  node(s,'Supabase','Auth · Postgres · RLS\nRPC · Storage',690,270,225,140,C.mint,'#1F9D55');
  node(s,'Vercel','Build + runtime\nproducción desde main',1010,270,214,140,C.light);
  node(s,'Admin client','Clave secreta: importación y administración de usuarios',458,500,365,100,C.amber,'#D49200');
  text(s,'Clave de diseño: el cliente usa la publishable key; las operaciones de administración usan SUPABASE_SECRET_KEY solo del lado servidor.',56,600,1120,40,18,{color:C.muted});
  note(s,'Repositorio local: lib/supabase/browser.js; lib/supabase/server.js; lib/supabase/admin.js; app/api/catalog/import/route.js; README.md.');
}
function s5(p) {
  const s=addSlide(p); title(s,'Flujo de aplicación: un pedido queda ligado al catálogo publicado','El servidor vuelve a validar identidad, rol, cliente, catálogo, artículos y cantidades antes de persistir.',5,'Flujo de pedidos');
  const steps=[['1','Sesión','Proxy refresca sesión\ny protege rutas'],['2','Selección','Cliente asignado +\nartículos del catálogo'],['3','Validación','Server Action\nrelee la fuente'],['4','Persistencia','orders + order_lines\n+ auditoría'],['5','Operación','pendiente → confirmado\n→ en_fabricacion']];
  steps.forEach((a,i)=>{const x=56+i*236; if(i<4) arrow(s,x+185,360,46,18); dot(s,x,274); text(s,a[0],x+25,267,30,24,16,{bold:true,color:C.blue}); text(s,a[1],x,310,186,32,22,{bold:true}); text(s,a[2],x,354,190,55,17,{color:C.muted});});
  rule(s,56,493,1168); text(s,'El cambio de estado se ejecuta mediante la función PostgreSQL change_order_status, que impone rol y transición permitida.',56,525,1090,42,21,{bold:true});
  note(s,'Repositorio local: proxy.js; lib/supabase/proxy.js; app/pedidos/new-order-form.js; app/pedidos/actions.js; supabase/migrations/20260727102151_initial_schema.sql.');
}
function s6(p) {
  const s=addSlide(p); title(s,'El catálogo se publica en dos fases para no interrumpir la operación','Importar no equivale a activar: el administrador valida y publica una única versión vigente.',6,'Flujo de catálogo');
  const stages=[['Excel','XLSX ≤ 5 MB\nCLIENTES + modelos'],['Parser','JSZip + validación\nde cabeceras y duplicados'],['Borrador','Storage privado +\nversión y artículos'],['Publicación','RPC atómica\narchiva la anterior'],['Consumo','Pedidos solo leen\nel catálogo publicado']];
  stages.forEach((a,i)=>{const x=56+i*236; box(s,x,275,190,170,i===3?C.pale:C.light); text(s,a[0],x+18,298,150,30,22,{bold:true}); text(s,a[1],x+18,340,154,68,17,{color:C.muted}); if(i<4) arrow(s,x+194,345,36,16);});
  text(s,'Invariante de base de datos: índice único parcial para que solo exista una versión con estado publicado.',56,530,1050,34,22,{bold:true});
  note(s,'Repositorio local: app/api/catalog/import/route.js; lib/catalog.js; app/catalog/actions.js; supabase/migrations/20260729072741_publish_catalog_versions.sql.');
}
function s7(p) {
  const s=addSlide(p); title(s,'La seguridad combina controles de ruta, de aplicación y de base de datos','La autorización no depende de ocultar opciones de la interfaz: RLS protege el acceso incluso ante llamadas directas.',7,'Seguridad');
  const layers=[['Perímetro','Proxy redirige solicitudes sin sesión a /login','Sesión'],['Aplicación','Server Actions comprueban perfil activo, rol y payload','Reglas de negocio'],['Datos','RLS filtra filas por auth.uid() y rol; RPC con validación','Defensa final']];
  layers.forEach((a,i)=>{const y=260+i*105; box(s,56,y,1110,78,i===2?C.pale:C.light); text(s,a[0],82,y+16,180,28,22,{bold:true}); text(s,a[1],290,y+18,740,26,18,{color:C.muted}); text(s,a[2],1046,y+19,100,25,15,{bold:true,color:C.blue,align:'right'});});
  text(s,'Modelo de roles: representante (propios pedidos) · pedidos (todos y estados) · admin (pedidos + catálogo + usuarios).',56,596,1125,34,20,{bold:true});
  note(s,'Repositorio local: lib/supabase/proxy.js; app/pedidos/actions.js; supabase/migrations/20260727102151_initial_schema.sql; app/usuarios/actions.js.');
}
function s8(p) {
  const s=addSlide(p); title(s,'El modelo conserva la foto comercial y aporta trazabilidad','Pedidos, líneas, versión de catálogo y eventos de auditoría forman el registro operacional.',8,'Datos');
  // relations first
  arrow(s,296,322,60,16,C.muted); arrow(s,596,322,60,16,C.muted); arrow(s,896,322,60,16,C.muted); arrow(s,746,446,16,64,C.muted);
  node(s,'profiles','id · email · role · active',56,270,220,135,C.light);
  node(s,'catalog_versions','borrador / publicado / archivado',370,270,220,135,C.pale);
  node(s,'orders','cliente, representante, versión, estado',670,270,220,135,C.mint,'#1F9D55');
  node(s,'order_lines','artículo, módulo, cantidad, lado',970,270,220,135,C.light);
  node(s,'audit_events','actor, acción, antes / después',670,520,250,100,C.amber,'#D49200');
  text(s,'También: catalog_models → catalog_items y customers asignados a representante. La orden conserva nombre y código del cliente como snapshot.',56,640,1140,28,17,{color:C.muted});
  note(s,'Repositorio local: supabase/migrations/20260727102151_initial_schema.sql; supabase/migrations/20260730090000_add_catalog_items.sql; supabase/migrations/20260731130000_add_customers.sql.');
}
function s9(p) {
  const s=addSlide(p); title(s,'El flujo de desarrollo termina con una entrega reproducible','Las migraciones y la lógica viven en Git; los Excel y secretos se mantienen fuera del repositorio.',9,'Desarrollo y entrega');
  const steps=[['Cambio','Código Next.js\no migración SQL'],['Verificación','npm run build\ngit diff --check'],['Revisión','Pull Request\nantes de fusionar'],['Entrega','main dispara\ndespliegue Vercel'],['Configuración','Variables solo\nen Production']];
  steps.forEach((a,i)=>{const x=56+i*236; if(i<4) arrow(s,x+190,352,38,16); text(s,a[0],x,290,190,32,22,{bold:true}); text(s,a[1],x,335,190,52,17,{color:C.muted}); dot(s,x+2,420,i===4?'#1F9D55':C.blue);});
  rule(s,56,470,1168); text(s,'Migraciones Supabase versionadas  ·  Configuración por entorno  ·  Validación de build antes de merge',56,515,1120,32,22,{bold:true});
  note(s,'Repositorio local: README.md; supabase/migrations/*.sql; package.json.');
}
function s10(p) {
  const s=addSlide(p); title(s,'Decisiones visibles y próximos endurecimientos técnicos','La arquitectura favorece velocidad de entrega sin renunciar a límites claros; hay puntos naturales de evolución.',10,'Evaluación');
  const rows=[['Decisión actual','Beneficio','Siguiente paso'],['BaaS Supabase','Reduce infraestructura; Auth, DB, RLS y Storage coherentes','Observabilidad de RPC, importaciones y errores'],['Importación server-side','Aísla secreto y permite validar antes de publicar','Transacción o procedimiento para la carga completa'],['Snapshots en pedidos','El histórico resiste cambios de catálogo y cliente','Pruebas de regresión de compatibilidad de catálogos'],['Server Actions','Menos superficie API y validación cerca del caso de uso','Tests de integración y contratos de autorización']];
  const xs=[56,385,700], ws=[305,295,465]; rows.forEach((r,ri)=>{const y=240+ri*76; if(ri===0) box(s,56,y,1110,58,C.dark,C.dark); else box(s,56,y,1110,58,ri%2?C.light:C.white,C.line); r.forEach((v,ci)=>text(s,v,xs[ci]+16,y+(ri===0?17:14),ws[ci]-28,44,ri===0?18:16,{bold:ri===0,color:ri===0?C.white:(ci===0?C.ink:C.muted)}));});
  note(s,'Inferencias basadas en: README.md; app/api/catalog/import/route.js; app/pedidos/actions.js; lib/supabase/*.js; supabase/migrations/*.sql.');
}
function s11(p) {
  const s=addSlide(p); rule(s,56,56,7,554,C.blue,7); text(s,'CIERRE',86,55,250,26,18,{bold:true,color:C.muted});
  text(s,'Pedidos PO ya define\nun núcleo operativo\ncoherente.',86,175,835,220,58,{bold:true});
  text(s,'Catálogo versionado · autorización en capas · pedidos trazables · entrega simple',88,458,950,34,23,{color:C.muted});
  rule(s,88,528,520,C.blue,4); text(s,'Discusión propuesta: priorizar pruebas de integración y observabilidad antes de ampliar funcionalidad.',88,558,800,45,20,{bold:true});
  note(s,'Síntesis basada en el repositorio local completo inspeccionado.');
}

async function main() {
  await fs.mkdir(DIR,{recursive:true});
  const p=Presentation.create({slideSize:{width:W,height:H}});
  [s1,s2,s3,s4,s5,s6,s7,s8,s9,s10,s11].forEach(fn=>fn(p));
  for (let i=0;i<p.slides.items.length;i++) await save(`${DIR}/slide-${String(i+1).padStart(2,'0')}.png`,await p.export({slide:p.slides.items[i],format:'png',scale:1}));
  await save(`${DIR}/deck-montage.webp`,await p.export({format:'webp',montage:true,scale:1}));
  const pptx=await PresentationFile.exportPptx(p); await pptx.save(OUT);
}
main().catch(e=>{console.error(e);process.exitCode=1;});

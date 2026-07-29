import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';
import ImportForm from './import-form';
import { publishCatalogVersion } from './actions';

function messageFrom(value) {
  return typeof value === 'string' ? value : '';
}

function formatDate(value) {
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

export default async function CatalogPage({ searchParams }) {
  const params = (await searchParams) || {};
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, active')
    .eq('id', userId)
    .single();

  if (!profile?.active || profile.role !== 'admin') {
    redirect('/dashboard');
  }

  const { data: versions } = await supabase
    .from('catalog_versions')
    .select('id, label, status, created_at, published_at')
    .order('created_at', { ascending: false });

  const error = messageFrom(params.error);
  const message = messageFrom(params.message);

  return (
    <main className="catalog-page">
      <header className="catalog-header">
        <div>
          <p className="eyebrow">ADMINISTRACIÓN</p>
          <h1>Catálogo de producto</h1>
          <p>Gestiona las tarifas sin incluir los Excel en el repositorio.</p>
        </div>
        <a className="secondary-button catalog-back" href="/dashboard">
          Volver al panel
        </a>
      </header>

      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {message ? <p className="catalog-success" role="status">{message}</p> : null}

      <ImportForm />

      <section className="catalog-panel">
        <div>
          <p className="eyebrow">VERSIONES</p>
          <h2>Historial de catálogos</h2>
        </div>

        <div className="catalog-version-list">
          {(versions || []).map((version) => (
            <article className="catalog-version" key={version.id}>
              <div>
                <h3>{version.label}</h3>
                <p>
                  Creada: {formatDate(version.created_at)}
                  {version.published_at
                    ? ` · Publicada: ${formatDate(version.published_at)}`
                    : ''}
                </p>
              </div>

              <div className="catalog-version-actions">
                <span className={`catalog-badge status-${version.status}`}>
                  {version.status}
                </span>

                {version.status === 'borrador' ? (
                  <form action={publishCatalogVersion}>
                    <input
                      type="hidden"
                      name="catalogVersionId"
                      value={version.id}
                    />
                    <button type="submit">Publicar</button>
                  </form>
                ) : null}
              </div>
            </article>
          ))}

          {!versions?.length ? (
            <p className="auth-intro">Todavía no se ha importado ningún catálogo.</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
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

  if (!userId) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, active')
    .eq('id', userId)
    .single();

  if (!profile?.active || profile.role !== 'admin') redirect('/dashboard');

  const { data: versions } = await supabase
    .from('catalog_versions')
    .select('id, label, status, created_at, published_at')
    .order('created_at', { ascending: false });
  const versionIds = (versions || []).map((version) => version.id);
  const { data: models } = versionIds.length
    ? await supabase
        .from('catalog_models')
        .select('id, catalog_version_id, name, display_order')
        .in('catalog_version_id', versionIds)
        .order('display_order')
    : { data: [] };
  const modelIds = (models || []).map((model) => model.id);
  const { data: items } = modelIds.length
    ? await supabase
        .from('catalog_items')
        .select('id, catalog_model_id, code, description, category_option, side_option, display_order')
        .in('catalog_model_id', modelIds)
        .order('display_order')
    : { data: [] };

  const error = messageFrom(params.error);
  const message = messageFrom(params.message);

  return (
    <main className="catalog-page">
      <header className="catalog-header">
        <div>
          <p className="eyebrow">ADMINISTRACION</p>
          <h1>Catalogo de producto</h1>
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
          <h2>Historial de catalogos</h2>
        </div>

        <div className="catalog-version-list">
          {(versions || []).map((version) => {
            const versionModels = (models || []).filter(
              (model) => model.catalog_version_id === version.id
            );
            const itemCount = versionModels.reduce(
              (total, model) => total + (items || []).filter(
                (item) => item.catalog_model_id === model.id
              ).length,
              0
            );

            return (
              <article className="catalog-version" key={version.id}>
                <div className="catalog-version-content">
                  <div className="catalog-version-summary">
                    <div>
                      <h3>{version.label}</h3>
                      <p>
                        Creada: {formatDate(version.created_at)}
                        {version.published_at
                          ? ` - Publicada: ${formatDate(version.published_at)}`
                          : ''}
                      </p>
                      <small>{versionModels.length} modelos - {itemCount} elementos</small>
                    </div>

                    <div className="catalog-version-actions">
                      <span className={`catalog-badge status-${version.status}`}>
                        {version.status}
                      </span>
                      {version.status === 'borrador' ? (
                        <form action={publishCatalogVersion}>
                          <input type="hidden" name="catalogVersionId" value={version.id} />
                          <button type="submit">Publicar</button>
                        </form>
                      ) : null}
                    </div>
                  </div>

                  {versionModels.length ? (
                    <div className="catalog-model-list">
                      {versionModels.map((model) => {
                        const modelItems = (items || []).filter(
                          (item) => item.catalog_model_id === model.id
                        );

                        return (
                          <details key={model.id} className="catalog-model-details">
                            <summary>{model.name} ({modelItems.length} elementos)</summary>
                            {modelItems.length ? (
                              <div className="catalog-table-wrap">
                                <table className="catalog-items-table">
                                  <thead><tr><th>Codigo</th><th>Descripcion</th><th>Categoria</th><th>Lado</th></tr></thead>
                                  <tbody>
                                    {modelItems.map((item) => (
                                      <tr key={item.id}>
                                        <td>{item.code}</td>
                                        <td>{item.description}</td>
                                        <td>{item.category_option || '-'}</td>
                                        <td>{item.side_option || '-'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : <p className="catalog-legacy-note">Version anterior sin elementos detallados.</p>}
                          </details>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}

          {!versions?.length ? <p className="auth-intro">Todavia no se ha importado ningun catalogo.</p> : null}
        </div>
      </section>
    </main>
  );
}

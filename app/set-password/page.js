import { setPassword } from './actions';

export default async function SetPasswordPage({ searchParams }) {
  const params = (await searchParams) || {};
  const error = typeof params.error === 'string' ? params.error : '';

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="password-title">
        <p className="eyebrow">PEDIDOS PO</p>
        <h1 id="password-title">Activa tu cuenta</h1>
        <p className="auth-intro">
          Crea una contraseña personal de, al menos, 12 caracteres.
        </p>

        {error ? (
          <p className="form-error" role="alert">{error}</p>
        ) : null}

        <form action={setPassword} className="auth-form">
          <label>
            Nueva contraseña
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength="12"
              required
            />
          </label>

          <label>
            Repite la contraseña
            <input
              name="confirmation"
              type="password"
              autoComplete="new-password"
              minLength="12"
              required
            />
          </label>

          <button type="submit">Activar cuenta</button>
        </form>
      </section>
    </main>
  );
}
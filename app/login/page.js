import { login } from './actions';
import Link from 'next/link';

export default async function LoginPage({ searchParams }) {
  const params = (await searchParams) || {};
  const error = typeof params.error === 'string' ? params.error : '';
  const nextPath = typeof params.next === 'string' ? params.next : '/dashboard';

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <p className="eyebrow">PEDIDOS PO</p>
        <h1 id="login-title">Acceso al sistema</h1>
        <p className="auth-intro">
          Inicia sesión con las credenciales enviadas por administración.
        </p>

        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}

        <form action={login} className="auth-form">
          <input type="hidden" name="next" value={nextPath} />

          <label>
            Correo electrónico
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </label>

          <label>
            Contraseña
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              minLength="12"
              required
            />
          </label>

          <button type="submit">Entrar</button>
        </form>

        <p className="auth-intro">
          <Link href="/forgot-password">He olvidado mi contraseña</Link>
        </p>
      </section>
    </main>
  );
}

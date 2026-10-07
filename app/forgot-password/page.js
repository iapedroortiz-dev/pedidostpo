import Link from 'next/link';
import PasswordResetForm from './password-reset-form';

export const metadata = {
  title: 'Recuperar contraseña | Pedidos PO'
};

export default function ForgotPasswordPage() {
  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="password-reset-title">
        <p className="eyebrow">PEDIDOS PO</p>
        <h1 id="password-reset-title">Recupera tu contraseña</h1>
        <p className="auth-intro">
          Indica tu correo y te enviaremos un enlace para crear una contraseña nueva.
        </p>

        <PasswordResetForm />

        <p className="auth-intro">
          <Link href="/login">Volver al inicio de sesión</Link>
        </p>
      </section>
    </main>
  );
}

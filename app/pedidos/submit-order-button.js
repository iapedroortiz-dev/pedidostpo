'use client';

import { useFormStatus } from 'react-dom';

export default function SubmitOrderButton({ disabled, label = 'Enviar pedido a pedidos' }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="primary-button order-submit-button" disabled={disabled || pending}>
      {pending ? <><span className="button-spinner" aria-hidden="true" />Guardando pedido…</> : label}
    </button>
  );
}

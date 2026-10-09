'use client';

import { useFormStatus } from 'react-dom';

export default function SubmitOrderButton({ disabled }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="primary-button order-submit-button" disabled={disabled || pending}>
      {pending ? <><span className="button-spinner" aria-hidden="true" />Enviando pedido…</> : 'Enviar pedido a pedidos'}
    </button>
  );
}

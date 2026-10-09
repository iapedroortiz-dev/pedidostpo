export default function OrdersLoading() {
  return (
    <main className="orders-page" aria-busy="true" aria-live="polite">
      <div className="orders-loading-card">
        <span className="orders-loading-spinner" aria-hidden="true" />
        <div>
          <p className="eyebrow">PEDIDOS</p>
          <h1>Cargando pedidos…</h1>
          <p>Estamos preparando tu área de trabajo.</p>
        </div>
      </div>
    </main>
  );
}

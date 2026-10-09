function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function configuredRecipients() {
  return String(process.env.ORDER_NOTIFICATION_EMAIL || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function formatOrderDate(value) {
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'long' }).format(new Date(`${value}T12:00:00`));
}

export async function sendNewOrderEmail({ admin, order, customer, fabric, lines, representative }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ORDER_NOTIFICATION_FROM;
  if (!apiKey || !from) {
    return { sent: false, reason: 'Falta configurar RESEND_API_KEY u ORDER_NOTIFICATION_FROM.' };
  }

  const { data: departmentUsers, error: departmentError } = await admin
    .from('profiles')
    .select('email')
    .eq('role', 'pedidos')
    .eq('active', true);
  if (departmentError) throw departmentError;

  const recipients = [...new Set([
    ...configuredRecipients(),
    ...(departmentUsers || []).map((user) => String(user.email || '').trim().toLowerCase()).filter(Boolean)
  ])];
  if (!recipients.length) {
    return { sent: false, reason: 'No hay destinatarios del Departamento de pedidos configurados.' };
  }

  const lineRows = lines.map((line) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #e4e8e5"><strong>${escapeHtml(line.catalog_item_code || line.module_name)}</strong><br><span style="color:#55665b">${escapeHtml(line.module_name)}</span></td>
      <td style="padding:8px;border-bottom:1px solid #e4e8e5">${escapeHtml(line.mechanism || 'Fijo')}${line.side ? ` · ${escapeHtml(line.side)}` : ''}</td>
      <td style="padding:8px;border-bottom:1px solid #e4e8e5;text-align:right"><strong>${line.quantity}</strong></td>
    </tr>`).join('');
  const totalUnits = lines.reduce((total, line) => total + Number(line.quantity || 0), 0);
  const title = `Nuevo pedido #${order.order_number} · ${customer.trade_name}`;
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f3f6f3;color:#203128;font-family:Arial,sans-serif"><main style="max-width:680px;margin:auto;background:#fff;border:1px solid #dfe8e1;border-radius:12px;overflow:hidden"><header style="padding:24px;background:#147747;color:#fff"><p style="margin:0 0 6px;font-size:12px;letter-spacing:1px">NUEVO PEDIDO</p><h1 style="margin:0;font-size:24px">Pedido #${order.order_number}</h1></header><section style="padding:24px"><table style="width:100%;border-collapse:collapse;font-size:14px"><tr><td style="padding:7px 0;color:#617268">Cliente</td><td style="padding:7px 0;text-align:right"><strong>${escapeHtml(customer.client_code)} · ${escapeHtml(customer.trade_name)}</strong></td></tr><tr><td style="padding:7px 0;color:#617268">Fecha solicitada</td><td style="padding:7px 0;text-align:right">${escapeHtml(formatOrderDate(order.order_date))}</td></tr><tr><td style="padding:7px 0;color:#617268">Modelo</td><td style="padding:7px 0;text-align:right">${escapeHtml(order.model_name)}</td></tr><tr><td style="padding:7px 0;color:#617268">Tejido</td><td style="padding:7px 0;text-align:right">${escapeHtml(fabric.code)} · ${escapeHtml(fabric.name)} (${fabric.fabric_type === 'P' ? 'Piel' : 'Tela'})</td></tr><tr><td style="padding:7px 0;color:#617268">Representante</td><td style="padding:7px 0;text-align:right">${escapeHtml(representative.full_name || representative.email || 'No indicado')}</td></tr></table><h2 style="margin:24px 0 8px;font-size:17px">Artículos solicitados</h2><table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr style="text-align:left;color:#617268"><th style="padding:8px">Artículo</th><th style="padding:8px">Tipo</th><th style="padding:8px;text-align:right">Uds.</th></tr></thead><tbody>${lineRows}</tbody></table><p style="margin:20px 0 0;padding:14px;background:#f6faf7;border-left:3px solid #8ec6a0"><strong>Notas</strong><br>${escapeHtml(order.notes || 'Sin notas adicionales.').replace(/\n/g, '<br>')}</p><p style="margin:20px 0 0;text-align:right;font-size:16px">Total: <strong>${totalUnits} unidades</strong></p></section></main></body></html>`;
  const text = `${title}\n\nCliente: ${customer.client_code} · ${customer.trade_name}\nFecha solicitada: ${formatOrderDate(order.order_date)}\nModelo: ${order.model_name}\nTejido: ${fabric.code} · ${fabric.name} (${fabric.fabric_type === 'P' ? 'Piel' : 'Tela'})\nRepresentante: ${representative.full_name || representative.email || 'No indicado'}\n\nArtículos:\n${lines.map((line) => `- ${line.catalog_item_code || line.module_name}: ${line.module_name} · ${line.mechanism || 'Fijo'}${line.side ? ` · ${line.side}` : ''} · ${line.quantity} uds.`).join('\n')}\n\nNotas: ${order.notes || 'Sin notas adicionales.'}\n\nTotal: ${totalUnits} unidades`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: recipients, subject: title, html, text })
  });
  if (!response.ok) throw new Error(`Resend respondió ${response.status}: ${await response.text()}`);

  return { sent: true };
}

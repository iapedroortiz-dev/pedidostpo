const assert = require('node:assert/strict');
const { test } = require('node:test');

test('includes every selected model fabric in the order email', async () => {
  const { sendNewOrderEmail } = await import('../lib/order-notification.js');
  const previous = {
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.ORDER_NOTIFICATION_FROM,
    recipients: process.env.ORDER_NOTIFICATION_EMAIL,
    fetch: global.fetch,
  };
  process.env.RESEND_API_KEY = 'test';
  process.env.ORDER_NOTIFICATION_FROM = 'test@example.com';
  process.env.ORDER_NOTIFICATION_EMAIL = 'orders@example.com';
  let payload;
  global.fetch = async (_url, options) => {
    payload = JSON.parse(options.body);
    return { ok: true };
  };

  try {
    await sendNewOrderEmail({
      admin: { from: () => ({ select: () => ({ eq: () => ({ eq: async () => ({ data: [], error: null }) }) }) }) },
      order: { id: 'order', order_number: 5, order_date: '2026-11-05', model_name: 'A + B' },
      customer: { client_code: 'C', trade_name: 'Buyer' },
      modelFabricAssignments: [
        { model_name: 'A', fabric_code: 'X', fabric_name: 'Blue', fabric_type: 'T' },
        { model_name: 'B', fabric_code: 'Y', fabric_name: 'Red', fabric_type: 'P' },
      ],
      lines: [],
      representative: { full_name: 'Rep' },
    });
    assert.match(payload.text, /A: X · Blue \(Tela\)/);
    assert.match(payload.text, /B: Y · Red \(Piel\)/);
  } finally {
    process.env.RESEND_API_KEY = previous.apiKey;
    process.env.ORDER_NOTIFICATION_FROM = previous.from;
    process.env.ORDER_NOTIFICATION_EMAIL = previous.recipients;
    global.fetch = previous.fetch;
  }
});

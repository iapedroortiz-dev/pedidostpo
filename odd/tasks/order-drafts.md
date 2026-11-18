# Private order drafts
Branch: feat/order-drafts · Delivery: ask-on-risk · Runner: `node --test tests/*.test.cjs` and `npm run build`
Objective: allow representatives to automatically save and resume private, unsubmitted order drafts.

## Specs
S1. "un pedido que se ha empezado a preparar, quede como autoguardado para poder retomarlo mas adelante."
S2. "Pero que no se envie a pedidos, solo que al representante que lo está creando se le quede como pendiente para poder continuar con el más adelante"
S3. "estado privado Borrador, autoguardarlo mientras el representante completa el formulario, mostrarlo solo a ese representante para retomarlo, y recién al pulsar Enviar pedido a pedidos convertirlo en pendiente y notificar a Pedidos"
S4. "los adjuntos que tengan que volver a subirlos"
S5. "si empiezo un pedido y me voy por ejemplo al panel, el pedido que estaba creando no se guarda como borrador, o al menos no se donde verlo"

## Tasks
- T1 · S1-S3 · inline · completed · Add private draft persistence and RLS, preserving draft ownership and separating drafts from orders. Commit: 747b062.
- T2 · S1-S3,S5 · inline · completed · Flush the current draft when leaving the form, keep debounced autosave, and make its resume location clear. Commit: 1e97c3b.
- T3 · S2-S4 · inline · completed · List and resume a representative's drafts; submit as a pending order without sending draft notifications or persisting draft attachments. Commit: 747b062.
- T4 · S1-S4 · inline · completed · Add public-interface regression coverage and verify the draft flow. Commit: 747b062.

## Log
L1. User request: "Ok, se puede hacer que un pedido que se ha empezado a preparar, quede como autoguardado para poder retomarlo mas adelante. Pero que no se envie a pedidos, solo que al representante que lo está creando se le quede como pendiente para poder continuar con el más adelante"
L2. User decision: "Si, eso es" for private `Borrador` drafts that only become `pendiente` and notify Pedidos on explicit submission.
L3. User decision: "No, los adjuntos que tengan que volver a subirlos"; draft persistence excludes file attachments.
L4. Route: inline. No writer trigger applies; this feature is tracked because draft persistence, authorization, and form-resume behavior require multi-step verification.
L5. Verification: `node --test tests/*.test.cjs` passed 52/52; `npm run build` passed; `git diff --check` passed. Independent verifier initially found an immediate-submit race and a missing active-role requirement on draft SELECT; both received focused regression coverage and the verifier recheck passed structurally.
L6. Live Supabase proof remains unavailable because migration `supabase/migrations/20261118110000_add_private_order_drafts.sql` has not been applied locally. RLS, real autosave, conversion, deletion, notifications, and attachment handling need representative-flow validation after applying it.
L7. Risk: item 1 (new persistent draft data and draft-to-order conversion); item 2 (representative-only access via RLS and server authorization).
L8. Delivery decision: feature-branch-chain. No PR, push, or merge is authorized.
L9. User correction: "No, si empiezo un pedido y me voy por ejemplo al panel, el pedido que estaba creando no se guarda como borrador, o al menos no se donde verlo"
L10. Verification: focused tests passed 11/11; full suite passed 55/55; `npm run build` and `git diff --check` passed. Independent verification found that unmount could recreate a submitted draft; submission now clears the pending flush reference, and the limited recheck passed. A rejected submission still discards unsaved latest edits, but that behavior predates this correction.

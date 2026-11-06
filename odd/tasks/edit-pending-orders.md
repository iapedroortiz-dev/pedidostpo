# Edit pending orders
Branch: feat/edit-pending-orders · Delivery: local changes only · Runner: `node --test tests/*.test.cjs`

## Specs
S1. "un usuario con rol representante pueda editar pedidos que todavía no estén gestionados"
S2. "Todos"

## Tasks
- T1 · S1-S2 · inline · done · Commit `b088901`; add server and database authorization for representatives to update only their pending orders; RED/GREEN: `tests/pending-order-edit-policy.test.cjs`.
- T2 · S1-S2 · inline · done · Commit `b088901`; add an edit flow for every order field, including lines, model fabrics, notes, and attachments; RED/GREEN: `tests/pending-order-edit-policy.test.cjs`.
- T3 · S1-S2 · inline · done · Commit `b088901`; render the representative edit entry point and verify pending versus managed access; RED/GREEN: `tests/pending-order-edit-policy.test.cjs`.

## Log
L1. User request: "Ok, es muy importante que un usuario con rol representante pueda editar pedidos que todavía no estén gestionados"
L2. User decision: "Todos"
L3. User decision: existing attachments are preserved and a newly uploaded attachment is added.
L4. Verification: focused checks and `npm run build` pass. Full `node --test tests/*.test.cjs` remains blocked by the pre-existing `react@19.3.1` / `react-dom@19.2.8` mismatch in `tests/help.test.cjs` and `tests/new-order-form.test.cjs`.
L5. Independent verification passed after the order update was scoped to the requested ID and edits were bound to the order's original catalog version. Live Supabase transaction proof is unavailable locally.

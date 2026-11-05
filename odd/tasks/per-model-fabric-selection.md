# Per-model fabric selection
Branch: feat/per-model-fabric-selection · Delivery: local changes only · Runner: `node --test tests/*.test.cjs`

## Specs
S1. "Qu ecada modelo se pueda seleccionar un tejido diferente"

## Tasks
- T1 · S1 · inline · done · Commit `2fe2393`; add persisted per-model fabric assignments and migration; RED/GREEN: `tests/order-model-fabrics.test.cjs`, `tests/order-model-fabric-policy.test.cjs`.
- T2 · S1 · inline · done · Commit `2fe2393`; let the order form select a fabric for each model and submit assignments; RED/GREEN: `tests/order-model-fabrics.test.cjs`.
- T3 · S1 · inline · done · Commit `2fe2393`; render each model's selected fabric in order details and verify the flow; RED/GREEN: `tests/order-model-fabric-email.test.cjs`.

## Log
L1. User request: "Qu ecada modelo se pueda seleccionar un tejido diferente"
L2. Implemented an `order_model_fabrics` snapshot table with catalog-cleanup-safe foreign keys and RLS checks bound to the order, catalog model, line items, and fabric snapshot.
L3. Verification: focused tests pass; `npm run build` passes. Full `node --test tests/*.test.cjs` remains blocked by the existing `react@19.3.1` / `react-dom@19.2.8` version mismatch in `tests/help.test.cjs` and `tests/new-order-form.test.cjs`.
L4. Independent verification passed after correcting notification rendering and RLS snapshot validation. Live database RLS execution remains unavailable locally.

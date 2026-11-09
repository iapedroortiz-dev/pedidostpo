# Dependency security upgrade
Branch: feat/dependency-security-upgrade · Delivery: local changes only · Runner: `npm run build`

## Specs
S1. "resolver esas vulnerabilidades"

## Tasks
- T1 · S1 · inline · done · Commit `9d067fc`; pin Next.js 16.4.5 with React and React DOM 19.3.1; upgrade vulnerable PostCSS and Sharp overrides.
- T2 · S1 · inline · done · Commit `9d067fc`; verify the audit result, build, and test suite; independent online-audit proof is unavailable to the verifier sandbox and the user accepted the recorded online audit evidence.

## Log
L1. User request: "ok, pero deberíamos resolver esas vulnerabilidades no?"
L2. Audit observed 1 critical, 3 high, and 1 moderate vulnerable package paths, led by Next.js advisories.
L3. Verified Next.js guidance: update Next.js with React and React DOM together; Next.js 16 requires Node.js 20.9 or newer.
L4. Security upgrade resolved all audit findings: `node --test tests/*.test.cjs` passed 41/41, `npm run build` passed with Next.js 16.4.5, and `npm audit --json` reports zero vulnerabilities.
L5. Updated `tests/new-order-form.test.cjs` from the obsolete `catalogFabricId` field to `modelFabricAssignments`, matching the per-model fabric request contract.
L6. Parent checks after `npm ci` verified installed Next 16.4.5, React/React DOM 19.3.1, PostCSS 8.5.32, and Sharp 0.35.5; an online `npm audit --json` reported zero vulnerabilities. The independent verifier could validate the installed versions but its sandbox forbids online audit access, so it cannot independently confirm the audit result.
L7. User decision: "Commit with recorded proof".
L8. Native review mode is disabled for this clone. Assessment reported high risk due the dependency-environment change, but no receipt-driven review was started.
L9. Engram task mirror is pending because the memory server did not resolve the active workspace path correctly.

# NOA: AFTER BELL

Mobile-first psychological horror game. Primary target: iPhone Safari / PWA.

## Architecture

- `src/game` — world truth and serializable GameState
- `src/world` — Babylon.js six-floor school geometry and safe interaction points
- `src/noa` — NOA client, protocol, local fallback, UI
- `src/faker` — imitation state and actor routing
- `src/director` — horror pacing and AI event validation
- `src/puzzles` — deterministic puzzle logic
- `src/memory` — bounded conversation memory and optional server persistence
- `api` — server-only LLM and memory endpoints

## Rules

- GameState is the source of world truth.
- LLM output must never mutate GameState directly.
- Every AI event passes through EventValidator before execution.
- NOA and FAKER may interpret truth; neither owns truth.
- FAKER must always have at least one detectable clue in presentation or context.
- Real NOA may be uncertain or wrong when knowledge/memory integrity is degraded.
- Mobile performance is P0; render only the active floor where practical.
- Never expose OPENAI_API_KEY or Supabase secret keys in client code.
- In-game AI gets no shell, filesystem, arbitrary URL, or arbitrary spawn access.
- API failure must degrade to the deterministic local NOA runtime.
- Keep AI/event commands allow-listed and schema validated.
- Visual polish changes should not bypass architecture boundaries.

# NOA: AFTER BELL

Mobile-first psychological horror game set in a six-floor Japanese integrated middle/high school.

## v0.4 — SURVIVAL SYSTEMS

The vertical slice now connects trust to stealth, evidence, storage pressure, and deterministic escape routes.

- Six-floor 3D school with floor-specific rooms and mobile floor culling
- NOA read-only GameState context
- FAKER imitation router with rotating tells
- Strict NOA response protocol + allow-listed EventValidator
- HorrorDirector tension model independent from the LLM
- In-phone free-text NOA chat with latency/signal presentation
- Deterministic local NOA fallback when `/api/noa` is unavailable
- Server-only OpenAI Responses API integration via `OPENAI_API_KEY`
- Signal-driven threat state machine: light, movement, sprinting, and notifications affect detection
- Danger Quick Ask, normal short chat, and a safe free-chat zone in the 5F study booths
- IndexedDB camera album with a simulated 150 MB quota and non-destructive mutation overlays
- Deterministic evidence metadata, three-trip mat route, NO SIGNAL mode, and six ending definitions
- Four-floor clue puzzle → 6F maintenance terminal → expanded ending routes
- Authentication phrase that becomes unreliable later
- Optional Supabase session memory endpoint/schema
- PWA manifest + service worker

## Puzzle loop

1. Explore 2F library, 3F science lab, 4F math room, and 5F broadcast room.
2. Collect four digits in floor order.
3. Enter the code at the 6F maintenance terminal.
4. Return to the 1F gym and choose between EXIT A and EXIT B while NOA / FAKER messaging diverges.

Evidence photos near marked clues contribute to the true-ending state. The blue mats in the 1F gym store can be carried to the courtyard in three trips; this deliberately obstructs the view and disables sprinting/chat. Its 6F resolution is an abstract, explicitly fictional game sequence, not a real-world safety simulation.

## Commands

- `npm test` — bundles and runs deterministic v0.4 logic checks.
- `npm run typecheck` — strict TypeScript check.
- `npm run build` — typecheck plus the production Vite/PWA build.

## Environment variables

- `OPENAI_API_KEY` — server-only. If missing, the game uses the local deterministic NOA runtime.
- `OPENAI_MODEL` — optional, defaults to `gpt-6-luna`.
- `SUPABASE_URL` — optional memory persistence.
- `SUPABASE_SECRET_KEY` — optional server-only Supabase secret key. Legacy `SUPABASE_SERVICE_ROLE_KEY` is accepted as a fallback.

Never expose server secrets through Vite `VITE_*` variables.

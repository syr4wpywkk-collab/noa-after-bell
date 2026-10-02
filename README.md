# NOA: AFTER BELL

Mobile-first psychological horror game set in a six-floor Japanese integrated middle/high school.

## v0.3 — TRUST / FAKER

The game now treats trust as a gameplay system rather than a chat feature.

- Six-floor 3D school with floor-specific rooms and mobile floor culling
- NOA read-only GameState context
- FAKER imitation router with rotating tells
- Strict NOA response protocol + allow-listed EventValidator
- HorrorDirector tension model independent from the LLM
- In-phone free-text NOA chat with latency/signal presentation
- Deterministic local NOA fallback when `/api/noa` is unavailable
- Server-only OpenAI Responses API integration via `OPENAI_API_KEY`
- Four-floor clue puzzle → 6F maintenance terminal → two EXIT endings
- Authentication phrase that becomes unreliable later
- Optional Supabase session memory endpoint/schema
- PWA manifest + service worker

## Puzzle loop

1. Explore 2F library, 3F science lab, 4F math room, and 5F broadcast room.
2. Collect four digits in floor order.
3. Enter the code at the 6F maintenance terminal.
4. Return to the 1F gym and choose between EXIT A and EXIT B while NOA / FAKER messaging diverges.

## Environment variables

- `OPENAI_API_KEY` — server-only. If missing, the game uses the local deterministic NOA runtime.
- `OPENAI_MODEL` — optional, defaults to `gpt-6-luna`.
- `SUPABASE_URL` — optional memory persistence.
- `SUPABASE_SECRET_KEY` — optional server-only Supabase secret key. Legacy `SUPABASE_SERVICE_ROLE_KEY` is accepted as a fallback.

Never expose server secrets through Vite `VITE_*` variables.

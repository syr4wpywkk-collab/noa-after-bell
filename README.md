# NOA: AFTER BELL

Mobile-first psychological horror game set in a six-floor Japanese integrated middle/high school.

## v0.6 — FIRST FLOOR SCHOOL REBUILD

The visual benchmark is now a dense, walkable first floor that reads as a Japanese school before the rest of the six-floor campus receives the same treatment.

- v0.6 first floor: six classrooms, separate toilets, student entrance/shoe lockers, staff room, principal office, infirmary, career guidance, counseling, meeting, office, print and broadcast rooms
- Starts inside 1-6; gameplay collision and room zoning match the rebuilt 92m first-floor plan
- Blender LIGHT_F1_* markers create distance-culled Babylon runtime lights; the flashlight and FAKER flicker affect the real PBR-lit scene
- Upper floors remain lightweight placeholders pending the same visual pass
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

## Blender asset pipeline

The visual-asset pipeline runs Blender headlessly in GitHub Actions. It currently generates a procedural six-floor school shell as both `school_shell.glb` and `school_shell.blend`, re-imports the GLB in a clean Blender process for validation, writes checksums/metadata, and uploads the results as a workflow artifact.

- Generator: `tools/blender/build_school.py`
- Validation: `tools/blender/validate_glb.py`
- Workflow: `.github/workflows/blender-assets.yml`
- Trigger: manual dispatch, relevant pull requests, and relevant pushes to `main`
- Runtime: validated `school_shell.glb` is committed into `public/assets/generated/` by CI for same-repository PRs, then loaded by Babylon.js as the visual layer.
- Fallback: legacy Babylon geometry remains available invisibly for collision and becomes visible automatically if the GLB cannot load.
- Mobile: Blender meshes are merged by material per floor and adjacent floors render only while traversing a stairwell.
- Current generated runtime asset: ~1.9 MB GLB, 58 mesh objects, 10 exported materials, six validated floor roots.

## Commands

- `npm test` — bundles and runs deterministic v0.6 logic checks.
- `npm run typecheck` — strict TypeScript check.
- `npm run build` — typecheck plus the production Vite/PWA build.

## Environment variables

- `OPENAI_API_KEY` — server-only. If missing, the game uses the local deterministic NOA runtime.
- `OPENAI_MODEL` — optional, defaults to `gpt-6-luna`.
- `SUPABASE_URL` — optional memory persistence.
- `SUPABASE_SECRET_KEY` — optional server-only Supabase secret key. Legacy `SUPABASE_SERVICE_ROLE_KEY` is accepted as a fallback.

Never expose server secrets through Vite `VITE_*` variables.

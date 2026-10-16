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
- Babylon runtime validation: `tools/blender/validate_babylon.mjs` loads the generated GLB through Babylon NullEngine and verifies the 1-6 marker/world bounds before assets can publish.
- Workflow: `.github/workflows/blender-assets.yml`
- Trigger: manual dispatch, relevant pull requests, and relevant pushes to `main`
- Runtime: validated `school_shell.glb` is committed into `public/assets/generated/` by CI for same-repository PRs, then loaded by Babylon.js as the visual layer.
- Fallback: legacy Babylon geometry remains available invisibly for collision and becomes visible automatically if the GLB cannot load.
- Mobile: Blender meshes are merged by material per floor and adjacent floors render only while traversing a stairwell.
- Current v0.6 generated asset: ~4.17 MB GLB, 61 merged mesh objects, 34 materials, 42 first-floor runtime light markers, six validated floor roots.

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

## Cinematic 3D / Desktop audio pass (October 2026)

- The two night-school concept frames are *visual references*, not depth maps. A single 2D image cannot reconstruct occluded 3D geometry. `CinematicDressing` builds actual meshes and readable texture signage around the existing first-floor 1-6 spawn room and adjacent corridor. Existing 6F geometry and story state stay authoritative.
- Procedural Web Audio: fluorescent hum, wind/air noise, footsteps, chimes, radio static and event sounds. The browser's Japanese speech synthesis supplies the optional opening school announcement; available voices differ by browser/OS, and captions/gameplay remain usable without speech synthesis.
- Desktop: click game canvas to lock mouse; WASD/arrow keys move, Shift runs, E interacts, F toggles flashlight, Tab opens NOA, C takes a photo, Q opens album, M mutes; Esc releases the mouse and closes the phone. Focus in a text box disables movement/game hotkeys.
- Mobile touch controls remain available, with desktop key hints hidden on touch-first browsers.
- New geometry and audio are code-generated and do not depend on third-party sound/CDN/LLM keys.
- Note: the current story spawn remains **1年6組**, consistent with the existing Blender/collision layout; a true **2年4組** re-map and high-resolution photo-sourced PBR texture authoring are separate modeling tasks.

### Verification

`npm test && npm run typecheck && npm run build`.


## v0.7 High-resolution PBR material pass

- Six reference-inspired procedural school surfaces: aged ivory plaster, green vinyl/tile floor, scuffed desk wood, dusty chalkboard, ceiling plaster, dark metal.
- Each material includes albedo (color), tangent-space normal, and packed occlusion/roughness/metallic maps in local WebP files.
- 2048×2048 desktop textures on capable hardware; 1024×1024 for touch devices. Ceiling and metal deliberately use 1K even on desktop to save VRAM.
- Existing Blender 3D GLB retains its geometry/collision/room layout. Blender generator now creates meter-projected, repeating UVs **before** per-material merge, avoiding a single texture being stretched across a 92-meter corridor.
- Runtime material hook: `src/world/HighResTextures.ts`; deterministic texture synthesis: `tools/textures/generate_textures.py`.
- Rebuilding or editing procedural texture assets requires no third-party image service, license, network fetch, or secret key. The high-resolution maps are art-directed from the classroom/corridor concepts and do not imply the 2D pictures were reconstructed into full 3D.
- Blender Asset Pipeline now generates and validates all 36 maps, regenerates the GLB and publishes runtime files to the PR branch.
- Runtime material fallback retains old flat colors if a texture cannot load. Use in-game screenshots and real-device profiling to verify GPU memory and image quality after merge.

To regenerate locally: `python3 tools/textures/generate_textures.py --output-dir public/assets/textures`.

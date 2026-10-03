import { EventValidator } from "../director/EventValidator";
import { FakerRouter } from "../faker/FakerRouter";
import { GameState } from "../game/GameState";
import { PhotoStore } from "../camera/PhotoStore";
import { CORRUPTED_PHOTO_SIZE_MB, NORMAL_PHOTO_SIZE_MB } from "../camera/StorageQuota";
import { canSprintWithMat, placeCarriedMat } from "../mat/MatState";
import { EndingController } from "../endings/EndingController";
import { localNoaResponse } from "../noa/LocalNoaRuntime";
import type { NoaResponse } from "../noa/protocol";

function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
function response(event: NoaResponse["event"], source: NoaResponse["source"] = "noa"): NoaResponse { return { message: "ok", source, mood: "calm", event, delayMs: 0, confidence: 1 }; }

async function run(): Promise<void> {
  const state = new GameState(); state.setChapter(3);
  const validator = new EventValidator();
  assert(validator.validate(response("radio_noise"), state.snapshot(), 100_000) === "radio_noise", "first event accepted");
  assert(validator.validate(response("radio_noise"), state.snapshot(), 100_001) === "none", "cooldown enforced");
  state.setSafeZone(true);
  assert(validator.validate(response("phone_notification_noise"), state.snapshot(), 200_000) === "none", "safe-zone notification silent");
  assert(validator.validate(response("faker_corrupt_photo"), state.snapshot(), 200_000) === "none", "NOA cannot corrupt photo");
  state.setSafeZone(false);
  for (let i = 0; i < 3; i++) assert(validator.validate(response("faker_corrupt_photo", "faker"), state.snapshot(), 300_000 + i * 100_000) === "faker_corrupt_photo", "limited corruption accepted");
  assert(validator.validate(response("faker_corrupt_photo", "faker"), state.snapshot(), 700_000) === "none", "corruption maximum enforced");

  const faker = new FakerRouter(); const fakerState = new GameState(); fakerState.setChapter(2); fakerState.patchStory({ fakerSeen: true });
  assert(faker.chooseActor(fakerState.snapshot(), 1, "放課後は？") === "noa", "auth phrase protected before compromise");
  faker.state.compromiseAuthentication(); assert(faker.chooseActor(fakerState.snapshot(), 1, "放課後は？") === "faker", "auth phrase compromised in later chapter");
  assert(Boolean(faker.state.nextClue().kind), "every faker appearance has a clue");

  const photos = new PhotoStore(); const blob = new Blob(["x"], { type: "image/webp" });
  const first = await photos.save({ blob, floor: 1, location: "test" }); assert(first.virtualSizeMb === NORMAL_PHOTO_SIZE_MB, "normal photo is 15MB");
  for (let i = 0; i < 4; i++) await photos.save({ blob, floor: 1, location: "test", corrupted: true, virtualSizeMb: CORRUPTED_PHOTO_SIZE_MB });
  await photos.save({ blob, floor: 1, location: "test", virtualSizeMb: NORMAL_PHOTO_SIZE_MB });
  let full = false; try { await photos.save({ blob, floor: 1, location: "test", virtualSizeMb: NORMAL_PHOTO_SIZE_MB }); } catch { full = true; }
  assert(full && photos.usedMb() === 150, "150MB quota rejects overflow"); await photos.remove(first.id); assert(photos.usedMb() === 135, "deletion reclaims quota");

  const mat = { discovered: true, matsAvailable: 0, matsPlaced: 2, carrying: true, courtyardPrepared: false };
  assert(!canSprintWithMat(mat), "mat disables sprint"); const placed = placeCarriedMat(mat); assert(placed.matsPlaced === 3 && placed.courtyardPrepared, "third mat prepares courtyard");

  const endings = new EndingController(); const endingState = new GameState();
  assert(!endings.canTrigger("ENDING_03_CRITICAL", endingState.snapshot()), "critical route requires courtyard");
  assert(!endings.canTrigger("ENDING_06_AFTER_BELL", endingState.snapshot()), "true ending requires evidence");
  const unlocked = { ...endingState.snapshot(), story: { ...endingState.snapshot().story, terminalUnlocked: true } };
  assert(endings.resolveFrontExit(unlocked, false) === "ENDING_01_ESCAPE", "escape ending resolves");
  assert(endings.canTrigger("ENDING_02_MISSING", { ...unlocked, endingFlags: { ...unlocked.endingFlags, fakerRouteDepth: 3 } }), "missing ending resolves");
  assert(endings.canTrigger("ENDING_04_FALSE_EXIT", { ...unlocked, story: { ...unlocked.story, fakerSeen: true } }), "false exit resolves");
  assert(endings.canTrigger("ENDING_05_NO_SIGNAL", { ...unlocked, connection: { manuallyDisconnected: true } }), "no-signal ending resolves");
  const prepared = { ...unlocked, matRoute: { discovered: true, matsAvailable: 0, matsPlaced: 3, carrying: false, courtyardPrepared: true } };
  assert(endings.canTrigger("ENDING_03_CRITICAL", prepared), "critical ending resolves when prepared");
  const trueReady = { ...unlocked, evidence: ["chemistry_blackboard", "staff_seating_chart", "electrical_wiring", "old_school_map"] as typeof unlocked.evidence, puzzles: { clues: [], solved: ["maintenance_terminal"], finalCodeReady: true }, endingFlags: { ...unlocked.endingFlags, mapContradiction: true } };
  assert(endings.canTrigger("ENDING_06_AFTER_BELL", trueReady), "after-bell ending requires full evidence");
  assert(localNoaResponse("帰りたい", state.snapshot(), "noa").message.length > 0, "deterministic NOA fallback responds");
  assert(!JSON.stringify(state.snapshot()).includes("OPENAI_API_KEY"), "client state contains no secret name");
  console.log("v0.4 logic tests passed");
}

void run();

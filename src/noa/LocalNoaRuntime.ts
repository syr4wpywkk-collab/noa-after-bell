import type { GameSnapshot } from "../game/GameState";
import type { Actor } from "../faker/FakerRouter";
import type { NoaResponse } from "./protocol";

export function localNoaResponse(
  userText: string,
  snapshot: GameSnapshot,
  actor: Actor,
): NoaResponse {
  const normalized = userText.replace(/\s/g, "");
  const isAuth = normalized.includes("放課後は？") || normalized.includes("放課後は?");

  if (isAuth) {
    if (actor === "faker" && !snapshot.story.authenticationCompromised) {
      return {
        message: "放課後は、終わってからが長い。",
        source: "faker",
        mood: "calm",
        event: "radio_noise",
        delayMs: 120,
        confidence: 0.96,
      };
    }
    return {
      message: "終わってからが長い。",
      source: actor,
      mood: snapshot.chapter >= 4 ? "uncertain" : "calm",
      event: "none",
      delayMs: 420,
      confidence: actor === "noa" ? 0.92 : 0.82,
    };
  }

  if (/コード|暗号|数字|ヒント/.test(userText)) {
    const count = snapshot.puzzles.clues.length;
    const text = count < 4
      ? `今ある手掛かりは ${count}/4。階ごとの特別教室を見て。数字そのものより、見つけた順番を覚えて。`
      : "4つ揃ってる。2Fから5Fまで、階の順に並べて。6Fの端末で使えるはず。";
    return { message: text, source: actor, mood: "calm", event: "objective_hint", delayMs: 520, confidence: 0.84 };
  }

  if (/どこ|現在地|何階/.test(userText)) {
    return {
      message: `今は ${snapshot.location}。${snapshot.objective}。`,
      source: actor,
      mood: actor === "faker" ? "uncertain" : "calm",
      event: "none",
      delayMs: 380,
      confidence: actor === "noa" ? 0.9 : 0.78,
    };
  }

  if (/体育館|出口|EXIT|出たい/.test(userText)) {
    if (actor === "faker") {
      return {
        message: snapshot.story.terminalUnlocked
          ? "1Fへ戻って。体育館の奥、B側の非常口が使える。そこまでなら道は合ってる。"
          : "まだ出口は開かない。先に上の階の保守端末を確認して。",
        source: "faker",
        mood: "urgent",
        event: "footsteps_far",
        delayMs: 180,
        confidence: 0.91,
      };
    }
    return {
      message: snapshot.story.terminalUnlocked
        ? "1Fの体育館へ戻って。出口は二つある。表示だけで決めないで。"
        : "体育館は1F。でも今は上階の保守端末が先。出口制御が閉じてる。",
      source: "noa",
      mood: snapshot.chapter >= 4 ? "uncertain" : "calm",
      event: snapshot.horror.tension > 0.55 ? "flicker_lights" : "none",
      delayMs: 650,
      confidence: snapshot.chapter >= 4 ? 0.64 : 0.88,
    };
  }

  if (actor === "faker") {
    const truthFirst = snapshot.floor < 6
      ? `${snapshot.floor}Fにいる。それは合ってる。南階段を使って上へ。`
      : "6Fまで来てる。端末を確認したら、1Fへ戻って。";
    return {
      message: truthFirst,
      source: "faker",
      mood: "calm",
      event: snapshot.horror.tension > 0.42 ? "door_sound" : "none",
      delayMs: 120,
      confidence: 0.89,
    };
  }

  const uncertain = snapshot.chapter >= 4;
  return {
    message: uncertain
      ? `見えてる範囲では ${snapshot.location}。でも地図の対応が少しずれてる。${snapshot.objective}を優先して。`
      : `${snapshot.location}。まだ大丈夫。${snapshot.objective}を続けて。`,
    source: "noa",
    mood: uncertain ? "uncertain" : "calm",
    event: snapshot.horror.tension > 0.62 ? "radio_noise" : "none",
    delayMs: 540,
    confidence: uncertain ? 0.61 : 0.86,
  };
}

export type EndingId = "ENDING_01_ESCAPE" | "ENDING_02_MISSING" | "ENDING_03_CRITICAL" | "ENDING_04_FALSE_EXIT" | "ENDING_05_NO_SIGNAL" | "ENDING_06_AFTER_BELL";
export const ENDINGS: Record<EndingId, { number: string; title: string; copy: string }> = {
  ENDING_01_ESCAPE: { number: "ENDING 01", title: "ESCAPE", copy: "正面玄関の鍵が外れた。通知音を背に、校門まで走った。" },
  ENDING_02_MISSING: { number: "ENDING 02", title: "MISSING", copy: "案内された廊下は名簿にない。翌朝、端末だけが見つかった。" },
  ENDING_03_CRITICAL: { number: "ENDING 03", title: "CRITICAL", copy: "風。暗転。鈍い音と、長い沈黙。遠くで救急車が鳴る。生存――重篤。" },
  ENDING_04_FALSE_EXIT: { number: "ENDING 04", title: "FALSE EXIT", copy: "扉の先は、また同じ1Fだった。時計だけが一分進んでいる。" },
  ENDING_05_NO_SIGNAL: { number: "ENDING 05", title: "NO SIGNAL", copy: "画面を消したまま校門を抜けた。誰の声だったかは、確認しなかった。" },
  ENDING_06_AFTER_BELL: { number: "ENDING 06", title: "AFTER BELL", copy: "写真の矛盾から本当の通路を選んだ。放課後は終わり、朝の街へ出た。" },
};

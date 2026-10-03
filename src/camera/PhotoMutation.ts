export type PhotoMutation = { kind: "figure" | "clock" | "door"; level: number; seed: number };

export function mutationForProgress(photoId: string, chapter: number, corrupted: boolean): PhotoMutation[] {
  if (!corrupted && chapter < 3) return [];
  let seed = 0;
  for (const char of photoId) seed = (seed * 31 + char.charCodeAt(0)) >>> 0;
  const kinds: PhotoMutation["kind"][] = ["figure", "clock", "door"];
  return [{ kind: kinds[seed % kinds.length], level: Math.min(3, corrupted ? 2 : chapter - 2), seed }];
}

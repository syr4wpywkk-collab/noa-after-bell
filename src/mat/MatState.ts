export const REQUIRED_MATS = 3;
export type MatRouteState = { discovered: boolean; matsAvailable: number; matsPlaced: number; carrying: boolean; courtyardPrepared: boolean };
export function canSprintWithMat(state: MatRouteState): boolean { return !state.carrying; }
export function placeCarriedMat(state: MatRouteState): MatRouteState {
  if (!state.carrying) return state;
  const matsPlaced = state.matsPlaced + 1;
  return { ...state, carrying: false, matsPlaced, courtyardPrepared: matsPlaced >= REQUIRED_MATS };
}

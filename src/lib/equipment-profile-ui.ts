import type {
  EquipmentProfile,
  EquipmentResolveResult,
  TrainingLaterality,
  TrainingSetSide,
  TrainingWeightBasis,
} from "./types";

type Identified = { id: string };

export function appendById<T extends Identified>(items: T[], item: T) {
  return [...items.filter((current) => current.id !== item.id), item];
}

export function replaceById<T extends Identified>(items: T[], item: T) {
  return items.map((current) => (current.id === item.id ? item : current));
}

export function removeById<T extends Identified>(items: T[], id: string) {
  return items.filter((current) => current.id !== id);
}

export function createAsyncActionLock() {
  let active = false;

  return {
    get active() {
      return active;
    },
    async run<T>(action: () => Promise<T>) {
      if (active) return { started: false as const };

      active = true;
      try {
        return { started: true as const, value: await action() };
      } finally {
        active = false;
      }
    },
  };
}

export type EquipmentResolverState = {
  status: "idle" | "none" | "single" | "ambiguous";
  candidates: EquipmentProfile[];
  selectedEquipmentProfileId: string | null;
};

export const idleEquipmentResolverState: EquipmentResolverState = {
  status: "idle",
  candidates: [],
  selectedEquipmentProfileId: null,
};

export function buildEquipmentResolverState(
  result: EquipmentResolveResult,
): EquipmentResolverState {
  const candidates = [...result.candidates];
  const status =
    candidates.length === 0
      ? "none"
      : result.ambiguous || candidates.length > 1
        ? "ambiguous"
        : "single";

  return { status, candidates, selectedEquipmentProfileId: null };
}

export function confirmEquipmentResolverCandidate(
  state: EquipmentResolverState,
  equipmentProfileId: string,
): EquipmentResolverState {
  if (!state.candidates.some((candidate) => candidate.id === equipmentProfileId)) {
    return state;
  }

  return { ...state, selectedEquipmentProfileId: equipmentProfileId };
}

type EquipmentDraftDefaults = {
  equipmentProfileId: string;
  movementName: string;
  equipmentBrand: string;
  equipmentName: string;
  equipmentModel: string;
  laterality: TrainingLaterality;
  side: TrainingSetSide;
  weightBasis: TrainingWeightBasis;
};

export function applyEquipmentProfileDefaults<T extends EquipmentDraftDefaults>(
  draft: T,
  profile: EquipmentProfile,
): T {
  const laterality = profile.defaultLaterality || draft.laterality;

  return {
    ...draft,
    equipmentProfileId: profile.id,
    movementName: profile.defaultMovementName || draft.movementName,
    equipmentBrand: profile.brand || "",
    equipmentName: profile.canonicalName,
    equipmentModel: profile.model || "",
    laterality,
    side:
      laterality === "bilateral"
        ? "both"
        : draft.side === "both"
          ? "alternating"
          : draft.side,
    weightBasis: profile.defaultWeightBasis || draft.weightBasis,
  };
}

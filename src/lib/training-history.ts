import type { z } from "zod";

import {
  listTrainingSessions,
  mapTrainingLogRow,
  mapTrainingSetRow,
  TrainingStorageError,
  type TrainingStore,
} from "@/lib/training";
import type {
  TrainingEquipmentSignature,
  TrainingLastPerformance,
  TrainingLog,
  TrainingSet,
  TrainingSetCopyDraft,
} from "@/lib/types";
import type {
  trainingHistoryRecentQuerySchema,
  trainingLastPerformanceQuerySchema,
} from "@/lib/validation";

export type TrainingHistoryRecentQueryInput = z.infer<
  typeof trainingHistoryRecentQuerySchema
>;
export type TrainingLastPerformanceQueryInput = z.infer<
  typeof trainingLastPerformanceQuerySchema
>;

const lastPerformanceSessionLimit = 100;

function nullableTrimmed(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function sortTrainingLogs(logs: TrainingLog[]) {
  return [...logs].sort((left, right) => {
    if (left.startedAt !== right.startedAt) {
      if (!left.startedAt) return 1;
      if (!right.startedAt) return -1;
      return right.startedAt.localeCompare(left.startedAt);
    }

    const trainedOnDelta = right.trainedOn.localeCompare(left.trainedOn);
    if (trainedOnDelta !== 0) return trainedOnDelta;

    return right.createdAt.localeCompare(left.createdAt);
  });
}

function sortSets(sets: TrainingSet[]) {
  return [...sets].sort(
    (left, right) =>
      left.exerciseOrder - right.exerciseOrder ||
      left.setNumber - right.setNumber ||
      left.createdAt.localeCompare(right.createdAt),
  );
}

function signatureFromQuery(
  query: TrainingLastPerformanceQueryInput,
): TrainingEquipmentSignature {
  return {
    gymName: nullableTrimmed(query.gymName),
    movementName: query.movementName.trim(),
    equipmentBrand: nullableTrimmed(query.equipmentBrand),
    equipmentName: nullableTrimmed(query.equipmentName),
    equipmentModel: nullableTrimmed(query.equipmentModel),
    laterality: query.laterality,
    weightBasis: query.weightBasis,
  };
}

function setMatchesSignature(
  set: TrainingSet,
  log: TrainingLog,
  signature: TrainingEquipmentSignature,
) {
  return (
    nullableTrimmed(log.gymName) === signature.gymName &&
    set.movementName.trim() === signature.movementName &&
    nullableTrimmed(set.equipmentBrand) === signature.equipmentBrand &&
    nullableTrimmed(set.equipmentName) === signature.equipmentName &&
    nullableTrimmed(set.equipmentModel) === signature.equipmentModel &&
    set.laterality === signature.laterality &&
    set.weightBasis === signature.weightBasis
  );
}

function selectLastWorkingSet(sets: TrainingSet[]) {
  return [...sets].reverse().find((set) => set.setType === "working") ?? null;
}

function selectBestWorkingSet(sets: TrainingSet[]) {
  const workingSets = sets.filter((set) => set.setType === "working");

  return (
    workingSets.sort((left, right) => {
      const weightDelta = (right.weightKg ?? -1) - (left.weightKg ?? -1);
      if (weightDelta !== 0) return weightDelta;
      const repsDelta = (right.reps ?? -1) - (left.reps ?? -1);
      if (repsDelta !== 0) return repsDelta;
      return (
        left.exerciseOrder - right.exerciseOrder ||
        left.setNumber - right.setNumber ||
        left.createdAt.localeCompare(right.createdAt)
      );
    })[0] ?? null
  );
}

function selectExerciseBlock(sets: TrainingSet[]) {
  const firstExerciseOrder = Math.min(...sets.map((set) => set.exerciseOrder));
  return sets.filter((set) => set.exerciseOrder === firstExerciseOrder);
}

export async function listRecentTrainingHistory(
  patientId: string,
  query: TrainingHistoryRecentQueryInput,
  store: TrainingStore,
) {
  return listTrainingSessions(
    patientId,
    { ...query, includeSets: true },
    store,
  );
}

export async function findLastTrainingPerformance(
  patientId: string,
  query: TrainingLastPerformanceQueryInput,
  store: TrainingStore,
): Promise<TrainingLastPerformance | null> {
  const signature = signatureFromQuery(query);
  const result = await store.findLastPerformanceSessions(
    patientId,
    signature,
    lastPerformanceSessionLimit,
  );

  if (result.error) {
    throw new TrainingStorageError();
  }

  const logs = (result.data ?? []).map((row) =>
    mapTrainingLogRow(
      row,
      (row.training_sets ?? []).map(mapTrainingSetRow),
    ),
  );

  for (const log of sortTrainingLogs(logs)) {
    const matchingSets = selectExerciseBlock(sortSets(
      (log.sets ?? []).filter((set) => setMatchesSignature(set, log, signature)),
    ));

    if (matchingSets.length === 0) continue;

    const lastWorkingSet = selectLastWorkingSet(matchingSets);
    const bestWorkingSet = selectBestWorkingSet(matchingSets);

    return {
      sessionId: log.id,
      trainedOn: log.trainedOn,
      startedAt: log.startedAt,
      gymName: log.gymName,
      signature,
      sets: matchingSets,
      lastWorkingWeightKg: lastWorkingSet?.weightKg ?? null,
      bestWorkingSet,
      hasDropSet: matchingSets.some((set) => set.setType === "drop"),
      hasToFailure: matchingSets.some((set) => set.toFailure),
    };
  }

  return null;
}

export function copyTrainingSetsToDrafts(
  sets: TrainingSet[],
): TrainingSetCopyDraft[] {
  return sortSets(sets).map((set) => ({
    exerciseOrder: String(set.exerciseOrder),
    setNumber: String(set.setNumber),
    movementName: set.movementName,
    equipmentBrand: set.equipmentBrand ?? "",
    equipmentName: set.equipmentName ?? "",
    equipmentModel: set.equipmentModel ?? "",
    laterality: set.laterality,
    side: set.side ?? "both",
    weightKg: set.weightKg == null ? "" : String(set.weightKg),
    weightBasis: set.weightBasis,
    reps: set.reps == null ? "" : String(set.reps),
    setType: set.setType,
    toFailure: false,
    rpe: "",
    notes: set.notes ?? "",
  }));
}

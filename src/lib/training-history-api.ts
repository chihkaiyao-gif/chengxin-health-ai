import { apiError, ok } from "@/lib/api-response";
import {
  findLastTrainingPerformance,
  listRecentTrainingHistory,
} from "@/lib/training-history";
import {
  demoTrainingSession,
  demoTrainingSet,
  TrainingStorageError,
  type SupabaseTrainingClient,
  type TrainingStore,
} from "@/lib/training";
import {
  trainingApiDeps,
  type TrainingApiDeps,
} from "@/lib/training-api";
import {
  trainingHistoryRecentQuerySchema,
  trainingLastPerformanceQuerySchema,
} from "@/lib/validation";

function configOrError(deps: TrainingApiDeps) {
  try {
    return { configured: deps.hasSupabaseConfig(), response: null };
  } catch {
    return {
      configured: false,
      response: apiError(
        "SERVER_ERROR",
        "Supabase 尚未完成設定，無法載入訓練歷史。",
        500,
      ),
    };
  }
}

async function requireTrainingAuth(deps: TrainingApiDeps) {
  const { supabase, user } = await deps.getCurrentUser();

  if (!supabase || !user) {
    return {
      ok: false as const,
      response: apiError("UNAUTHENTICATED", "請先登入。", 401),
    };
  }

  return {
    ok: true as const,
    user,
    store: deps.createStore(supabase as NonNullable<typeof supabase>) as TrainingStore,
  };
}

function handleHistoryError(error: unknown) {
  if (error instanceof TrainingStorageError) {
    return apiError(
      "SERVER_ERROR",
      "訓練歷史資料讀取失敗，請稍後再試。",
      500,
    );
  }

  return apiError(
    "SERVER_ERROR",
    "訓練歷史資料處理失敗，請稍後再試。",
    500,
  );
}

function demoTrainingLogWithSet() {
  const trainingLog = demoTrainingSession();
  return {
    ...trainingLog,
    sets: [demoTrainingSet(trainingLog.id)],
  };
}

export async function handleRecentTrainingHistory(
  request: Request,
  deps = trainingApiDeps,
) {
  const queryObject = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = trainingHistoryRecentQuerySchema.safeParse(queryObject);

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "訓練歷史查詢條件不正確。",
      422,
      parsed.error.flatten(),
    );
  }

  const config = configOrError(deps);

  if (config.response) return config.response;

  if (!config.configured) {
    return ok({
      persisted: false,
      trainingLogs: [demoTrainingLogWithSet()],
    });
  }

  const auth = await requireTrainingAuth(deps);

  if (!auth.ok) return auth.response;

  try {
    const trainingLogs = await listRecentTrainingHistory(
      auth.user.id,
      parsed.data,
      auth.store,
    );

    return ok({ persisted: true, trainingLogs });
  } catch (error) {
    return handleHistoryError(error);
  }
}

export async function handleLastTrainingPerformance(
  request: Request,
  deps = trainingApiDeps,
) {
  const queryObject = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = trainingLastPerformanceQuerySchema.safeParse(queryObject);

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "上次訓練查詢條件不正確。",
      422,
      parsed.error.flatten(),
    );
  }

  const config = configOrError(deps);

  if (config.response) return config.response;

  if (!config.configured) {
    const trainingLog = demoTrainingLogWithSet();
    return ok({
      persisted: false,
      lastPerformance: {
        sessionId: trainingLog.id,
        trainedOn: trainingLog.trainedOn,
        startedAt: trainingLog.startedAt,
        gymName: trainingLog.gymName,
        signature: {
          gymName: trainingLog.gymName ?? null,
          movementName: trainingLog.sets[0].movementName,
          equipmentBrand: trainingLog.sets[0].equipmentBrand,
          equipmentName: trainingLog.sets[0].equipmentName,
          equipmentModel: trainingLog.sets[0].equipmentModel,
          laterality: trainingLog.sets[0].laterality,
          weightBasis: trainingLog.sets[0].weightBasis,
        },
        sets: trainingLog.sets,
        lastWorkingWeightKg: trainingLog.sets[0].weightKg,
        bestWorkingSet: trainingLog.sets[0],
        hasDropSet: false,
        hasToFailure: false,
      },
    });
  }

  const auth = await requireTrainingAuth(deps);

  if (!auth.ok) return auth.response;

  try {
    const lastPerformance = await findLastTrainingPerformance(
      auth.user.id,
      parsed.data,
      auth.store,
    );

    return ok({ persisted: true, lastPerformance });
  } catch (error) {
    return handleHistoryError(error);
  }
}

export function createTrainingHistoryStore(
  supabase: SupabaseTrainingClient,
) {
  return trainingApiDeps.createStore(supabase as never);
}

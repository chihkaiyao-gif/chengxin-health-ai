import { apiError, ok } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth";
import { hasSupabaseConfig } from "@/lib/supabase/server";
import {
  createSupabaseTrainingStore,
  createTrainingSession,
  createTrainingSets,
  deleteTrainingSession,
  deleteTrainingSet,
  demoTrainingSession,
  demoTrainingSet,
  listTrainingSessions,
  listTrainingSets,
  TrainingNotFoundError,
  TrainingStorageError,
  TrainingValidationError,
  updateTrainingSession,
  updateTrainingSet,
  type SupabaseTrainingClient,
  type TrainingStore,
} from "@/lib/training";
import {
  createTrainingSessionSchema,
  createTrainingSetsBatchSchema,
  createTrainingSetSchema,
  trainingSessionQuerySchema,
  updateTrainingSessionSchema,
  updateTrainingSetSchema,
} from "@/lib/validation";

type AuthContext = Awaited<ReturnType<typeof getCurrentUser>>;

export type TrainingApiDeps = {
  hasSupabaseConfig: () => boolean;
  getCurrentUser: () => Promise<AuthContext>;
  createStore: (supabase: NonNullable<AuthContext["supabase"]>) => TrainingStore;
};

export const trainingApiDeps: TrainingApiDeps = {
  hasSupabaseConfig,
  getCurrentUser,
  createStore: (supabase) =>
    createSupabaseTrainingStore(supabase as unknown as SupabaseTrainingClient),
};

async function parseRequestBody(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
    const formData = await request.formData();
    return Object.fromEntries(formData);
  }

  return request.json().catch(() => null);
}

function configOrError(deps: TrainingApiDeps) {
  try {
    return { configured: deps.hasSupabaseConfig(), response: null };
  } catch {
    return {
      configured: false,
      response: apiError(
        "SERVER_ERROR",
        "Supabase 未完成設定，無法寫入訓練紀錄。",
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
    store: deps.createStore(supabase),
  };
}

function handleTrainingError(error: unknown) {
  if (error instanceof TrainingNotFoundError) {
    return apiError("NOT_FOUND", "找不到訓練紀錄。", 404);
  }

  if (error instanceof TrainingStorageError) {
    return apiError("SERVER_ERROR", "訓練資料儲存失敗，請稍後再試。", 500);
  }

  if (error instanceof TrainingValidationError) {
    return apiError("VALIDATION_ERROR", error.message, 422);
  }

  return apiError("SERVER_ERROR", "訓練資料處理失敗，請稍後再試。", 500);
}

export async function handleListTrainingSessions(
  request: Request,
  deps = trainingApiDeps,
) {
  const queryObject = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = trainingSessionQuerySchema.safeParse(queryObject);

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "訓練紀錄查詢條件不正確。",
      422,
      parsed.error.flatten(),
    );
  }

  const config = configOrError(deps);

  if (config.response) return config.response;

  if (!config.configured) {
    const trainingLog = demoTrainingSession();
    return ok({
      persisted: false,
      trainingLogs: parsed.data.includeSets
        ? [{ ...trainingLog, sets: [demoTrainingSet(trainingLog.id)] }]
        : [trainingLog],
    });
  }

  const auth = await requireTrainingAuth(deps);

  if (!auth.ok) return auth.response;

  try {
    const trainingLogs = await listTrainingSessions(
      auth.user.id,
      parsed.data,
      auth.store,
    );

    return ok({ persisted: true, trainingLogs });
  } catch (error) {
    return handleTrainingError(error);
  }
}

export async function handleCreateTrainingSession(
  request: Request,
  deps = trainingApiDeps,
) {
  const body = await parseRequestBody(request);
  const parsed = createTrainingSessionSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "訓練 session 資料格式不正確。",
      422,
      parsed.error.flatten(),
    );
  }

  const config = configOrError(deps);

  if (config.response) return config.response;

  if (!config.configured) {
    return ok(
      {
        persisted: false,
        trainingLog: demoTrainingSession(),
        safetyNotice: "Demo mode：訓練 session 已驗證，但不會寫入正式資料庫。",
      },
      { status: 202 },
    );
  }

  const auth = await requireTrainingAuth(deps);

  if (!auth.ok) return auth.response;

  try {
    const trainingLog = await createTrainingSession(
      parsed.data,
      auth.user.id,
      auth.store,
    );

    return ok({ persisted: true, trainingLog }, { status: 201 });
  } catch (error) {
    return handleTrainingError(error);
  }
}

export async function handleUpdateTrainingSession(
  request: Request,
  id: string,
  deps = trainingApiDeps,
) {
  const body = await parseRequestBody(request);
  const parsed = updateTrainingSessionSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "訓練 session 更新資料格式不正確。",
      422,
      parsed.error.flatten(),
    );
  }

  const config = configOrError(deps);

  if (config.response) return config.response;

  if (!config.configured) {
    return ok({
      persisted: false,
      trainingLog: { ...demoTrainingSession(), id },
      safetyNotice: "Demo mode：訓練 session 已驗證，但不會寫入正式資料庫。",
    });
  }

  const auth = await requireTrainingAuth(deps);

  if (!auth.ok) return auth.response;

  try {
    const trainingLog = await updateTrainingSession(
      id,
      auth.user.id,
      parsed.data,
      auth.store,
    );

    return ok({ persisted: true, trainingLog });
  } catch (error) {
    return handleTrainingError(error);
  }
}

export async function handleDeleteTrainingSession(
  id: string,
  deps = trainingApiDeps,
) {
  const config = configOrError(deps);

  if (config.response) return config.response;

  if (!config.configured) {
    return ok({
      persisted: false,
      deleted: true,
      id,
      safetyNotice: "Demo mode：訓練 session 已驗證，但不會寫入正式資料庫。",
    });
  }

  const auth = await requireTrainingAuth(deps);

  if (!auth.ok) return auth.response;

  try {
    await deleteTrainingSession(id, auth.user.id, auth.store);
    return ok({ persisted: true, deleted: true, id });
  } catch (error) {
    return handleTrainingError(error);
  }
}

export async function handleListTrainingSets(
  trainingLogId: string,
  deps = trainingApiDeps,
) {
  const config = configOrError(deps);

  if (config.response) return config.response;

  if (!config.configured) {
    return ok({
      persisted: false,
      trainingSets: [demoTrainingSet(trainingLogId)],
    });
  }

  const auth = await requireTrainingAuth(deps);

  if (!auth.ok) return auth.response;

  try {
    const trainingSets = await listTrainingSets(
      trainingLogId,
      auth.user.id,
      auth.store,
    );
    return ok({ persisted: true, trainingSets });
  } catch (error) {
    return handleTrainingError(error);
  }
}

export async function handleCreateTrainingSets(
  request: Request,
  trainingLogId: string,
  deps = trainingApiDeps,
) {
  const body = await parseRequestBody(request);
  const batchParsed = createTrainingSetsBatchSchema.safeParse(body);
  const parsed = batchParsed.success
    ? batchParsed
    : createTrainingSetSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "訓練組數資料格式不正確。",
      422,
      parsed.error.flatten(),
    );
  }

  const sets = "sets" in parsed.data ? parsed.data.sets : [parsed.data];
  const config = configOrError(deps);

  if (config.response) return config.response;

  if (!config.configured) {
    return ok(
      {
        persisted: false,
        trainingSets: sets.map((_, index) => ({
          ...demoTrainingSet(trainingLogId),
          id: `demo-training-set-${index + 1}`,
          setNumber: index + 1,
        })),
        safetyNotice: "Demo mode：訓練組數已驗證，但不會寫入正式資料庫。",
      },
      { status: 202 },
    );
  }

  const auth = await requireTrainingAuth(deps);

  if (!auth.ok) return auth.response;

  try {
    const trainingSets = await createTrainingSets(
      trainingLogId,
      auth.user.id,
      sets,
      auth.store,
    );

    return ok({ persisted: true, trainingSets }, { status: 201 });
  } catch (error) {
    return handleTrainingError(error);
  }
}

export async function handleUpdateTrainingSet(
  request: Request,
  setId: string,
  deps = trainingApiDeps,
) {
  const body = await parseRequestBody(request);
  const parsed = updateTrainingSetSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "訓練組數更新資料格式不正確。",
      422,
      parsed.error.flatten(),
    );
  }

  const config = configOrError(deps);

  if (config.response) return config.response;

  if (!config.configured) {
    return ok({
      persisted: false,
      trainingSet: { ...demoTrainingSet(), id: setId },
      safetyNotice: "Demo mode：訓練組數已驗證，但不會寫入正式資料庫。",
    });
  }

  const auth = await requireTrainingAuth(deps);

  if (!auth.ok) return auth.response;

  try {
    const trainingSet = await updateTrainingSet(
      setId,
      auth.user.id,
      parsed.data,
      auth.store,
    );

    return ok({ persisted: true, trainingSet });
  } catch (error) {
    return handleTrainingError(error);
  }
}

export async function handleDeleteTrainingSet(
  setId: string,
  deps = trainingApiDeps,
) {
  const config = configOrError(deps);

  if (config.response) return config.response;

  if (!config.configured) {
    return ok({
      persisted: false,
      deleted: true,
      id: setId,
      safetyNotice: "Demo mode：訓練組數已驗證，但不會寫入正式資料庫。",
    });
  }

  const auth = await requireTrainingAuth(deps);

  if (!auth.ok) return auth.response;

  try {
    await deleteTrainingSet(setId, auth.user.id, auth.store);
    return ok({ persisted: true, deleted: true, id: setId });
  } catch (error) {
    return handleTrainingError(error);
  }
}

import { apiError, ok } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth";
import {
  buildAliasInsert,
  buildEquipmentProfileInsert,
  buildEquipmentProfileUpdate,
  buildGymProfileInsert,
  buildGymProfileUpdate,
  buildResolveResult,
  createSupabaseEquipmentStore,
  filterLegacyCandidatesForProfile,
  mapEquipmentAliasRow,
  mapEquipmentProfileRow,
  mapGymProfileRow,
  mapLegacyCandidateRow,
  type EquipmentStore,
  type SupabaseEquipmentClient,
} from "@/lib/equipment-profiles";
import { normalizeEquipmentLabel } from "@/lib/normalization";
import { hasSupabaseConfig } from "@/lib/supabase/server";
import type { EquipmentProfile, GymProfile } from "@/lib/types";
import {
  equipmentAliasInputSchema,
  equipmentLegacyCandidatesQuerySchema,
  equipmentProfileInputSchema,
  equipmentProfileQuerySchema,
  equipmentResolveQuerySchema,
  gymProfileInputSchema,
  gymProfileQuerySchema,
  linkTrainingSetsToEquipmentSchema,
  updateEquipmentProfileSchema,
  updateGymProfileSchema,
} from "@/lib/validation";

type AuthContext = Awaited<ReturnType<typeof getCurrentUser>>;

export type EquipmentApiDeps = {
  hasSupabaseConfig: () => boolean;
  getCurrentUser: () => Promise<AuthContext>;
  createStore: (supabase: NonNullable<AuthContext["supabase"]>) => EquipmentStore;
};

export const equipmentApiDeps: EquipmentApiDeps = {
  hasSupabaseConfig,
  getCurrentUser,
  createStore: (supabase) =>
    createSupabaseEquipmentStore(supabase as unknown as SupabaseEquipmentClient),
};

async function parseRequestBody(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (
    contentType.includes("multipart/form-data") ||
    contentType.includes("application/x-www-form-urlencoded")
  ) {
    const formData = await request.formData();
    return Object.fromEntries(formData);
  }

  return request.json().catch(() => null);
}

function configOrError(deps: EquipmentApiDeps) {
  try {
    return { configured: deps.hasSupabaseConfig(), response: null };
  } catch {
    return {
      configured: false,
      response: apiError(
        "SERVER_ERROR",
        "Supabase 未完成設定，無法處理器材設定檔。",
        500,
      ),
    };
  }
}

async function requireEquipmentAuth(deps: EquipmentApiDeps) {
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

function demoGymProfile(): GymProfile {
  return {
    id: "demo-gym-profile",
    ownerId: "demo-user",
    name: "澄心示範健身房",
    normalizedName: "澄心示範健身房",
    branchName: "台北館",
    normalizedBranchName: "台北館",
    locationText: "Demo mode，不會正式儲存。",
    createdAt: "2026-07-11T08:00:00.000Z",
    updatedAt: "2026-07-11T08:00:00.000Z",
  };
}

function demoEquipmentProfile(): EquipmentProfile {
  return {
    id: "demo-equipment-profile",
    ownerId: "demo-user",
    gymProfileId: "demo-gym-profile",
    canonicalName: "Hammer Strength ILWPD",
    normalizedName: "hammer strength ilwpd",
    brand: "Hammer Strength",
    model: "ILWPD",
    defaultMovementName: "高位下拉",
    defaultLaterality: "unilateral",
    defaultWeightBasis: "per_side",
    seatSetting: "座椅 4",
    padSetting: "腿墊 3",
    handleSetting: "中立握把",
    notes: "Demo mode，不會正式儲存。",
    createdAt: "2026-07-11T08:00:00.000Z",
    updatedAt: "2026-07-11T08:00:00.000Z",
    aliases: [],
    gym: demoGymProfile(),
  };
}

function handleEquipmentError(error: unknown) {
  const record =
    typeof error === "object" && error !== null
      ? (error as Record<string, unknown>)
      : null;
  const message =
    error instanceof Error
      ? error.message
      : typeof record?.message === "string"
        ? record.message
        : "";
  const code = typeof record?.code === "string" ? record.code : "";
  const normalizedMessage = message.toLowerCase();

  if (
    code === "23505" ||
    normalizedMessage.includes("duplicate") ||
    normalizedMessage.includes("unique")
  ) {
    return apiError("CONFLICT", "同一器材已有相同別名。", 409);
  }

  return apiError("SERVER_ERROR", "器材設定資料處理失敗，請稍後再試。", 500);
}

async function ensureGymOwner(store: EquipmentStore, gymProfileId: string, ownerId: string) {
  const result = await store.findGymForOwner(gymProfileId, ownerId);
  if (result.error) throw new Error("GYM_LOOKUP_FAILED");
  return result.data;
}

async function ensureEquipmentOwner(
  store: EquipmentStore,
  equipmentProfileId: string,
  ownerId: string,
) {
  const result = await store.findEquipmentForOwner(equipmentProfileId, ownerId);
  if (result.error) throw new Error("EQUIPMENT_LOOKUP_FAILED");
  return result.data;
}

export async function handleListGyms(request: Request, deps = equipmentApiDeps) {
  const parsed = gymProfileQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );

  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "健身房查詢條件不正確。", 422, parsed.error.flatten());
  }

  const config = configOrError(deps);
  if (config.response) return config.response;

  if (!config.configured) {
    return ok({ persisted: false, gyms: [demoGymProfile()] });
  }

  const auth = await requireEquipmentAuth(deps);
  if (!auth.ok) return auth.response;

  try {
    const result = await auth.store.listGyms(auth.user.id, parsed.data);
    if (result.error) throw new Error("LIST_GYMS_FAILED");
    return ok({ persisted: true, gyms: (result.data ?? []).map(mapGymProfileRow) });
  } catch (error) {
    return handleEquipmentError(error);
  }
}

export async function handleCreateGym(request: Request, deps = equipmentApiDeps) {
  const parsed = gymProfileInputSchema.safeParse(await parseRequestBody(request));

  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "健身房資料格式不正確。", 422, parsed.error.flatten());
  }

  const config = configOrError(deps);
  if (config.response) return config.response;

  if (!config.configured) {
    return ok({ persisted: false, gym: demoGymProfile() }, { status: 202 });
  }

  const auth = await requireEquipmentAuth(deps);
  if (!auth.ok) return auth.response;

  try {
    const result = await auth.store.createGym(
      buildGymProfileInsert(parsed.data, auth.user.id),
    );
    if (result.error || !result.data) throw new Error("CREATE_GYM_FAILED");
    return ok({ persisted: true, gym: mapGymProfileRow(result.data) }, { status: 201 });
  } catch (error) {
    return handleEquipmentError(error);
  }
}

export async function handleUpdateGym(
  request: Request,
  id: string,
  deps = equipmentApiDeps,
) {
  const parsed = updateGymProfileSchema.safeParse(await parseRequestBody(request));

  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "健身房更新資料格式不正確。", 422, parsed.error.flatten());
  }

  const config = configOrError(deps);
  if (config.response) return config.response;

  if (!config.configured) {
    return ok({ persisted: false, gym: { ...demoGymProfile(), id } });
  }

  const auth = await requireEquipmentAuth(deps);
  if (!auth.ok) return auth.response;

  try {
    const result = await auth.store.updateGym(
      id,
      auth.user.id,
      buildGymProfileUpdate(parsed.data),
    );
    if (result.error) throw new Error("UPDATE_GYM_FAILED");
    if (!result.data) return apiError("NOT_FOUND", "找不到健身房設定。", 404);
    return ok({ persisted: true, gym: mapGymProfileRow(result.data) });
  } catch (error) {
    return handleEquipmentError(error);
  }
}

export async function handleDeleteGym(id: string, deps = equipmentApiDeps) {
  const config = configOrError(deps);
  if (config.response) return config.response;

  if (!config.configured) {
    return ok({ persisted: false, deleted: true, id });
  }

  const auth = await requireEquipmentAuth(deps);
  if (!auth.ok) return auth.response;

  try {
    const result = await auth.store.deleteGym(id, auth.user.id);
    if (result.error) throw new Error("DELETE_GYM_FAILED");
    if (!result.data) return apiError("NOT_FOUND", "找不到健身房設定。", 404);
    return ok({ persisted: true, deleted: true, id });
  } catch (error) {
    return handleEquipmentError(error);
  }
}

export async function handleListEquipment(request: Request, deps = equipmentApiDeps) {
  const parsed = equipmentProfileQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );

  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "器材查詢條件不正確。", 422, parsed.error.flatten());
  }

  const config = configOrError(deps);
  if (config.response) return config.response;

  if (!config.configured) {
    return ok({ persisted: false, equipmentProfiles: [demoEquipmentProfile()] });
  }

  const auth = await requireEquipmentAuth(deps);
  if (!auth.ok) return auth.response;

  try {
    if (parsed.data.gymProfileId) {
      const gym = await ensureGymOwner(auth.store, parsed.data.gymProfileId, auth.user.id);
      if (!gym) return apiError("NOT_FOUND", "找不到健身房設定。", 404);
    }

    const result = await auth.store.listEquipment(auth.user.id, parsed.data);
    if (result.error) throw new Error("LIST_EQUIPMENT_FAILED");
    return ok({
      persisted: true,
      equipmentProfiles: (result.data ?? []).map(mapEquipmentProfileRow),
    });
  } catch (error) {
    return handleEquipmentError(error);
  }
}

export async function handleCreateEquipment(request: Request, deps = equipmentApiDeps) {
  const parsed = equipmentProfileInputSchema.safeParse(await parseRequestBody(request));

  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "器材設定資料格式不正確。", 422, parsed.error.flatten());
  }

  const config = configOrError(deps);
  if (config.response) return config.response;

  if (!config.configured) {
    return ok({ persisted: false, equipmentProfile: demoEquipmentProfile() }, { status: 202 });
  }

  const auth = await requireEquipmentAuth(deps);
  if (!auth.ok) return auth.response;

  try {
    if (parsed.data.gymProfileId) {
      const gym = await ensureGymOwner(auth.store, parsed.data.gymProfileId, auth.user.id);
      if (!gym) return apiError("NOT_FOUND", "找不到健身房設定。", 404);
    }

    const result = await auth.store.createEquipment(
      buildEquipmentProfileInsert(parsed.data, auth.user.id),
    );
    if (result.error || !result.data) throw new Error("CREATE_EQUIPMENT_FAILED");
    return ok(
      { persisted: true, equipmentProfile: mapEquipmentProfileRow(result.data) },
      { status: 201 },
    );
  } catch (error) {
    return handleEquipmentError(error);
  }
}

export async function handleUpdateEquipment(
  request: Request,
  id: string,
  deps = equipmentApiDeps,
) {
  const parsed = updateEquipmentProfileSchema.safeParse(await parseRequestBody(request));

  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "器材設定更新資料格式不正確。", 422, parsed.error.flatten());
  }

  const config = configOrError(deps);
  if (config.response) return config.response;

  if (!config.configured) {
    return ok({ persisted: false, equipmentProfile: { ...demoEquipmentProfile(), id } });
  }

  const auth = await requireEquipmentAuth(deps);
  if (!auth.ok) return auth.response;

  try {
    if (parsed.data.gymProfileId) {
      const gym = await ensureGymOwner(auth.store, parsed.data.gymProfileId, auth.user.id);
      if (!gym) return apiError("NOT_FOUND", "找不到健身房設定。", 404);
    }

    const result = await auth.store.updateEquipment(
      id,
      auth.user.id,
      buildEquipmentProfileUpdate(parsed.data),
    );
    if (result.error) throw new Error("UPDATE_EQUIPMENT_FAILED");
    if (!result.data) return apiError("NOT_FOUND", "找不到器材設定。", 404);
    return ok({ persisted: true, equipmentProfile: mapEquipmentProfileRow(result.data) });
  } catch (error) {
    return handleEquipmentError(error);
  }
}

export async function handleDeleteEquipment(id: string, deps = equipmentApiDeps) {
  const config = configOrError(deps);
  if (config.response) return config.response;

  if (!config.configured) {
    return ok({ persisted: false, deleted: true, id });
  }

  const auth = await requireEquipmentAuth(deps);
  if (!auth.ok) return auth.response;

  try {
    const result = await auth.store.deleteEquipment(id, auth.user.id);
    if (result.error) throw new Error("DELETE_EQUIPMENT_FAILED");
    if (!result.data) return apiError("NOT_FOUND", "找不到器材設定。", 404);
    return ok({ persisted: true, deleted: true, id });
  } catch (error) {
    return handleEquipmentError(error);
  }
}

export async function handleCreateEquipmentAlias(
  request: Request,
  equipmentProfileId: string,
  deps = equipmentApiDeps,
) {
  const parsed = equipmentAliasInputSchema.safeParse(await parseRequestBody(request));

  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "器材別名資料格式不正確。", 422, parsed.error.flatten());
  }

  const config = configOrError(deps);
  if (config.response) return config.response;

  if (!config.configured) {
    return ok(
      {
        persisted: false,
        alias: {
          id: "demo-equipment-alias",
          ownerId: "demo-user",
          equipmentProfileId,
          alias: parsed.data.alias,
          normalizedAlias: normalizeEquipmentLabel(parsed.data.alias),
          createdAt: "2026-07-11T08:00:00.000Z",
        },
      },
      { status: 202 },
    );
  }

  const auth = await requireEquipmentAuth(deps);
  if (!auth.ok) return auth.response;

  try {
    const profile = await ensureEquipmentOwner(auth.store, equipmentProfileId, auth.user.id);
    if (!profile) return apiError("NOT_FOUND", "找不到器材設定。", 404);

    const result = await auth.store.createAlias(
      buildAliasInsert(parsed.data, auth.user.id, equipmentProfileId),
    );
    if (result.error || !result.data) throw result.error ?? new Error("CREATE_ALIAS_FAILED");
    return ok({ persisted: true, alias: mapEquipmentAliasRow(result.data) }, { status: 201 });
  } catch (error) {
    return handleEquipmentError(error);
  }
}

export async function handleDeleteEquipmentAlias(id: string, deps = equipmentApiDeps) {
  const config = configOrError(deps);
  if (config.response) return config.response;

  if (!config.configured) {
    return ok({ persisted: false, deleted: true, id });
  }

  const auth = await requireEquipmentAuth(deps);
  if (!auth.ok) return auth.response;

  try {
    const result = await auth.store.deleteAlias(id, auth.user.id);
    if (result.error) throw new Error("DELETE_ALIAS_FAILED");
    if (!result.data) return apiError("NOT_FOUND", "找不到器材別名。", 404);
    return ok({ persisted: true, deleted: true, id });
  } catch (error) {
    return handleEquipmentError(error);
  }
}

export async function handleResolveEquipmentProfile(
  request: Request,
  deps = equipmentApiDeps,
) {
  const parsed = equipmentResolveQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );

  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "器材解析查詢條件不正確。", 422, parsed.error.flatten());
  }

  const config = configOrError(deps);
  if (config.response) return config.response;

  if (!config.configured) {
    return ok({
      persisted: false,
      result: { match: demoEquipmentProfile(), candidates: [demoEquipmentProfile()], ambiguous: false },
    });
  }

  const auth = await requireEquipmentAuth(deps);
  if (!auth.ok) return auth.response;

  try {
    if (parsed.data.gymProfileId) {
      const gym = await ensureGymOwner(auth.store, parsed.data.gymProfileId, auth.user.id);
      if (!gym) return apiError("NOT_FOUND", "找不到健身房設定。", 404);
    }

    const result = await auth.store.resolveAlias(
      auth.user.id,
      normalizeEquipmentLabel(parsed.data.alias),
      parsed.data.gymProfileId ?? null,
    );
    if (result.error) throw new Error("RESOLVE_ALIAS_FAILED");

    return ok({ persisted: true, result: buildResolveResult(result.data) });
  } catch (error) {
    return handleEquipmentError(error);
  }
}

export async function handleEquipmentLegacyCandidates(
  request: Request,
  equipmentProfileId: string,
  deps = equipmentApiDeps,
) {
  const parsed = equipmentLegacyCandidatesQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );

  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "舊訓練候選查詢條件不正確。", 422, parsed.error.flatten());
  }

  const config = configOrError(deps);
  if (config.response) return config.response;

  if (!config.configured) {
    return ok({ persisted: false, candidates: [] });
  }

  const auth = await requireEquipmentAuth(deps);
  if (!auth.ok) return auth.response;

  try {
    const profileRow = await ensureEquipmentOwner(auth.store, equipmentProfileId, auth.user.id);
    if (!profileRow) return apiError("NOT_FOUND", "找不到器材設定。", 404);

    const profile = mapEquipmentProfileRow(profileRow);
    const result = await auth.store.listLegacyCandidates(auth.user.id, parsed.data.limit);
    if (result.error) throw new Error("LIST_LEGACY_CANDIDATES_FAILED");

    const candidates = filterLegacyCandidatesForProfile(
      profile,
      (result.data ?? []).map(mapLegacyCandidateRow).filter((item): item is NonNullable<typeof item> => Boolean(item)),
    );

    return ok({ persisted: true, candidates });
  } catch (error) {
    return handleEquipmentError(error);
  }
}

export async function handleLinkTrainingSetsToEquipment(
  request: Request,
  equipmentProfileId: string,
  deps = equipmentApiDeps,
) {
  const parsed = linkTrainingSetsToEquipmentSchema.safeParse(await parseRequestBody(request));

  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "連結訓練組數資料格式不正確。", 422, parsed.error.flatten());
  }

  const config = configOrError(deps);
  if (config.response) return config.response;

  if (!config.configured) {
    return ok({ persisted: false, linkedCount: 0 }, { status: 202 });
  }

  const auth = await requireEquipmentAuth(deps);
  if (!auth.ok) return auth.response;

  try {
    const profile = await ensureEquipmentOwner(auth.store, equipmentProfileId, auth.user.id);
    if (!profile) return apiError("NOT_FOUND", "找不到器材設定。", 404);

    const result = await auth.store.linkTrainingSetsToEquipmentProfile(
      equipmentProfileId,
      parsed.data.trainingSetIds,
    );

    if (result.error || result.data == null) {
      const message = result.error instanceof Error ? result.error.message : "";
      if (message.includes("NOT_FOUND") || message.includes("CONFLICT")) {
        return apiError("NOT_FOUND", "找不到可連結的訓練組數。", 404);
      }
      throw new Error("LINK_TRAINING_SETS_FAILED");
    }

    return ok({ persisted: true, linkedCount: result.data });
  } catch (error) {
    return handleEquipmentError(error);
  }
}

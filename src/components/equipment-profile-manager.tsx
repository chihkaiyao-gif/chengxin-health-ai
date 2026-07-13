"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  Dumbbell,
  Link2,
  MapPin,
  Pencil,
  Plus,
  RefreshCcw,
  Save,
  Tag,
  Trash2,
  X,
} from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PremiumButton, SectionHeader } from "@/components/premium-ui";
import { SectionCard } from "@/components/section-card";
import {
  appendById,
  createAsyncActionLock,
  removeById,
  replaceById,
} from "@/lib/equipment-profile-ui";
import type {
  EquipmentAlias,
  EquipmentLegacyCandidate,
  EquipmentProfile,
  GymProfile,
} from "@/lib/types";

type ApiEnvelope<T> = {
  data?: T;
  error?: { message?: string };
};

type GymsResponse = {
  persisted: boolean;
  gyms: GymProfile[];
};

type EquipmentResponse = {
  persisted: boolean;
  equipmentProfiles: EquipmentProfile[];
};

type LegacyCandidatesResponse = {
  persisted: boolean;
  candidates: EquipmentLegacyCandidate[];
};

type LinkResponse = {
  persisted: boolean;
  linkedCount: number;
};

type Mode = "gyms" | "equipment";

async function readJson<T>(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;

  if (!response.ok || !payload.data) {
    throw new Error(payload.error?.message || "資料處理失敗，請稍後再試。");
  }

  return payload.data;
}

function formatGymName(gym: GymProfile) {
  return gym.branchName ? `${gym.name} - ${gym.branchName}` : gym.name;
}

function formatEquipment(profile: EquipmentProfile) {
  return [profile.brand, profile.canonicalName, profile.model]
    .filter(Boolean)
    .join(" · ");
}

function formatSet(candidate: EquipmentLegacyCandidate) {
  const set = candidate.trainingSet;
  return `${candidate.trainingLog.trainedOn} · ${set.movementName} · ${set.weightKg ?? "-"} kg／${set.weightBasis} · ${set.reps ?? "-"} 下`;
}

function gymPayload(formData: FormData) {
  return {
    name: formData.get("name"),
    branchName: formData.get("branchName"),
    locationText: formData.get("locationText"),
  };
}

function equipmentPayload(formData: FormData, clearableDefaults = false) {
  const defaultLaterality = formData.get("defaultLaterality");
  const defaultWeightBasis = formData.get("defaultWeightBasis");

  return {
    gymProfileId: formData.get("gymProfileId") || null,
    canonicalName: formData.get("canonicalName"),
    brand: formData.get("brand"),
    model: formData.get("model"),
    defaultMovementName: formData.get("defaultMovementName"),
    defaultLaterality:
      defaultLaterality || (clearableDefaults ? null : undefined),
    defaultWeightBasis:
      defaultWeightBasis || (clearableDefaults ? null : undefined),
    seatSetting: formData.get("seatSetting"),
    padSetting: formData.get("padSetting"),
    handleSetting: formData.get("handleSetting"),
    notes: formData.get("notes"),
  };
}

function EquipmentFields({
  prefix,
  gyms,
  profile,
}: {
  prefix: string;
  gyms: GymProfile[];
  profile?: EquipmentProfile;
}) {
  return (
    <>
      <div className="field-stack">
        <label htmlFor={`${prefix}-gym`}>健身房</label>
        <select
          id={`${prefix}-gym`}
          name="gymProfileId"
          defaultValue={profile?.gymProfileId ?? ""}
        >
          <option value="">不指定健身房</option>
          {gyms.map((gym) => (
            <option key={gym.id} value={gym.id}>
              {formatGymName(gym)}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="field-stack">
          <label htmlFor={`${prefix}-canonical-name`}>器材正式名稱</label>
          <input
            id={`${prefix}-canonical-name`}
            name="canonicalName"
            required
            maxLength={160}
            defaultValue={profile?.canonicalName ?? ""}
            placeholder="Hammer Strength ILWPD"
          />
        </div>
        <div className="field-stack">
          <label htmlFor={`${prefix}-brand`}>品牌</label>
          <input
            id={`${prefix}-brand`}
            name="brand"
            maxLength={120}
            defaultValue={profile?.brand ?? ""}
            placeholder="Hammer Strength"
          />
        </div>
        <div className="field-stack">
          <label htmlFor={`${prefix}-model`}>型號</label>
          <input
            id={`${prefix}-model`}
            name="model"
            maxLength={120}
            defaultValue={profile?.model ?? ""}
            placeholder="ILWPD"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="field-stack">
          <label htmlFor={`${prefix}-movement`}>預設動作</label>
          <input
            id={`${prefix}-movement`}
            name="defaultMovementName"
            maxLength={160}
            defaultValue={profile?.defaultMovementName ?? ""}
            placeholder="高位下拉"
          />
        </div>
        <div className="field-stack">
          <label htmlFor={`${prefix}-laterality`}>預設單側/雙側</label>
          <select
            id={`${prefix}-laterality`}
            name="defaultLaterality"
            defaultValue={profile?.defaultLaterality ?? ""}
          >
            <option value="">不指定</option>
            <option value="bilateral">雙手/雙側一起</option>
            <option value="unilateral">單側</option>
          </select>
        </div>
        <div className="field-stack">
          <label htmlFor={`${prefix}-weight-basis`}>預設重量記法</label>
          <select
            id={`${prefix}-weight-basis`}
            name="defaultWeightBasis"
            defaultValue={profile?.defaultWeightBasis ?? ""}
          >
            <option value="">不指定</option>
            <option value="total">總重量</option>
            <option value="per_side">每側</option>
            <option value="per_hand">每手</option>
          </select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="field-stack">
          <label htmlFor={`${prefix}-seat`}>座椅設定</label>
          <input
            id={`${prefix}-seat`}
            name="seatSetting"
            maxLength={100}
            defaultValue={profile?.seatSetting ?? ""}
          />
        </div>
        <div className="field-stack">
          <label htmlFor={`${prefix}-pad`}>胸墊/腿墊設定</label>
          <input
            id={`${prefix}-pad`}
            name="padSetting"
            maxLength={100}
            defaultValue={profile?.padSetting ?? ""}
          />
        </div>
        <div className="field-stack">
          <label htmlFor={`${prefix}-handle`}>握把設定</label>
          <input
            id={`${prefix}-handle`}
            name="handleSetting"
            maxLength={100}
            defaultValue={profile?.handleSetting ?? ""}
          />
        </div>
      </div>
      <div className="field-stack">
        <label htmlFor={`${prefix}-notes`}>備註</label>
        <textarea
          id={`${prefix}-notes`}
          name="notes"
          maxLength={1000}
          rows={3}
          defaultValue={profile?.notes ?? ""}
        />
      </div>
    </>
  );
}

export function EquipmentProfileManager({ mode }: { mode: Mode }) {
  const [gyms, setGyms] = useState<GymProfile[]>([]);
  const [equipmentProfiles, setEquipmentProfiles] = useState<EquipmentProfile[]>([]);
  const [editingGymId, setEditingGymId] = useState("");
  const [editingEquipmentId, setEditingEquipmentId] = useState("");
  const [selectedEquipmentId, setSelectedEquipmentId] = useState("");
  const [legacyCandidates, setLegacyCandidates] = useState<EquipmentLegacyCandidate[]>([]);
  const [selectedSetIds, setSelectedSetIds] = useState<string[]>([]);
  const [persisted, setPersisted] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const mutationLock = useRef(createAsyncActionLock());

  const selectedEquipment = useMemo(
    () => equipmentProfiles.find((profile) => profile.id === selectedEquipmentId) ?? null,
    [equipmentProfiles, selectedEquipmentId],
  );

  function withGym(profile: EquipmentProfile) {
    return {
      ...profile,
      aliases: profile.aliases ?? [],
      gym: gyms.find((gym) => gym.id === profile.gymProfileId) ?? null,
    };
  }

  async function runMutation(action: () => Promise<void>) {
    return mutationLock.current.run(async () => {
      setIsMutating(true);
      setError("");
      setMessage("");
      try {
        await action();
      } finally {
        setIsMutating(false);
      }
    });
  }

  async function loadData() {
    setIsLoading(true);
    setError("");

    try {
      const [gymsResponse, equipmentResponse] = await Promise.all([
        fetch("/api/gyms?limit=100", { cache: "no-store" }),
        fetch("/api/equipment-profiles?includeAliases=true&limit=100", {
          cache: "no-store",
        }),
      ]);
      const gymsData = await readJson<GymsResponse>(gymsResponse);
      const equipmentData = await readJson<EquipmentResponse>(equipmentResponse);

      setPersisted(gymsData.persisted && equipmentData.persisted);
      setGyms(gymsData.gyms);
      setEquipmentProfiles(equipmentData.equipmentProfiles);
    } catch (err) {
      setError(err instanceof Error ? err.message : "無法載入器材設定。");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function createGym(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    await runMutation(async () => {
      try {
        const response = await fetch("/api/gyms", {
          method: "POST",
          body: JSON.stringify(gymPayload(formData)),
          headers: { "content-type": "application/json" },
        });
        const data = await readJson<{ persisted: boolean; gym: GymProfile }>(response);
        setPersisted(data.persisted);
        setGyms((current) => appendById(current, data.gym));
        setMessage(data.persisted ? "已新增健身房設定。" : "Demo Mode：健身房資料未正式儲存。");
        form.reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "無法新增健身房。");
      }
    });
  }

  async function updateGym(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    await runMutation(async () => {
      try {
        const response = await fetch(`/api/gyms/${id}`, {
          method: "PATCH",
          body: JSON.stringify(gymPayload(formData)),
          headers: { "content-type": "application/json" },
        });
        const data = await readJson<{ persisted: boolean; gym: GymProfile }>(response);
        setPersisted(data.persisted);
        setGyms((current) => replaceById(current, data.gym));
        setEquipmentProfiles((current) =>
          current.map((profile) =>
            profile.gymProfileId === data.gym.id
              ? { ...profile, gym: data.gym }
              : profile,
          ),
        );
        setEditingGymId("");
        setMessage("已更新健身房設定。");
      } catch (err) {
        setError(err instanceof Error ? err.message : "無法更新健身房。");
      }
    });
  }

  async function deleteGym(id: string) {
    if (
      !window.confirm(
        "刪除健身房不會刪除歷史訓練紀錄或器材設定檔，只會解除 gym profile 連結並保留 gym_name snapshot。確定刪除？",
      )
    ) {
      return;
    }

    await runMutation(async () => {
      try {
        const response = await fetch(`/api/gyms/${id}`, { method: "DELETE" });
        const data = await readJson<{ persisted: boolean }>(response);
        setPersisted(data.persisted);
        setGyms((current) => removeById(current, id));
        setEquipmentProfiles((current) =>
          current.map((profile) =>
            profile.gymProfileId === id
              ? { ...profile, gymProfileId: null, gym: null }
              : profile,
          ),
        );
        setEditingGymId((current) => (current === id ? "" : current));
        setMessage("已刪除健身房設定；歷史紀錄與 gym_name snapshot 均已保留。");
      } catch (err) {
        setError(err instanceof Error ? err.message : "無法刪除健身房。");
      }
    });
  }

  async function createEquipment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    await runMutation(async () => {
      try {
        const response = await fetch("/api/equipment-profiles", {
          method: "POST",
          body: JSON.stringify(equipmentPayload(formData)),
          headers: { "content-type": "application/json" },
        });
        const data = await readJson<{
          persisted: boolean;
          equipmentProfile: EquipmentProfile;
        }>(response);
        const profile = withGym(data.equipmentProfile);
        setPersisted(data.persisted);
        setEquipmentProfiles((current) => appendById(current, profile));
        setMessage(data.persisted ? "已新增器材設定。" : "Demo Mode：器材資料未正式儲存。");
        form.reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "無法新增器材。");
      }
    });
  }

  async function updateEquipment(
    event: FormEvent<HTMLFormElement>,
    profile: EquipmentProfile,
  ) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    await runMutation(async () => {
      try {
        const response = await fetch(`/api/equipment-profiles/${profile.id}`, {
          method: "PATCH",
          body: JSON.stringify(equipmentPayload(formData, true)),
          headers: { "content-type": "application/json" },
        });
        const data = await readJson<{
          persisted: boolean;
          equipmentProfile: EquipmentProfile;
        }>(response);
        const updated = withGym({
          ...data.equipmentProfile,
          aliases: profile.aliases ?? [],
        });
        setPersisted(data.persisted);
        setEquipmentProfiles((current) => replaceById(current, updated));
        setEditingEquipmentId("");
        setMessage("已更新器材設定。");
      } catch (err) {
        setError(err instanceof Error ? err.message : "無法更新器材。");
      }
    });
  }

  async function deleteEquipment(id: string) {
    if (
      !window.confirm(
        "刪除器材不會刪除 training sets；equipment_profile_id 會設為 null，歷史器材快照會保留。確定刪除？",
      )
    ) {
      return;
    }

    await runMutation(async () => {
      try {
        const response = await fetch(`/api/equipment-profiles/${id}`, {
          method: "DELETE",
        });
        const data = await readJson<{ persisted: boolean }>(response);
        setPersisted(data.persisted);
        setEquipmentProfiles((current) => removeById(current, id));
        setEditingEquipmentId((current) => (current === id ? "" : current));
        setSelectedEquipmentId((current) => (current === id ? "" : current));
        setMessage("已刪除器材設定；training sets 與歷史器材快照均已保留。");
      } catch (err) {
        setError(err instanceof Error ? err.message : "無法刪除器材。");
      }
    });
  }

  async function createAlias(
    event: FormEvent<HTMLFormElement>,
    equipmentProfileId: string,
  ) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const alias = String(formData.get("alias") ?? "").trim();

    await runMutation(async () => {
      try {
        const response = await fetch(
          `/api/equipment-profiles/${equipmentProfileId}/aliases`,
          {
            method: "POST",
            body: JSON.stringify({ alias }),
            headers: { "content-type": "application/json" },
          },
        );
        const data = await readJson<{ persisted: boolean; alias: EquipmentAlias }>(response);
        setPersisted(data.persisted);
        setEquipmentProfiles((current) =>
          current.map((profile) =>
            profile.id === equipmentProfileId
              ? {
                  ...profile,
                  aliases: appendById(profile.aliases ?? [], data.alias),
                }
              : profile,
          ),
        );
        setMessage(`已新增別名「${data.alias.alias}」。`);
        form.reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "無法新增器材別名。");
      }
    });
  }

  async function deleteAlias(alias: EquipmentAlias) {
    if (!window.confirm(`確定刪除別名「${alias.alias}」？`)) return;

    await runMutation(async () => {
      try {
        const response = await fetch(`/api/equipment-aliases/${alias.id}`, {
          method: "DELETE",
        });
        const data = await readJson<{ persisted: boolean }>(response);
        setPersisted(data.persisted);
        setEquipmentProfiles((current) =>
          current.map((profile) =>
            profile.id === alias.equipmentProfileId
              ? {
                  ...profile,
                  aliases: removeById(profile.aliases ?? [], alias.id),
                }
              : profile,
          ),
        );
        setMessage(`已刪除別名「${alias.alias}」。`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "無法刪除器材別名。");
      }
    });
  }

  async function loadLegacyCandidates(equipmentProfileId: string) {
    setSelectedEquipmentId(equipmentProfileId);
    setSelectedSetIds([]);
    setError("");

    try {
      const response = await fetch(
        `/api/equipment-profiles/${equipmentProfileId}/legacy-candidates?limit=50`,
        { cache: "no-store" },
      );
      const data = await readJson<LegacyCandidatesResponse>(response);
      setPersisted(data.persisted);
      setLegacyCandidates(data.candidates);
    } catch (err) {
      setError(err instanceof Error ? err.message : "無法載入舊紀錄候選。");
    }
  }

  async function linkSelectedSets() {
    if (!selectedEquipmentId || selectedSetIds.length === 0) return;

    await runMutation(async () => {
      try {
        const response = await fetch(
          `/api/equipment-profiles/${selectedEquipmentId}/link-training-sets`,
          {
            method: "POST",
            body: JSON.stringify({ trainingSetIds: selectedSetIds }),
            headers: { "content-type": "application/json" },
          },
        );
        const data = await readJson<LinkResponse>(response);
        setPersisted(data.persisted);
        setMessage(`已連結 ${data.linkedCount} 筆舊訓練組數，歷史快照未改寫。`);
        await loadLegacyCandidates(selectedEquipmentId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "無法連結舊紀錄。");
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="premium-hero p-5 sm:p-7">
        <SectionHeader
          eyebrow="Training profiles"
          title={mode === "gyms" ? "我的健身房" : "我的器材"}
          description="建立固定的健身房與器材設定檔，讓同一台器材能用固定 ID 追蹤；系統不會自動模糊合併。"
          action={
            <PremiumButton
              type="button"
              icon={RefreshCcw}
              variant="secondary"
              onClick={loadData}
              disabled={isLoading || isMutating}
            >
              重新整理
            </PremiumButton>
          }
        />
      </section>

      {!persisted ? (
        <div className="rounded-[var(--chx-radius-card)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          Demo Mode：目前資料只供展示，不會寫入正式資料庫。
        </div>
      ) : null}

      {message ? (
        <div role="status" className="rounded-[var(--chx-radius-card)] border border-teal-100 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-800">
          {message}
        </div>
      ) : null}

      {error ? (
        <div role="alert" className="rounded-[var(--chx-radius-card)] border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <SectionCard title="新增健身房" eyebrow="Gym">
          <form className="space-y-4" onSubmit={createGym}>
            <div className="field-stack">
              <label htmlFor="gym-name">名稱</label>
              <input id="gym-name" name="name" required maxLength={120} placeholder="例如：World Gym" />
            </div>
            <div className="field-stack">
              <label htmlFor="gym-branch">分店</label>
              <input id="gym-branch" name="branchName" maxLength={120} placeholder="例如：信義店" />
            </div>
            <div className="field-stack">
              <label htmlFor="gym-location">位置備註</label>
              <input id="gym-location" name="locationText" maxLength={300} placeholder="樓層、區域或其他備註" />
            </div>
            <PremiumButton type="submit" icon={Plus} disabled={isMutating}>
              {isMutating ? "處理中…" : "新增健身房"}
            </PremiumButton>
          </form>
        </SectionCard>

        {mode === "equipment" ? (
          <SectionCard title="新增器材" eyebrow="Equipment">
            <form className="space-y-4" onSubmit={createEquipment}>
              <EquipmentFields prefix="new-equipment" gyms={gyms} />
              <PremiumButton type="submit" icon={Plus} disabled={isMutating}>
                {isMutating ? "處理中…" : "新增器材"}
              </PremiumButton>
            </form>
          </SectionCard>
        ) : null}
      </div>

      <SectionCard title="健身房列表" eyebrow="Gyms">
        {gyms.length === 0 ? (
          <EmptyState icon={MapPin} title="尚無健身房設定" description="先新增常去的健身房，之後器材就能依場館分開追蹤。" />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {gyms.map((gym) => (
              <article key={gym.id} className="rounded-[var(--chx-radius-card)] border border-[var(--chx-line)] bg-white p-4">
                {editingGymId === gym.id ? (
                  <form className="space-y-4" onSubmit={(event) => updateGym(event, gym.id)}>
                    <div className="field-stack">
                      <label htmlFor={`edit-gym-name-${gym.id}`}>名稱</label>
                      <input id={`edit-gym-name-${gym.id}`} name="name" required maxLength={120} defaultValue={gym.name} />
                    </div>
                    <div className="field-stack">
                      <label htmlFor={`edit-gym-branch-${gym.id}`}>分店</label>
                      <input id={`edit-gym-branch-${gym.id}`} name="branchName" maxLength={120} defaultValue={gym.branchName ?? ""} />
                    </div>
                    <div className="field-stack">
                      <label htmlFor={`edit-gym-location-${gym.id}`}>位置備註</label>
                      <input id={`edit-gym-location-${gym.id}`} name="locationText" maxLength={300} defaultValue={gym.locationText ?? ""} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <PremiumButton type="submit" icon={Save} disabled={isMutating}>
                        儲存
                      </PremiumButton>
                      <PremiumButton type="button" icon={X} variant="secondary" disabled={isMutating} onClick={() => setEditingGymId("")}>
                        取消
                      </PremiumButton>
                    </div>
                  </form>
                ) : (
                  <>
                    <p className="break-words font-semibold text-slate-950">{formatGymName(gym)}</p>
                    <p className="mt-1 break-words text-sm text-slate-600">{gym.locationText || "未記錄位置備註"}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <PremiumButton type="button" icon={Pencil} variant="soft" disabled={isMutating} onClick={() => setEditingGymId(gym.id)}>
                        編輯
                      </PremiumButton>
                      <PremiumButton type="button" icon={Trash2} variant="ghost" disabled={isMutating} onClick={() => deleteGym(gym.id)}>
                        刪除
                      </PremiumButton>
                    </div>
                  </>
                )}
              </article>
            ))}
          </div>
        )}
      </SectionCard>

      {mode === "equipment" ? (
        <SectionCard title="器材列表" eyebrow="Equipment">
          {equipmentProfiles.length === 0 ? (
            <EmptyState icon={Dumbbell} title="尚無器材設定" description="新增器材後，訓練頁可以用固定 ID 追蹤上次重量。" />
          ) : (
            <div className="space-y-3">
              {equipmentProfiles.map((profile) => (
                <article key={profile.id} className="rounded-[var(--chx-radius-card)] border border-[var(--chx-line)] bg-white p-4">
                  {editingEquipmentId === profile.id ? (
                    <form className="space-y-4" onSubmit={(event) => updateEquipment(event, profile)}>
                      <EquipmentFields prefix={`edit-equipment-${profile.id}`} gyms={gyms} profile={profile} />
                      <div className="flex flex-wrap gap-2">
                        <PremiumButton type="submit" icon={Save} disabled={isMutating}>儲存</PremiumButton>
                        <PremiumButton type="button" icon={X} variant="secondary" disabled={isMutating} onClick={() => setEditingEquipmentId("")}>取消</PremiumButton>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="break-words">
                          <p className="font-semibold text-slate-950">{formatEquipment(profile)}</p>
                          <p className="mt-1 text-sm text-slate-600">
                            {profile.gym ? formatGymName(profile.gym) : "未指定健身房"} · 預設 {profile.defaultMovementName || "未設定動作"} · {profile.defaultWeightBasis || "未設定重量記法"}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {[profile.seatSetting, profile.padSetting, profile.handleSetting].filter(Boolean).join(" · ") || "未記錄座椅/墊片/握把設定"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <PremiumButton type="button" icon={Pencil} variant="soft" disabled={isMutating} onClick={() => setEditingEquipmentId(profile.id)}>編輯</PremiumButton>
                          <PremiumButton type="button" icon={Link2} variant="soft" disabled={isMutating} onClick={() => loadLegacyCandidates(profile.id)}>舊紀錄候選</PremiumButton>
                          <PremiumButton type="button" icon={Trash2} variant="ghost" disabled={isMutating} onClick={() => deleteEquipment(profile.id)}>刪除</PremiumButton>
                        </div>
                      </div>

                      <div className="mt-4 border-t border-[var(--chx-line)] pt-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                          <Tag size={16} aria-hidden="true" />
                          別名
                        </div>
                        {(profile.aliases ?? []).length > 0 ? (
                          <ul className="mt-2 flex flex-wrap gap-2" aria-label={`${profile.canonicalName} 別名清單`}>
                            {(profile.aliases ?? []).map((alias) => (
                              <li key={alias.id} className="flex max-w-full items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700">
                                <span className="break-all">{alias.alias}</span>
                                <button type="button" className="rounded-full p-1 text-slate-500 hover:bg-white hover:text-rose-700 disabled:opacity-50" disabled={isMutating} aria-label={`刪除別名 ${alias.alias}`} onClick={() => deleteAlias(alias)}>
                                  <X size={14} aria-hidden="true" />
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-sm text-slate-500">尚未設定別名；系統不會自動建立。</p>
                        )}
                        <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={(event) => createAlias(event, profile.id)}>
                          <label className="sr-only" htmlFor={`alias-${profile.id}`}>新增 {profile.canonicalName} 的別名</label>
                          <input id={`alias-${profile.id}`} name="alias" required maxLength={160} className="flex-1" placeholder="輸入精確別名" />
                          <PremiumButton type="submit" icon={Plus} variant="secondary" disabled={isMutating}>新增別名</PremiumButton>
                        </form>
                      </div>
                    </>
                  )}
                </article>
              ))}
            </div>
          )}
        </SectionCard>
      ) : null}

      {mode === "equipment" && selectedEquipment ? (
        <SectionCard title="手動連結舊紀錄" eyebrow="Legacy">
          <p className="mb-4 text-sm leading-6 text-slate-600">
            目前選擇：{formatEquipment(selectedEquipment)}。只會設定 equipment_profile_id，不會改寫舊的品牌、型號、重量、次數或 RPE。
          </p>
          {legacyCandidates.length === 0 ? (
            <EmptyState icon={Link2} title="尚無候選舊紀錄" description="只有未連結且可能符合文字快照的訓練組數會出現在這裡。" />
          ) : (
            <div className="space-y-3">
              {legacyCandidates.map((candidate) => {
                const checked = selectedSetIds.includes(candidate.trainingSet.id);
                return (
                  <label key={candidate.trainingSet.id} className="flex items-start gap-3 rounded-[var(--chx-radius-card)] border border-[var(--chx-line)] bg-white p-3 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={isMutating}
                      onChange={(event) =>
                        setSelectedSetIds((current) =>
                          event.target.checked
                            ? [...current, candidate.trainingSet.id]
                            : current.filter((id) => id !== candidate.trainingSet.id),
                        )
                      }
                    />
                    <span className="break-words">{formatSet(candidate)}</span>
                  </label>
                );
              })}
              <PremiumButton type="button" icon={Link2} disabled={isMutating || selectedSetIds.length === 0} onClick={linkSelectedSets}>
                連結選取紀錄
              </PremiumButton>
            </div>
          )}
        </SectionCard>
      ) : null}
    </div>
  );
}

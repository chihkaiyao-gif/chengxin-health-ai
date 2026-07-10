"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  HeartPulse,
  Loader2,
} from "lucide-react";
import { MedicalNotice } from "@/components/medical-notice";
import { SectionCard } from "@/components/section-card";
import type { AssessmentResult } from "@/lib/types";

type WizardState = {
  age: string;
  sex: string;
  heightCm: string;
  weightKg: string;
  waistCm: string;
  occupation: string;
  dailyRoutine: string;
  goals: string[];
  medicalHistory: string[];
  medications: string[];
  physicianClearedExercise: boolean;
  exerciseExperience: string;
  availableEquipment: string[];
  bodyLimitations: string[];
  diet: {
    eatingOutRatio: string;
    sugaryDrinks: string;
    lateNightSnack: string;
    alcohol: string;
    proteinIntake: string;
  };
  sleep: {
    sleepHours: string;
    bedtime: string;
    quality: string;
    snoring: boolean;
  };
  riskSelfAssessment: string[];
  privacyConsent: boolean;
  dataUseConsent: boolean;
};

const initialState: WizardState = {
  age: "",
  sex: "prefer_not_to_say",
  heightCm: "",
  weightKg: "",
  waistCm: "",
  occupation: "",
  dailyRoutine: "",
  goals: [],
  medicalHistory: [],
  medications: ["none"],
  physicianClearedExercise: false,
  exerciseExperience: "none",
  availableEquipment: ["none"],
  bodyLimitations: ["none"],
  diet: {
    eatingOutRatio: "MEDIUM",
    sugaryDrinks: "RARE",
    lateNightSnack: "RARE",
    alcohol: "NONE",
    proteinIntake: "UNKNOWN",
  },
  sleep: {
    sleepHours: "",
    bedtime: "",
    quality: "FAIR",
    snoring: false,
  },
  riskSelfAssessment: ["none"],
  privacyConsent: false,
  dataUseConsent: false,
};

const steps = [
  "基本資料",
  "目標",
  "疾病與藥物",
  "運動與限制",
  "飲食與睡眠",
  "風險與送出",
];

const goalOptions = [
  ["weight_loss", "減重"],
  ["muscle_gain", "增肌"],
  ["blood_sugar_control", "控制血糖"],
  ["body_fat_improvement", "改善體脂"],
  ["health_maintenance", "維持健康"],
  ["senior_strength", "銀髮肌力"],
];

const medicalHistoryOptions = [
  ["diabetes", "糖尿病"],
  ["hypertension", "高血壓"],
  ["hyperlipidemia", "高血脂"],
  ["heart_disease", "心臟病"],
  ["stroke", "中風"],
  ["kidney_disease", "腎臟病"],
  ["liver_disease", "肝病"],
  ["knee_osteoarthritis", "膝蓋退化"],
  ["lumbar_spine_problem", "腰椎問題"],
  ["cancer_history", "癌症病史"],
];

const medicationOptions = [
  ["none", "未使用上述藥物"],
  ["glp1", "GLP-1"],
  ["mounjaro", "猛健樂"],
  ["liraglutide_pen", "瘦瘦筆"],
  ["glucose_lowering", "降血糖藥"],
  ["blood_pressure_lowering", "降血壓藥"],
];

const equipmentOptions = [
  ["none", "無器材"],
  ["resistance_band", "彈力帶"],
  ["dumbbell", "啞鈴"],
  ["gym", "健身房"],
  ["treadmill", "跑步機"],
  ["bike", "腳踏車"],
];

const limitationOptions = [
  ["none", "無明顯限制"],
  ["knee_pain", "膝蓋痛"],
  ["low_back_pain", "腰痛"],
  ["shoulder_pain", "肩痛"],
  ["poor_balance", "平衡差"],
  ["recent_fall", "曾跌倒"],
  ["doctor_restricted_exercise", "醫師限制運動"],
];

const riskOptions = [
  ["none", "以上皆無"],
  ["chest_pain", "最近胸痛"],
  ["abnormal_dyspnea_exercise", "運動時喘到異常"],
  ["syncope", "暈厥"],
  ["severe_hypoglycemia", "近期嚴重低血糖感"],
  ["severe_vomiting_dehydration", "嚴重嘔吐或脫水"],
];

export function AssessmentWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState<WizardState>(initialState);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const progress = useMemo(
    () => Math.round(((currentStep + 1) / steps.length) * 100),
    [currentStep],
  );

  function updateField<K extends keyof WizardState>(
    field: K,
    value: WizardState[K],
  ) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  function updateDiet(field: keyof WizardState["diet"], value: string) {
    setForm((previous) => ({
      ...previous,
      diet: { ...previous.diet, [field]: value },
    }));
  }

  function updateSleep(
    field: keyof WizardState["sleep"],
    value: string | boolean,
  ) {
    setForm((previous) => ({
      ...previous,
      sleep: { ...previous.sleep, [field]: value },
    }));
  }

  function toggleArray(field: keyof WizardState, value: string) {
    setForm((previous) => {
      const current = previous[field];

      if (!Array.isArray(current)) {
        return previous;
      }

      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current.filter((item) => item !== "none"), value];

      return {
        ...previous,
        [field]:
          value === "none"
            ? current.includes("none")
              ? []
              : ["none"]
            : next.length > 0
              ? next
              : ["none"],
      };
    });
  }

  async function submitAssessment() {
    setIsSubmitting(true);
    setError(null);

    const payload = {
      ...form,
      age: form.age,
      heightCm: form.heightCm,
      weightKg: form.weightKg,
      waistCm: form.waistCm ? form.waistCm : undefined,
      medicalHistory: form.medicalHistory.filter((item) => item !== "none"),
      medications: form.medications,
      availableEquipment: form.availableEquipment,
      bodyLimitations: form.bodyLimitations,
      riskSelfAssessment: form.riskSelfAssessment,
    };

    try {
      const response = await fetch("/api/health-assessments/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();

      if (!response.ok) {
        setError(body.error?.message || "評估送出失敗，請檢查欄位。");
        return;
      }

      setResult(body.data.result);
    } catch {
      setError("網路連線異常，請稍後再試。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-teal-700">初始健康評估</p>
        <h1 className="mt-1 text-3xl font-semibold text-slate-950">
          AI 初始健康評估與分流
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          完成後系統會分流成適合的照護路徑；這不是診斷，也不會自動調整藥物。
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-4">
            <p className="text-sm font-semibold text-slate-900">完成度 {progress}%</p>
            <div className="mt-2 h-2 rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-teal-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <nav aria-label="Assessment steps" className="space-y-2">
            {steps.map((step, index) => (
              <button
                key={step}
                type="button"
                onClick={() => setCurrentStep(index)}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium ${
                  currentStep === index
                    ? "bg-teal-50 text-teal-800"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {index < currentStep ? (
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full border border-current text-[10px]">
                    {index + 1}
                  </span>
                )}
                {step}
              </button>
            ))}
          </nav>
        </aside>

        <div className="space-y-4">
          {currentStep === 0 ? (
            <SectionCard title="基本資料" eyebrow="Profile">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="年齡" value={form.age} type="number" onChange={(value) => updateField("age", value)} />
                <Select label="性別" value={form.sex} onChange={(value) => updateField("sex", value)} options={[
                  ["female", "女性"],
                  ["male", "男性"],
                  ["other", "其他"],
                  ["prefer_not_to_say", "不透露"],
                ]} />
                <Input label="身高 cm" value={form.heightCm} type="number" onChange={(value) => updateField("heightCm", value)} />
                <Input label="體重 kg" value={form.weightKg} type="number" onChange={(value) => updateField("weightKg", value)} />
                <Input label="腰圍 cm" value={form.waistCm} type="number" onChange={(value) => updateField("waistCm", value)} />
                <Input label="職業" value={form.occupation} onChange={(value) => updateField("occupation", value)} />
                <div className="field-stack sm:col-span-2">
                  <label htmlFor="dailyRoutine">作息</label>
                  <textarea
                    id="dailyRoutine"
                    rows={4}
                    value={form.dailyRoutine}
                    onChange={(event) => updateField("dailyRoutine", event.target.value)}
                    placeholder="例如：久坐、輪班、照顧家人、每日步行量"
                  />
                </div>
              </div>
            </SectionCard>
          ) : null}

          {currentStep === 1 ? (
            <SectionCard title="目標" eyebrow="Goals">
              <CheckboxGrid
                options={goalOptions}
                values={form.goals}
                onToggle={(value) => toggleArray("goals", value)}
              />
            </SectionCard>
          ) : null}

          {currentStep === 2 ? (
            <div className="space-y-4">
              <SectionCard title="疾病史" eyebrow="Medical history">
                <CheckboxGrid
                  options={medicalHistoryOptions}
                  values={form.medicalHistory}
                  onToggle={(value) => toggleArray("medicalHistory", value)}
                />
              </SectionCard>
              <SectionCard title="藥物" eyebrow="Medication">
                <CheckboxGrid
                  options={medicationOptions}
                  values={form.medications}
                  onToggle={(value) => toggleArray("medications", value)}
                />
                <label className="mt-4 flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  <input
                    className="mt-1 h-4 w-4"
                    type="checkbox"
                    checked={form.physicianClearedExercise}
                    onChange={(event) =>
                      updateField("physicianClearedExercise", event.target.checked)
                    }
                  />
                  <span>若有心臟病或醫療限制，已由醫師允許可開始運動。</span>
                </label>
              </SectionCard>
            </div>
          ) : null}

          {currentStep === 3 ? (
            <div className="space-y-4">
              <SectionCard title="運動經驗" eyebrow="訓練背景">
                <Select
                  label="目前運動程度"
                  value={form.exerciseExperience}
                  onChange={(value) => updateField("exerciseExperience", value)}
                  options={[
                    ["none", "無運動"],
                    ["home_bodyweight", "居家徒手"],
                    ["gym_beginner", "健身房新手"],
                    ["regular_weight_training", "規律重訓"],
                    ["athlete", "運動員"],
                  ]}
                />
              </SectionCard>
              <SectionCard title="可用設備" eyebrow="Equipment">
                <CheckboxGrid
                  options={equipmentOptions}
                  values={form.availableEquipment}
                  onToggle={(value) => toggleArray("availableEquipment", value)}
                />
              </SectionCard>
              <SectionCard title="身體限制" eyebrow="Limitations">
                <CheckboxGrid
                  options={limitationOptions}
                  values={form.bodyLimitations}
                  onToggle={(value) => toggleArray("bodyLimitations", value)}
                />
              </SectionCard>
            </div>
          ) : null}

          {currentStep === 4 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <SectionCard title="飲食習慣" eyebrow="飲食紀錄">
                <div className="grid gap-4">
                  <Select label="外食比例" value={form.diet.eatingOutRatio} onChange={(value) => updateDiet("eatingOutRatio", value)} options={[
                    ["LOW", "低"],
                    ["MEDIUM", "中"],
                    ["HIGH", "高"],
                  ]} />
                  <Select label="手搖飲" value={form.diet.sugaryDrinks} onChange={(value) => updateDiet("sugaryDrinks", value)} options={[
                    ["RARE", "很少"],
                    ["WEEKLY", "每週"],
                    ["DAILY", "每日"],
                  ]} />
                  <Select label="宵夜" value={form.diet.lateNightSnack} onChange={(value) => updateDiet("lateNightSnack", value)} options={[
                    ["RARE", "很少"],
                    ["WEEKLY", "每週"],
                    ["DAILY", "每日"],
                  ]} />
                  <Select label="酒精" value={form.diet.alcohol} onChange={(value) => updateDiet("alcohol", value)} options={[
                    ["NONE", "無"],
                    ["OCCASIONAL", "偶爾"],
                    ["FREQUENT", "頻繁"],
                  ]} />
                  <Select label="蛋白質攝取" value={form.diet.proteinIntake} onChange={(value) => updateDiet("proteinIntake", value)} options={[
                    ["LOW", "偏低"],
                    ["MEDIUM", "普通"],
                    ["HIGH", "充足"],
                    ["UNKNOWN", "不確定"],
                  ]} />
                </div>
              </SectionCard>
              <SectionCard title="睡眠" eyebrow="Sleep">
                <div className="grid gap-4">
                  <Input label="睡眠時間（小時）" value={form.sleep.sleepHours} type="number" onChange={(value) => updateSleep("sleepHours", value)} />
                  <Input label="入睡時間" value={form.sleep.bedtime} placeholder="例如：23:30" onChange={(value) => updateSleep("bedtime", value)} />
                  <Select label="睡眠品質" value={form.sleep.quality} onChange={(value) => updateSleep("quality", value)} options={[
                    ["POOR", "差"],
                    ["FAIR", "普通"],
                    ["GOOD", "好"],
                  ]} />
                  <label className="flex items-center gap-3 text-sm text-slate-700">
                    <input
                      className="h-4 w-4"
                      type="checkbox"
                      checked={form.sleep.snoring}
                      onChange={(event) => updateSleep("snoring", event.target.checked)}
                    />
                    有明顯打呼
                  </label>
                </div>
              </SectionCard>
            </div>
          ) : null}

          {currentStep === 5 ? (
            <div className="space-y-4">
              <SectionCard title="風險自評" eyebrow="Safety screen">
                <CheckboxGrid
                  options={riskOptions}
                  values={form.riskSelfAssessment}
                  onToggle={(value) => toggleArray("riskSelfAssessment", value)}
                />
                <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
                  任一高風險項目會標記為 high_risk_medical_review，系統暫不建議直接開始運動計畫，請先由醫師或專業人員評估。
                </div>
              </SectionCard>
              <SectionCard title="同意" eyebrow="Consent">
                <div className="space-y-3 text-sm text-slate-700">
                  <label className="flex items-start gap-3">
                    <input
                      className="mt-1 h-4 w-4"
                      type="checkbox"
                      checked={form.privacyConsent}
                      onChange={(event) => updateField("privacyConsent", event.target.checked)}
                    />
                    <span>我同意隱私權政策與健康資料保存。</span>
                  </label>
                  <label className="flex items-start gap-3">
                    <input
                      className="mt-1 h-4 w-4"
                      type="checkbox"
                      checked={form.dataUseConsent}
                      onChange={(event) => updateField("dataUseConsent", event.target.checked)}
                    />
                    <span>我同意 AI 用於紀錄、提醒、趨勢分析與回診溝通輔助。</span>
                  </label>
                </div>
              </SectionCard>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          ) : null}

          {result ? <ResultPanel result={result} /> : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <button
              type="button"
              className="btn-secondary"
              disabled={currentStep === 0}
              onClick={() => setCurrentStep((step) => Math.max(step - 1, 0))}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              上一步
            </button>
            {currentStep < steps.length - 1 ? (
              <button
                type="button"
                className="btn-primary"
                onClick={() =>
                  setCurrentStep((step) => Math.min(step + 1, steps.length - 1))
                }
              >
                下一步
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary"
                disabled={isSubmitting}
                onClick={submitAssessment}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                )}
                完成評估並分流
              </button>
            )}
          </div>

          <MedicalNotice />
        </div>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  const id = label.replace(/\s/g, "-");

  return (
    <div className="field-stack">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[][];
}) {
  const id = label.replace(/\s/g, "-");

  return (
    <div className="field-stack">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map(([optionValue, labelText]) => (
          <option key={optionValue} value={optionValue}>
            {labelText}
          </option>
        ))}
      </select>
    </div>
  );
}

function CheckboxGrid({
  options,
  values,
  onToggle,
}: {
  options: string[][];
  values: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {options.map(([value, label]) => (
        <label
          key={value}
          className="flex min-h-12 items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
        >
          <input
            className="h-4 w-4"
            type="checkbox"
            checked={values.includes(value)}
            onChange={() => onToggle(value)}
          />
          {label}
        </label>
      ))}
    </div>
  );
}

function ResultPanel({ result }: { result: AssessmentResult }) {
  return (
    <section className="rounded-lg border border-teal-200 bg-teal-50 p-5">
      <div className="flex items-start gap-3">
        {result.needsMedicalReview ? (
          <AlertTriangle className="mt-1 h-5 w-5 text-amber-700" aria-hidden="true" />
        ) : (
          <HeartPulse className="mt-1 h-5 w-5 text-teal-700" aria-hidden="true" />
        )}
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-teal-900">分流結果</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">
              {result.personaLabel}
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-700">
              {result.recommendedPath}
            </p>
          </div>
          <p className="rounded-md bg-white p-3 text-sm leading-6 text-slate-700">
            {result.safetyMessage}
          </p>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <p>
              <span className="font-semibold">運動：</span>
              {result.todayRecommendations.exercise}
            </p>
            <p>
              <span className="font-semibold">飲食：</span>
              {result.todayRecommendations.nutrition}
            </p>
            <p>
              <span className="font-semibold">用藥：</span>
              {result.todayRecommendations.medication}
            </p>
            <p>
              <span className="font-semibold">回診：</span>
              {result.todayRecommendations.followUp}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

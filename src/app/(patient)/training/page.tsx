import { Dumbbell, Save, Timer, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MedicalNotice } from "@/components/medical-notice";
import {
  PremiumButton,
  SectionHeader,
  StatCard,
  WorkoutCard,
} from "@/components/premium-ui";
import { SectionCard } from "@/components/section-card";

const exercises = [
  {
    name: "坐站訓練",
    target: "3 組 x 10 次",
    cue: "膝蓋穩定，站起時吐氣。",
    progress: 67,
  },
  {
    name: "啞鈴划船",
    target: "3 組 x 12 次",
    cue: "背部出力，避免聳肩。",
    progress: 33,
  },
  {
    name: "低衝擊步行",
    target: "20 分鐘",
    cue: "可說話但微喘的強度。",
    progress: 40,
  },
];

export default function TrainingPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <section className="premium-hero p-5 sm:p-7">
          <SectionHeader
            eyebrow="今日訓練"
            title="今天的訓練，穩穩完成就好"
            description="用大按鈕和快速輸入記錄重量、次數與 RPE。若有胸痛、異常喘、暈厥或醫師限制運動，請先由醫師或專業人員評估。"
            action={
              <PremiumButton href="/assessment" variant="secondary" icon={TrendingUp}>
                更新分流
              </PremiumButton>
            }
          />
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            icon={Dumbbell}
            label="今日課表"
            value="低衝擊肌力"
            helper="適合 MVP 分流後的安全起步。"
          />
          <StatCard
            icon={Timer}
            label="預計時間"
            value="35"
            unit="分鐘"
            helper="含暖身、主訓練與收操。"
            tone="blue"
          />
          <StatCard
            icon={TrendingUp}
            label="完成進度"
            value="47"
            unit="%"
            helper="完成組數會用進度條呈現。"
            tone="emerald"
          />
        </div>

        <form
          action="/api/training-logs"
          method="post"
          className="grid gap-5 xl:grid-cols-[1fr_0.82fr]"
        >
          <SectionCard title="今日課表卡片" eyebrow="訓練計畫">
            <div className="space-y-4">
              {exercises.map((exercise) => (
                <WorkoutCard
                  key={exercise.name}
                  title={exercise.name}
                  subtitle={`${exercise.target}。${exercise.cue}`}
                  progress={exercise.progress}
                >
                  <div className="grid gap-3 sm:grid-cols-3">
                    <QuickInput label="重量 kg" placeholder="0" />
                    <QuickInput label="次數" placeholder="10" />
                    <QuickInput label="RPE" placeholder="6" />
                  </div>
                </WorkoutCard>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="儲存訓練紀錄" eyebrow="病人紀錄">
            <div className="space-y-4">
              <div className="field-stack">
                <label htmlFor="trainedOn">日期</label>
                <input
                  id="trainedOn"
                  name="trainedOn"
                  type="date"
                  defaultValue={todayDateInput()}
                  required
                />
              </div>
              <div className="field-stack">
                <label htmlFor="activityType">訓練類型</label>
                <input
                  id="activityType"
                  name="activityType"
                  defaultValue="低衝擊肌力 + 步行"
                  placeholder="重訓、有氧、步行、伸展"
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="field-stack">
                  <label htmlFor="durationMinutes">時間</label>
                  <input
                    id="durationMinutes"
                    name="durationMinutes"
                    type="number"
                    min="1"
                    max="600"
                    defaultValue="35"
                    required
                  />
                </div>
                <div className="field-stack">
                  <label htmlFor="intensity">強度</label>
                  <select id="intensity" name="intensity" defaultValue="MEDIUM">
                    <option value="LOW">低</option>
                    <option value="MEDIUM">中</option>
                    <option value="HIGH">高</option>
                  </select>
                </div>
              </div>
              <div className="field-stack">
                <label htmlFor="notes">備註</label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={4}
                  placeholder="例如：坐站 3 組完成、啞鈴 5kg、RPE 6、膝蓋無不適。"
                />
              </div>
              <button type="submit" className="btn-primary w-full">
                <Save className="h-4 w-4" aria-hidden="true" />
                儲存訓練
              </button>
            </div>
          </SectionCard>
        </form>

        <MedicalNotice compact />
      </div>
    </AppShell>
  );
}

function QuickInput({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <div className="field-stack">
      <label>{label}</label>
      <input inputMode="decimal" placeholder={placeholder} aria-label={label} />
    </div>
  );
}

function todayDateInput() {
  const date = new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

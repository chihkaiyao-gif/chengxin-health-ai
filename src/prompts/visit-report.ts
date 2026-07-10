export const visitReportPrompt = {
  version: "2026-07-10.v1",
  purpose: "為診所產生近 30 天回診溝通摘要，協助醫師與診所人員快速掌握趨勢。",
  systemPrompt:
    "你是 Chengxin Health AI 的診所回診摘要助理。請使用繁體中文，語氣專業、客觀、保守。你不診斷、不治療、不自動調整藥物。",
  developerPrompt: [
    "輸出只能是 JSON。",
    "重點整理近 30 天體重、骨骼肌、體脂率、飲食蛋白質、運動執行率、GLP-1 依從性、副作用與需要醫師關注事項。",
    "所有藥物、劑量與副作用相關內容都必須包含「請由醫師評估」。",
    "不要給診斷名稱，不要建議調整劑量，不要提供醫療處置。",
    "把內容寫成診所可用於回診溝通的摘要與提問重點。",
  ].join("\n"),
  outputSchema: {
    type: "object",
    required: [
      "weightChange30d",
      "skeletalMuscleChange",
      "bodyFatPercentageChange",
      "proteinTargetStatus",
      "exerciseExecutionRate",
      "glp1Adherence",
      "sideEffectSummary",
      "physicianAttentionItems",
      "visitCommunicationPoints",
      "safetyNotice",
    ],
    additionalProperties: false,
  },
  safetyRules: [
    "不診斷。",
    "不自動調藥。",
    "劑量調整一律顯示請由醫師評估。",
    "只做回診溝通輔助。",
  ],
  exampleInput: {
    period: "近 30 天",
    weightTrend: "下降 1.2 kg",
    proteinTargetRate: 72,
  },
  exampleOutput: {
    weightChange30d: "近 30 天體重約下降 1.2 kg，可作為回診溝通趨勢。",
    skeletalMuscleChange: "骨骼肌量變化不明顯，建議搭配蛋白質與肌力紀錄一起看。",
    bodyFatPercentageChange: "體脂率略有下降，仍需搭配 InBody 原始報告確認。",
    proteinTargetStatus: "蛋白質達標率約 72%，可討論是否需要更穩定的蛋白質安排。",
    exerciseExecutionRate: "運動執行率中等，建議回診時確認可持續的頻率。",
    glp1Adherence: "GLP-1 紀錄大致穩定，施打與劑量相關內容請由醫師評估。",
    sideEffectSummary: "近期副作用未見高警示；若噁心、嘔吐或脫水疑慮增加，請由醫師評估。",
    physicianAttentionItems: ["請確認副作用與飲食攝取是否影響用藥耐受性。"],
    visitCommunicationPoints: ["討論蛋白質攝取與肌肉保留策略。"],
    safetyNotice: "本報告僅供紀錄、趨勢追蹤與回診溝通輔助，不提供診斷，不自動調整藥物；所有醫療與用藥內容請由醫師評估。",
  },
} as const;

export function buildVisitReportPromptInput(source: unknown) {
  return [
    "請根據以下病人結構化資料，產生診所回診摘要。",
    "請回傳符合 schema 的 JSON，所有文字使用繁體中文。",
    JSON.stringify(source),
  ].join("\n");
}

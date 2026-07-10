import type {
  AssessmentPersona,
  AssessmentResult,
  AssessmentRiskFlag,
} from "@/lib/types";
import type { AssessmentWizardInput } from "@/lib/validation";

export const personaLabels: Record<AssessmentPersona, string> = {
  fitness_beginner: "健身初學者",
  gym_training: "健身房訓練",
  home_training: "居家訓練",
  glp1_weight_loss: "GLP-1 減重照護",
  chronic_disease: "慢性病安全管理",
  senior_frailty: "銀髮肌力與防跌",
  high_risk_medical_review: "高風險，需醫療評估",
};

export const riskFlagLabels: Record<AssessmentRiskFlag, string> = {
  chest_pain: "近期胸痛",
  abnormal_dyspnea_exercise: "運動時異常喘",
  syncope: "暈厥",
  severe_hypoglycemia: "近期嚴重低血糖感",
  severe_vomiting_dehydration: "嚴重嘔吐或脫水",
  heart_disease_no_clearance: "心臟病且未經醫師允許運動",
  age_70_recent_fall: "70 歲以上且近期跌倒",
};

const defaultSafetyMessage =
  "本系統不提供診斷、不自動調整藥物劑量；所有藥物與醫療相關內容請由醫師評估。";

const highRiskSafetyMessage =
  "系統暫不建議直接開始運動計畫，請先由醫師或專業人員評估。";

const chronicHistory = new Set([
  "diabetes",
  "hypertension",
  "hyperlipidemia",
  "heart_disease",
  "stroke",
  "kidney_disease",
  "liver_disease",
]);

function hasAny<T extends string>(values: T[], targets: T[]) {
  return targets.some((target) => values.includes(target));
}

export function computeAssessmentResult(
  answers: AssessmentWizardInput,
): AssessmentResult {
  const riskFlags: AssessmentRiskFlag[] = [];

  if (answers.riskSelfAssessment.includes("chest_pain")) {
    riskFlags.push("chest_pain");
  }

  if (answers.riskSelfAssessment.includes("abnormal_dyspnea_exercise")) {
    riskFlags.push("abnormal_dyspnea_exercise");
  }

  if (answers.riskSelfAssessment.includes("syncope")) {
    riskFlags.push("syncope");
  }

  if (answers.riskSelfAssessment.includes("severe_hypoglycemia")) {
    riskFlags.push("severe_hypoglycemia");
  }

  if (answers.riskSelfAssessment.includes("severe_vomiting_dehydration")) {
    riskFlags.push("severe_vomiting_dehydration");
  }

  if (
    answers.medicalHistory.includes("heart_disease") &&
    !answers.physicianClearedExercise
  ) {
    riskFlags.push("heart_disease_no_clearance");
  }

  if (answers.age >= 70 && answers.bodyLimitations.includes("recent_fall")) {
    riskFlags.push("age_70_recent_fall");
  }

  const hasHighRisk = riskFlags.length > 0;
  const hasGlp1 =
    answers.medications.includes("glp1") ||
    answers.medications.includes("mounjaro") ||
    answers.medications.includes("liraglutide_pen");
  const hasChronicDisease = answers.medicalHistory.some((item) =>
    chronicHistory.has(item),
  );
  const hasGymAccess = answers.availableEquipment.includes("gym");
  const hasHomeEquipment = hasAny(answers.availableEquipment, [
    "resistance_band",
    "dumbbell",
    "treadmill",
    "bike",
  ]);
  const isSeniorFrailty =
    answers.age >= 65 ||
    answers.goals.includes("senior_strength") ||
    hasAny(answers.bodyLimitations, ["poor_balance", "recent_fall"]);

  let persona: AssessmentPersona = "fitness_beginner";

  if (hasHighRisk) {
    persona = "high_risk_medical_review";
  } else if (isSeniorFrailty) {
    persona = "senior_frailty";
  } else if (hasGlp1 || answers.goals.includes("weight_loss")) {
    persona = "glp1_weight_loss";
  } else if (hasChronicDisease) {
    persona = "chronic_disease";
  } else if (
    hasGymAccess ||
    answers.exerciseExperience === "regular_weight_training" ||
    answers.exerciseExperience === "athlete"
  ) {
    persona = "gym_training";
  } else if (hasHomeEquipment || answers.exerciseExperience === "home_bodyweight") {
    persona = "home_training";
  }

  return {
    persona,
    personaLabel: personaLabels[persona],
    recommendedPath: getRecommendedPath(persona),
    riskFlags,
    needsMedicalReview: hasHighRisk,
    safetyMessage: hasHighRisk ? highRiskSafetyMessage : defaultSafetyMessage,
    todayRecommendations: getTodayRecommendations(persona),
    completedAt: new Date().toISOString(),
  };
}

export function getRecommendedPath(persona: AssessmentPersona) {
  const paths: Record<AssessmentPersona, string> = {
    fitness_beginner: "從機械式訓練、低強度有氧與基本動作品質開始。",
    gym_training: "可安排健身房器材課表，逐步建立肌力與訓練容量。",
    home_training: "以徒手、彈力帶、啞鈴與步行課表建立規律運動。",
    glp1_weight_loss:
      "強調蛋白質、肌肉保留、低噁心飲食、步行與用藥紀錄；藥物請由醫師評估。",
    chronic_disease:
      "強調血壓與血糖安全提醒、低風險運動、規律紀錄與回診溝通；醫療內容請由醫師評估。",
    senior_frailty: "以坐站訓練、平衡訓練、低衝擊肌力與防跌策略為主。",
    high_risk_medical_review:
      "系統暫不建議直接開始運動計畫，請先由醫師或專業人員評估。",
  };

  return paths[persona];
}

export function getTodayRecommendations(persona: AssessmentPersona) {
  const recommendations: Record<AssessmentPersona, AssessmentResult["todayRecommendations"]> =
    {
      fitness_beginner: {
        exercise: "10-20 分鐘低強度有氧或機械式基礎訓練。",
        nutrition: "每餐先確認蛋白質來源，記錄一張餐點照片。",
        medication: "若有用藥，僅做紀錄；任何調整請由醫師評估。",
        followUp: "完成初始評估後建立第一週追蹤目標。",
      },
      gym_training: {
        exercise: "安排健身房器材訓練，避免一次增加太多重量。",
        nutrition: "訓練日前後補足蛋白質與水分。",
        medication: "用藥照既有醫囑記錄，請由醫師評估。",
        followUp: "下次回診可討論體重、肌肉量與訓練恢復。",
      },
      home_training: {
        exercise: "徒手深蹲替代、彈力帶划船或 15-30 分鐘步行。",
        nutrition: "減少含糖飲料，先建立每日餐點照片紀錄。",
        medication: "用藥僅紀錄不調整，請由醫師評估。",
        followUp: "一週後檢查步行量與疼痛反應。",
      },
      glp1_weight_loss: {
        exercise: "以步行與低強度肌力保留肌肉，避免空腹高強度訓練。",
        nutrition: "優先蛋白質與少量多餐，若噁心則記錄誘發食物。",
        medication: "記錄 GLP-1 使用與副作用；劑量與用藥請由醫師評估。",
        followUp: "回診時帶上體重、飲食、噁心/嘔吐與注射紀錄。",
      },
      chronic_disease: {
        exercise: "低衝擊運動，注意血壓、血糖與不適症狀。",
        nutrition: "記錄外食、含糖飲料與蛋白質攝取。",
        medication: "降血糖或降血壓藥物請依醫囑，任何調整請由醫師評估。",
        followUp: "回診時整理血壓/血糖、運動反應與副作用。",
      },
      senior_frailty: {
        exercise: "坐站訓練、扶椅平衡、低衝擊肌力，避免跌倒風險。",
        nutrition: "每餐補足蛋白質與水分，必要時與專業人員討論。",
        medication: "用藥與頭暈、跌倒風險請由醫師評估。",
        followUp: "追蹤跌倒、平衡、腿力與日常活動能力。",
      },
      high_risk_medical_review: {
        exercise: "暫不建議直接開始運動計畫。",
        nutrition: "維持水分與基本飲食紀錄，嚴重症狀請尋求醫療協助。",
        medication: "所有用藥與症狀請由醫師或專業人員評估。",
        followUp: "請先完成醫師或專業人員評估後再建立運動計畫。",
      },
    };

  return recommendations[persona];
}

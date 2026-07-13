import { z } from "zod";
import { normalizeEquipmentLabel } from "@/lib/normalization";

export const assessmentGoalSchema = z.enum([
  "weight_loss",
  "muscle_gain",
  "blood_sugar_control",
  "body_fat_improvement",
  "health_maintenance",
  "senior_strength",
]);

export const medicalHistorySchema = z.enum([
  "diabetes",
  "hypertension",
  "hyperlipidemia",
  "heart_disease",
  "stroke",
  "kidney_disease",
  "liver_disease",
  "knee_osteoarthritis",
  "lumbar_spine_problem",
  "cancer_history",
]);

export const medicationSchema = z.enum([
  "glp1",
  "mounjaro",
  "liraglutide_pen",
  "glucose_lowering",
  "blood_pressure_lowering",
  "none",
]);

export const exerciseExperienceSchema = z.enum([
  "none",
  "home_bodyweight",
  "gym_beginner",
  "regular_weight_training",
  "athlete",
]);

export const equipmentSchema = z.enum([
  "none",
  "resistance_band",
  "dumbbell",
  "gym",
  "treadmill",
  "bike",
]);

export const bodyLimitationSchema = z.enum([
  "knee_pain",
  "low_back_pain",
  "shoulder_pain",
  "poor_balance",
  "recent_fall",
  "doctor_restricted_exercise",
  "none",
]);

export const riskSelfAssessmentSchema = z.enum([
  "chest_pain",
  "abnormal_dyspnea_exercise",
  "syncope",
  "severe_hypoglycemia",
  "severe_vomiting_dehydration",
  "none",
]);

export const assessmentWizardSchema = z.object({
  age: z.coerce.number().int().min(13).max(110),
  sex: z.enum(["female", "male", "other", "prefer_not_to_say"]),
  heightCm: z.coerce.number().min(80).max(250),
  weightKg: z.coerce.number().min(20).max(350),
  waistCm: z.coerce.number().min(40).max(220).optional(),
  occupation: z.string().max(120).optional(),
  dailyRoutine: z.string().max(500).optional(),
  goals: z.array(assessmentGoalSchema).min(1),
  medicalHistory: z.array(medicalHistorySchema).default([]),
  medications: z.array(medicationSchema).default([]),
  physicianClearedExercise: z.boolean().default(false),
  exerciseExperience: exerciseExperienceSchema,
  availableEquipment: z.array(equipmentSchema).default([]),
  bodyLimitations: z.array(bodyLimitationSchema).default([]),
  diet: z.object({
    eatingOutRatio: z.enum(["LOW", "MEDIUM", "HIGH"]),
    sugaryDrinks: z.enum(["RARE", "WEEKLY", "DAILY"]),
    lateNightSnack: z.enum(["RARE", "WEEKLY", "DAILY"]),
    alcohol: z.enum(["NONE", "OCCASIONAL", "FREQUENT"]),
    proteinIntake: z.enum(["LOW", "MEDIUM", "HIGH", "UNKNOWN"]),
  }),
  sleep: z.object({
    sleepHours: z.coerce.number().min(0).max(16),
    bedtime: z.string().min(1).max(20),
    quality: z.enum(["POOR", "FAIR", "GOOD"]),
    snoring: z.boolean().default(false),
  }),
  riskSelfAssessment: z.array(riskSelfAssessmentSchema).default([]),
  privacyConsent: z.boolean().default(false),
  dataUseConsent: z.boolean().default(false),
});

export type AssessmentWizardInput = z.infer<typeof assessmentWizardSchema>;

export const healthAssessmentSchema = z.object({
  goal: z.string().min(2).max(200),
  heightCm: z.coerce.number().min(80).max(250),
  weightKg: z.coerce.number().min(20).max(350),
  chronicConditions: z.string().max(1000).optional(),
  medications: z.string().max(1000).optional(),
  exerciseLevel: z.enum(["LOW", "MEDIUM", "HIGH"]),
  privacyConsent: z.literal("on"),
  dataUseConsent: z.literal("on"),
});

const blankToUndefined = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
};

const optionalTrimmedString = (maxLength: number) =>
  z.preprocess(
    blankToUndefined,
    z.string().trim().min(1).max(maxLength).optional(),
  );

const optionalUuidString = z.preprocess(
  blankToUndefined,
  z.string().uuid().optional(),
);

const optionalNullableUuidString = z.preprocess(
  blankToUndefined,
  z.string().uuid().nullable().optional(),
);

const optionalIsoDateTime = z.preprocess(
  blankToUndefined,
  z.string().datetime({ offset: true }).optional(),
);

const optionalNullableNumber = (schema: z.ZodNumber) =>
  z.preprocess(blankToUndefined, z.coerce.number().pipe(schema).optional());

const booleanishSchema = z.preprocess((value) => {
  if (value === "true" || value === "1" || value === true) {
    return true;
  }

  if (value === "false" || value === "0" || value === false) {
    return false;
  }

  return value;
}, z.boolean());

const trainingSessionFieldsSchema = z
  .object({
    startedAt: optionalIsoDateTime,
    endedAt: optionalIsoDateTime,
    gymProfileId: optionalNullableUuidString,
    gymName: optionalTrimmedString(160),
    activityType: z
      .preprocess(blankToUndefined, z.string().trim().min(1).max(160).optional())
      .default("strength_training"),
    durationMinutes: z.coerce.number().int().min(1).max(600).optional(),
    intensity: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
    notes: optionalTrimmedString(1000),
  })
  .strict();

const validateSessionTimeOrder = (
  input: { startedAt?: string; endedAt?: string },
  ctx: z.RefinementCtx,
) => {
  if (input.startedAt && input.endedAt) {
    const startedAt = Date.parse(input.startedAt);
    const endedAt = Date.parse(input.endedAt);

    if (Number.isFinite(startedAt) && Number.isFinite(endedAt) && endedAt < startedAt) {
      ctx.addIssue({
        code: "custom",
        path: ["endedAt"],
        message: "endedAt must be after startedAt",
      });
    }
  }
};

export const createTrainingSessionSchema = trainingSessionFieldsSchema.superRefine(
  validateSessionTimeOrder,
);

export const updateTrainingSessionSchema = trainingSessionFieldsSchema
  .partial()
  .superRefine((input, ctx) => {
    validateSessionTimeOrder(input, ctx);
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one field is required",
  });

export const trainingSessionQuerySchema = z
  .object({
    from: z.string().date().optional(),
    to: z.string().date().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    includeSets: booleanishSchema.default(false),
  })
  .strict()
  .superRefine((input, ctx) => {
    if (input.from && input.to && input.from > input.to) {
      ctx.addIssue({
        code: "custom",
        path: ["to"],
        message: "to must be on or after from",
      });
    }
  });

export const trainingHistoryRecentQuerySchema = z
  .object({
    from: z.string().date().optional(),
    to: z.string().date().optional(),
    limit: z.coerce.number().int().min(1).max(20).default(20),
  })
  .strict()
  .superRefine((input, ctx) => {
    if (input.from && input.to && input.from > input.to) {
      ctx.addIssue({
        code: "custom",
        path: ["to"],
        message: "to must be on or after from",
      });
    }
  });

export const trainingLastPerformanceQuerySchema = z
  .object({
    equipmentProfileId: optionalNullableUuidString,
    movementName: z.string().trim().min(1).max(160),
    equipmentBrand: optionalTrimmedString(120),
    equipmentName: optionalTrimmedString(160),
    equipmentModel: optionalTrimmedString(120),
    gymName: optionalTrimmedString(160),
    laterality: z.enum(["bilateral", "unilateral"]),
    weightBasis: z.enum(["total", "per_side", "per_hand"]),
  })
  .strict();

export const trainingSetLateralitySchema = z.enum(["bilateral", "unilateral"]);
export const trainingSetSideSchema = z.enum([
  "both",
  "left",
  "right",
  "alternating",
]);
export const trainingWeightBasisSchema = z.enum([
  "total",
  "per_side",
  "per_hand",
]);
export const trainingSetTypeSchema = z.enum(["warmup", "working", "drop"]);

const rpeSchema = optionalNullableNumber(z.number().min(0).max(10)).refine(
  (value) => value === undefined || Number.isInteger(value * 2),
  "RPE must use 0.5 increments",
);

const trainingSetBaseSchema = z
  .object({
    equipmentProfileId: optionalNullableUuidString,
    exerciseOrder: z.coerce.number().int().min(1).max(1000),
    setNumber: z.coerce.number().int().min(1).max(1000),
    movementName: optionalTrimmedString(160),
    equipmentName: optionalTrimmedString(160),
    equipmentBrand: optionalTrimmedString(120),
    equipmentModel: optionalTrimmedString(120),
    laterality: trainingSetLateralitySchema.optional(),
    side: z.preprocess(blankToUndefined, trainingSetSideSchema.optional()),
    weightKg: optionalNullableNumber(z.number().min(0).max(1500)),
    weightBasis: trainingWeightBasisSchema.optional(),
    reps: z.preprocess(
      blankToUndefined,
      z.coerce.number().int().min(1).max(1000).optional(),
    ),
    setType: trainingSetTypeSchema,
    toFailure: z.boolean().default(false),
    rpe: rpeSchema,
    notes: optionalTrimmedString(1000),
  })
  .strict();

export const createTrainingSetSchema = trainingSetBaseSchema.superRefine(
  (input, ctx) => {
    if (!input.equipmentProfileId && !input.movementName) {
      ctx.addIssue({
        code: "custom",
        path: ["movementName"],
        message: "movementName is required when equipmentProfileId is not provided",
      });
    }

    if (!input.equipmentProfileId && !input.laterality) {
      ctx.addIssue({
        code: "custom",
        path: ["laterality"],
        message: "laterality is required when equipmentProfileId is not provided",
      });
    }

    if (!input.equipmentProfileId && !input.weightBasis) {
      ctx.addIssue({
        code: "custom",
        path: ["weightBasis"],
        message: "weightBasis is required when equipmentProfileId is not provided",
      });
    }

    if (input.laterality === "bilateral" && input.side && input.side !== "both") {
      ctx.addIssue({
        code: "custom",
        path: ["side"],
        message: "Bilateral sets must use side both",
      });
    }

    if (input.laterality === "unilateral" && !input.side) {
      ctx.addIssue({
        code: "custom",
        path: ["side"],
        message: "Unilateral sets require left, right, or alternating side",
      });
    }

    if (input.laterality === "unilateral" && input.side === "both") {
      ctx.addIssue({
        code: "custom",
        path: ["side"],
        message: "Unilateral sets cannot use side both",
      });
    }
  },
);

export const createTrainingSetsBatchSchema = z
  .object({
    sets: z.array(createTrainingSetSchema).min(1).max(100),
  })
  .strict();

export const updateTrainingSetSchema = trainingSetBaseSchema
  .partial()
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one field is required",
  })
  .superRefine((input, ctx) => {
    if (input.side !== undefined && input.laterality === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["laterality"],
        message: "laterality is required when side is updated",
      });
    }

    if (input.laterality === "bilateral" && input.side && input.side !== "both") {
      ctx.addIssue({
        code: "custom",
        path: ["side"],
        message: "Bilateral sets must use side both",
      });
    }

    if (input.laterality === "unilateral" && input.side === "both") {
      ctx.addIssue({
        code: "custom",
        path: ["side"],
        message: "Unilateral sets cannot use side both",
      });
    }

    if (input.laterality === "unilateral" && !input.side) {
      ctx.addIssue({
        code: "custom",
        path: ["side"],
        message: "Unilateral updates require left, right, or alternating side",
      });
    }
  });

const equipmentNormalizedText = (maxLength: number) =>
  z.string().trim().min(1).max(maxLength).transform(normalizeEquipmentLabel);

export const gymProfileInputSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    branchName: optionalTrimmedString(120),
    locationText: optionalTrimmedString(300),
  })
  .strict();

export const updateGymProfileSchema = gymProfileInputSchema.partial().refine(
  (input) => Object.keys(input).length > 0,
  { message: "At least one field is required" },
);

export const gymProfileQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();

export const equipmentProfileInputSchema = z
  .object({
    gymProfileId: optionalNullableUuidString,
    canonicalName: z.string().trim().min(1).max(160),
    brand: optionalTrimmedString(120),
    model: optionalTrimmedString(120),
    defaultMovementName: optionalTrimmedString(160),
    defaultLaterality: trainingSetLateralitySchema.optional(),
    defaultWeightBasis: trainingWeightBasisSchema.optional(),
    seatSetting: optionalTrimmedString(100),
    padSetting: optionalTrimmedString(100),
    handleSetting: optionalTrimmedString(100),
    notes: optionalTrimmedString(1000),
  })
  .strict();

export const updateEquipmentProfileSchema = equipmentProfileInputSchema
  .partial()
  .extend({
    defaultLaterality: trainingSetLateralitySchema.nullable().optional(),
    defaultWeightBasis: trainingWeightBasisSchema.nullable().optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one field is required",
  });

export const equipmentProfileQuerySchema = z
  .object({
    gymProfileId: optionalUuidString,
    includeAliases: booleanishSchema.default(false),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();

export const equipmentAliasInputSchema = z
  .object({
    alias: z.string().trim().min(1).max(160),
  })
  .strict();

export const equipmentResolveQuerySchema = z
  .object({
    alias: z.string().trim().min(1).max(160),
    gymProfileId: optionalUuidString,
  })
  .strict();

export const equipmentLegacyCandidatesQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const linkTrainingSetsToEquipmentSchema = z
  .object({
    trainingSetIds: z
      .array(z.string().uuid())
      .min(1)
      .max(100)
      .refine((ids) => new Set(ids).size === ids.length, {
        message: "Training set IDs must be unique",
      }),
  })
  .strict();

export const normalizedEquipmentLabelSchema = equipmentNormalizedText(160);

export const trainingLogSchema = createTrainingSessionSchema;

export const dailyTaskTypeSchema = z.enum([
  "weight_log",
  "food_photo",
  "protein_goal",
  "hydration_goal",
  "workout",
  "glp1_injection",
  "side_effect_report",
  "inbody_upload",
  "appointment_request",
]);

export const dailyTaskStatusSchema = z.enum([
  "pending",
  "completed",
  "skipped",
]);

export const streakTypeSchema = z.enum([
  "login",
  "food",
  "workout",
  "medication_on_time",
  "daily_record",
]);

export const completeDailyTaskSchema = z.object({
  status: z.literal("completed").default("completed"),
});

export const mealPhotoSchema = z.object({
  eatenAt: z.string().min(1),
  mealType: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]),
  notes: z.string().max(1000).optional(),
});

export const foodMealTypeSchema = z.enum([
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "other",
]);

const nutritionNumber = z.coerce.number().min(0).max(100000);

export const nutritionEstimateSchema = z.object({
  mealName: z.string().min(1).max(160),
  caloriesKcalMin: nutritionNumber.max(5000),
  caloriesKcalMax: nutritionNumber.max(5000),
  caloriesKcal: nutritionNumber.max(5000),
  proteinGMin: nutritionNumber.max(400),
  proteinGMax: nutritionNumber.max(400),
  proteinG: nutritionNumber.max(400),
  fatGMin: nutritionNumber.max(400),
  fatGMax: nutritionNumber.max(400),
  fatG: nutritionNumber.max(400),
  carbsGMin: nutritionNumber.max(800),
  carbsGMax: nutritionNumber.max(800),
  carbsG: nutritionNumber.max(800),
  fiberGMin: nutritionNumber.max(120),
  fiberGMax: nutritionNumber.max(120),
  fiberG: nutritionNumber.max(120),
  sodiumMgMin: nutritionNumber.max(20000),
  sodiumMgMax: nutritionNumber.max(20000),
  sodiumMg: nutritionNumber.max(20000),
  confidenceScore: z.coerce.number().min(0).max(1),
  portionNotes: z.string().min(1).max(600),
  advice: z.string().min(1).max(1200),
  safetyNote: z.string().min(1).max(500),
}).superRefine((value, context) => {
  const ranges: Array<[keyof typeof value, keyof typeof value, string]> = [
    ["caloriesKcalMin", "caloriesKcalMax", "熱量"],
    ["proteinGMin", "proteinGMax", "蛋白質"],
    ["fatGMin", "fatGMax", "脂肪"],
    ["carbsGMin", "carbsGMax", "碳水"],
    ["fiberGMin", "fiberGMax", "纖維"],
    ["sodiumMgMin", "sodiumMgMax", "鈉"],
  ];

  ranges.forEach(([minKey, maxKey, label]) => {
    if (Number(value[minKey]) > Number(value[maxKey])) {
      context.addIssue({
        code: "custom",
        message: `${label}區間下限不可大於上限。`,
        path: [maxKey],
      });
    }
  });
});

export type NutritionEstimateInput = z.infer<typeof nutritionEstimateSchema>;

export const mealPhotoAnalyzeSchema = z.object({
  eatenAt: z.string().min(1),
  mealType: foodMealTypeSchema,
  note: z.string().max(1000).optional(),
});

export const foodLogInputSchema = z.object({
  mealType: foodMealTypeSchema,
  mealName: z.string().min(1).max(160),
  caloriesKcal: nutritionNumber.max(5000),
  proteinG: nutritionNumber.max(400),
  carbsG: nutritionNumber.max(800),
  fatG: nutritionNumber.max(400),
  fiberG: nutritionNumber.max(120),
  sodiumMg: nutritionNumber.max(20000),
  source: z.enum(["ai_photo", "manual"]).default("manual"),
  note: z.string().max(1000).optional(),
  eatenAt: z.string().min(1),
  analysisId: z.string().uuid().optional(),
});

export type FoodLogInput = z.infer<typeof foodLogInputSchema>;

export const inbodyScanSchema = z.object({
  measuredAt: z.string().min(1),
  weightKg: z.coerce.number().min(20).max(350).optional(),
  bodyFatPercent: z.coerce.number().min(1).max(80).optional(),
  skeletalMuscleKg: z.coerce.number().min(1).max(100).optional(),
});

const nullableWeightKg = z.number().min(20).max(350).nullable();
const nullableSkeletalMuscleKg = z.number().min(1).max(100).nullable();
const nullableBodyFatMassKg = z.number().min(0).max(200).nullable();
const nullableBodyFatPercentage = z.number().min(0).max(80).nullable();
const nullableBmi = z.number().min(0).max(100).nullable();
const nullableWaistHipRatio = z.number().min(0).max(2).nullable();
const nullableVisceralFatArea = z.number().min(0).max(500).nullable();
const nullableBasalMetabolicRate = z.number().min(500).max(4000).nullable();
const nullableInbodyScore = z.number().min(0).max(150).nullable();

export const inbodyEstimateSchema = z.object({
  measuredAt: z.string().min(1).max(80),
  weightKg: nullableWeightKg,
  skeletalMuscleKg: nullableSkeletalMuscleKg,
  bodyFatMassKg: nullableBodyFatMassKg,
  bodyFatPercentage: nullableBodyFatPercentage,
  bmi: nullableBmi,
  waistHipRatio: nullableWaistHipRatio,
  visceralFatAreaCm2: nullableVisceralFatArea,
  basalMetabolicRateKcal: nullableBasalMetabolicRate,
  inbodyScore: nullableInbodyScore,
  confidenceScore: z.coerce.number().min(0).max(1),
  needsManualReview: z.boolean().default(false),
  aiSummary: z.string().min(1).max(1200),
  safetyNote: z.string().min(1).max(500),
});

export type InBodyEstimateInput = z.infer<typeof inbodyEstimateSchema>;

export const inbodyPhotoAnalyzeSchema = z.object({
  measuredAt: z.string().min(1),
  note: z.string().max(1000).optional(),
});

function nullableNumberRange(min: number, max: number) {
  return z.preprocess((value) => {
    if (value === "" || value === undefined) {
      return null;
    }

    return value;
  }, z.coerce.number().min(min).max(max).nullable());
}

export const inbodyRecordInputSchema = z.object({
  measuredAt: z.string().min(1),
  weightKg: nullableNumberRange(20, 350),
  skeletalMuscleKg: nullableNumberRange(1, 100),
  bodyFatMassKg: nullableNumberRange(0, 200),
  bodyFatPercentage: nullableNumberRange(0, 80),
  bmi: nullableNumberRange(0, 100),
  waistHipRatio: nullableNumberRange(0, 2),
  visceralFatAreaCm2: nullableNumberRange(0, 500),
  basalMetabolicRateKcal: nullableNumberRange(500, 4000),
  inbodyScore: nullableNumberRange(0, 150),
  note: z.string().max(1000).optional(),
  aiSummary: z.string().max(1200).optional(),
  source: z.enum(["ai_photo", "manual"]).default("manual"),
  analysisId: z.string().uuid().optional(),
});

export type InBodyRecordInput = z.infer<typeof inbodyRecordInputSchema>;

const optionalText = (max = 1000) =>
  z.preprocess((value) => {
    if (value === "" || value === undefined) {
      return undefined;
    }

    return value;
  }, z.string().max(max).optional());

const optionalDate = z.preprocess((value) => {
  if (value === "" || value === undefined) {
    return undefined;
  }

  return value;
}, z.string().date().optional());

const optionalUuid = z.preprocess((value) => {
  if (value === "" || value === undefined) {
    return undefined;
  }

  return value;
}, z.string().uuid().optional());

const checkboxBoolean = z.preprocess((value) => {
  if (value === "on" || value === "true" || value === true) {
    return true;
  }

  if (value === "false" || value === false || value === undefined) {
    return false;
  }

  return value;
}, z.boolean().default(false));

export const glp1MedicationNameSchema = z.enum([
  "MOUNJARO",
  "OZEMPIC",
  "WEGOVY",
  "SAXENDA",
  "OTHER",
]);

export const glp1InjectionMethodSchema = z.enum([
  "self",
  "clinic",
  "caregiver",
  "unknown",
]);

export const glp1InjectionSiteSchema = z.enum([
  "abdomen",
  "thigh",
  "upper_arm",
  "other",
  "unknown",
]);

export const glp1MedicationLogInputSchema = z.object({
  medicationName: glp1MedicationNameSchema,
  doseMg: z.coerce.number().min(0.01).max(100),
  injectionDate: z.string().date(),
  nextInjectionDate: optionalDate,
  injectionMethod: glp1InjectionMethodSchema.default("unknown"),
  injectionSite: glp1InjectionSiteSchema.default("unknown"),
  lotNumber: optionalText(120),
  note: optionalText(1000),
});

export type Glp1MedicationLogInput = z.infer<
  typeof glp1MedicationLogInputSchema
>;

export const glp1SideEffectInputSchema = z.object({
  medicationLogId: optionalUuid,
  nauseaScore: z.coerce.number().int().min(0).max(10).default(0),
  vomiting: checkboxBoolean,
  constipationScore: z.coerce.number().int().min(0).max(10).default(0),
  diarrheaScore: z.coerce.number().int().min(0).max(10).default(0),
  appetiteScore: z.coerce.number().int().min(0).max(10).default(0),
  dizziness: checkboxBoolean,
  hypoglycemiaFeeling: checkboxBoolean,
  abdominalPainScore: z.coerce.number().int().min(0).max(10).default(0),
  dehydrationConcern: checkboxBoolean,
  note: optionalText(1000),
});

export type Glp1SideEffectInput = z.infer<typeof glp1SideEffectInputSchema>;

export const visitReportRequestSchema = z.object({
  patientId: z.string().min(1).max(120),
  reportPeriodStart: z.string().date().optional(),
  reportPeriodEnd: z.string().date().optional(),
});

export type VisitReportRequestInput = z.infer<typeof visitReportRequestSchema>;

export const visitReportSummarySchema = z.object({
  weightChange30d: z.string().min(1).max(500),
  skeletalMuscleChange: z.string().min(1).max(500),
  bodyFatPercentageChange: z.string().min(1).max(500),
  proteinTargetStatus: z.string().min(1).max(500),
  exerciseExecutionRate: z.string().min(1).max(500),
  glp1Adherence: z.string().min(1).max(500),
  sideEffectSummary: z.string().min(1).max(700),
  physicianAttentionItems: z.array(z.string().min(1).max(300)).max(8),
  visitCommunicationPoints: z.array(z.string().min(1).max(300)).max(8),
  safetyNotice: z.string().min(1).max(500),
});

export type VisitReportSummaryInput = z.infer<typeof visitReportSummarySchema>;

export const coachInsightGenerateRequestSchema = z.object({
  force: z.coerce.boolean().default(false),
});

export type CoachInsightGenerateRequestInput = z.infer<
  typeof coachInsightGenerateRequestSchema
>;

export const coachInsightHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(60).default(14),
});

export const coachInsightOutputSchema = z.object({
  summary: z.string().min(1).max(500),
  priorityTasks: z.array(z.string().min(1).max(160)).min(1).max(5),
  nutritionAdvice: z.string().min(1).max(900),
  exerciseAdvice: z.string().min(1).max(900),
  medicationAdvice: z.string().min(1).max(900),
  followUpAdvice: z.string().min(1).max(900),
  riskFlags: z.array(z.string().min(1).max(120)).max(10).default([]),
});

export type CoachInsightOutputInput = z.infer<
  typeof coachInsightOutputSchema
>;

export const engagementMetricInputSchema = z.object({
  userId: optionalUuid,
  metricDate: z.string().date(),
  loginCount: z.coerce.number().int().min(0).max(100).default(0),
  foodLogged: checkboxBoolean,
  workoutLogged: checkboxBoolean,
  weightLogged: checkboxBoolean,
  medicationLogged: checkboxBoolean,
  inbodyUploaded: checkboxBoolean,
  adherenceScore: z.coerce.number().int().min(0).max(100).default(0),
});

export type EngagementMetricInput = z.infer<typeof engagementMetricInputSchema>;

export const appointmentTimeSlotSchema = z.enum([
  "morning",
  "afternoon",
  "evening",
  "flexible",
]);

export const appointmentRequestSchema = z.object({
  reason: z.string().min(2).max(500),
  preferredDate: z.string().date(),
  preferredTimeSlot: appointmentTimeSlotSchema,
  note: optionalText(1000),
});

export type AppointmentRequestInput = z.infer<
  typeof appointmentRequestSchema
>;

export const appointmentStatusSchema = z.enum([
  "pending",
  "confirmed",
  "canceled",
  "completed",
]);

export const clinicAppointmentUpdateSchema = z.object({
  status: appointmentStatusSchema,
  staffNote: optionalText(1200),
});

export type ClinicAppointmentUpdateInput = z.infer<
  typeof clinicAppointmentUpdateSchema
>;

export const notificationSendDemoSchema = z.object({
  userId: optionalUuid,
  clinicId: optionalUuid,
  channel: z.enum(["line", "email", "sms", "in_app"]),
  title: z.string().min(1).max(160),
  message: z.string().min(1).max(1200),
});

export type NotificationSendDemoInput = z.infer<
  typeof notificationSendDemoSchema
>;

const optionalUrl = z.preprocess((value) => {
  if (value === "" || value === undefined) {
    return undefined;
  }

  return value;
}, z.string().url().max(500).optional());

const optionalEmail = z.preprocess((value) => {
  if (value === "" || value === undefined) {
    return undefined;
  }

  return value;
}, z.string().email().max(255).optional());

const slugSchema = z
  .string()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const clinicMemberRoleSchema = z.enum([
  "owner",
  "doctor",
  "clinic_staff",
  "nutritionist",
  "coach",
  "viewer",
  "super_admin",
]);

export const clinicMemberStatusSchema = z.enum([
  "active",
  "invited",
  "disabled",
]);

export const clinicSettingsInputSchema = z.object({
  name: z.string().min(2).max(160),
  slug: slugSchema.optional(),
  logoUrl: optionalUrl,
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default("#0f766e"),
  phone: optionalText(80),
  address: optionalText(300),
  email: optionalEmail,
  lineUrl: optionalUrl,
  websiteUrl: optionalUrl,
  status: z.enum(["active", "inactive"]).default("active"),
});

export type ClinicSettingsInput = z.infer<typeof clinicSettingsInputSchema>;

export const clinicMemberUpdateSchema = z.object({
  role: clinicMemberRoleSchema,
  status: clinicMemberStatusSchema,
});

export type ClinicMemberUpdateInput = z.infer<
  typeof clinicMemberUpdateSchema
>;

export const clinicInviteCreateSchema = z
  .object({
    invitedPhone: optionalText(80),
    invitedEmail: optionalEmail,
    expiresAt: z.preprocess((value) => {
      if (value === "" || value === undefined) {
        return undefined;
      }

      return value;
    }, z.string().datetime().or(z.string().date()).optional()),
  })
  .refine((value) => value.invitedPhone || value.invitedEmail, {
    message: "Provide phone or email for the invite.",
    path: ["invitedEmail"],
  });

export type ClinicInviteCreateInput = z.infer<
  typeof clinicInviteCreateSchema
>;

export const inviteAcceptSchema = z.object({
  inviteCode: z
    .string()
    .min(6)
    .max(32)
    .regex(/^[A-Za-z0-9-]+$/)
    .transform((value) => value.trim().toUpperCase()),
});

export type InviteAcceptInput = z.infer<typeof inviteAcceptSchema>;

export const auditLogQuerySchema = z.object({
  action: optionalText(120),
  actorUserId: optionalUuid,
  targetUserId: optionalUuid,
  dateFrom: z.preprocess((value) => {
    if (value === "" || value === undefined) {
      return undefined;
    }

    return value;
  }, z.string().date().optional()),
  dateTo: z.preprocess((value) => {
    if (value === "" || value === undefined) {
      return undefined;
    }

    return value;
  }, z.string().date().optional()),
  page: z.coerce.number().int().min(1).max(500).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export type AuditLogQueryInput = z.infer<typeof auditLogQuerySchema>;

export const staffInviteRoleSchema = z.enum([
  "doctor",
  "clinic_staff",
  "nutritionist",
  "coach",
  "viewer",
]);

export const staffInviteInputSchema = z
  .object({
    fullName: optionalText(120),
    email: optionalEmail,
    phone: optionalText(80),
    role: staffInviteRoleSchema.default("clinic_staff"),
    deliveryChannel: z.enum(["email", "line"]).default("email"),
  })
  .refine((value) => value.email || value.phone, {
    message: "Provide email or phone for the staff invite.",
    path: ["email"],
  });

export type StaffInviteInput = z.infer<typeof staffInviteInputSchema>;

export const feedbackTypeSchema = z.enum([
  "bug",
  "idea",
  "confusing",
  "praise",
]);

export const feedbackStatusSchema = z.enum([
  "open",
  "reviewed",
  "resolved",
]);

export const feedbackCreateSchema = z.object({
  pagePath: z
    .string()
    .min(1)
    .max(300)
    .regex(/^\/[^\s]*$/, "Page path must be an app path."),
  feedbackType: feedbackTypeSchema,
  message: z.string().min(3).max(2000),
  screenshotUrl: optionalUrl,
});

export type FeedbackCreateInput = z.infer<typeof feedbackCreateSchema>;

export const clinicFeedbackQuerySchema = z.object({
  status: feedbackStatusSchema.optional(),
  feedbackType: feedbackTypeSchema.optional(),
  page: z.coerce.number().int().min(1).max(500).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export type ClinicFeedbackQueryInput = z.infer<
  typeof clinicFeedbackQuerySchema
>;

export const pilotCohortStatusSchema = z.enum([
  "planned",
  "active",
  "completed",
]);

export const pilotCohortMemberStatusSchema = z.enum([
  "active",
  "dropped",
  "completed",
]);

export const pilotCohortCreateSchema = z
  .object({
    name: z.string().min(2).max(160),
    startDate: z.string().date(),
    endDate: z.string().date(),
    status: pilotCohortStatusSchema.default("planned"),
    goal: optionalText(1000),
  })
  .refine((value) => value.endDate >= value.startDate, {
    message: "End date must be after start date.",
    path: ["endDate"],
  });

export type PilotCohortCreateInput = z.infer<
  typeof pilotCohortCreateSchema
>;

export const pilotCohortMemberAddSchema = z.object({
  userId: z.string().min(1).max(120),
  note: optionalText(1000),
});

export type PilotCohortMemberAddInput = z.infer<
  typeof pilotCohortMemberAddSchema
>;

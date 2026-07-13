export type UserRole =
  | "patient"
  | "owner"
  | "clinic_staff"
  | "doctor"
  | "nutritionist"
  | "coach"
  | "viewer"
  | "super_admin";

export type ApiErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "USAGE_LIMIT_EXCEEDED"
  | "NOT_IMPLEMENTED"
  | "SERVER_ERROR";

export type ApiError = {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
};

export type ApiSuccess<T> = {
  data: T;
};

export type PatientListItem = {
  id: string;
  fullName: string;
  age: number | null;
  latestWeightKg: number | null;
  glp1Status: string;
  lastCheckInAt: string | null;
  riskFlag: "LOW" | "WATCH" | "NEEDS_REVIEW";
};

export type AssessmentPersona =
  | "fitness_beginner"
  | "gym_training"
  | "home_training"
  | "glp1_weight_loss"
  | "chronic_disease"
  | "senior_frailty"
  | "high_risk_medical_review";

export type AssessmentRiskFlag =
  | "chest_pain"
  | "abnormal_dyspnea_exercise"
  | "syncope"
  | "severe_hypoglycemia"
  | "severe_vomiting_dehydration"
  | "heart_disease_no_clearance"
  | "age_70_recent_fall";

export type AssessmentResult = {
  persona: AssessmentPersona;
  personaLabel: string;
  recommendedPath: string;
  riskFlags: AssessmentRiskFlag[];
  needsMedicalReview: boolean;
  safetyMessage: string;
  todayRecommendations: {
    exercise: string;
    nutrition: string;
    medication: string;
    followUp: string;
  };
  completedAt: string;
};

export type FoodMealType =
  | "breakfast"
  | "lunch"
  | "dinner"
  | "snack"
  | "other";

export type FoodLogSource = "ai_photo" | "manual";

export type NutritionEstimate = {
  mealName: string;
  caloriesKcalMin: number;
  caloriesKcalMax: number;
  caloriesKcal: number;
  proteinGMin: number;
  proteinGMax: number;
  proteinG: number;
  fatGMin: number;
  fatGMax: number;
  fatG: number;
  carbsGMin: number;
  carbsGMax: number;
  carbsG: number;
  fiberGMin: number;
  fiberGMax: number;
  fiberG: number;
  sodiumMgMin: number;
  sodiumMgMax: number;
  sodiumMg: number;
  confidenceScore: number;
  portionNotes: string;
  advice: string;
  safetyNote: string;
};

export type FoodLog = {
  id: string;
  userId: string;
  mealType: FoodMealType;
  mealName: string;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sodiumMg: number;
  source: FoodLogSource;
  note: string | null;
  eatenAt: string;
  createdAt: string;
};

export type TodayNutritionSummary = {
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  proteinTargetG: number;
  proteinTargetRate: number;
  logCount: number;
};

export type InBodyRecordSource = "ai_photo" | "manual";

export type InBodyEstimate = {
  measuredAt: string;
  weightKg: number | null;
  skeletalMuscleKg: number | null;
  bodyFatMassKg: number | null;
  bodyFatPercentage: number | null;
  bmi: number | null;
  waistHipRatio: number | null;
  visceralFatAreaCm2: number | null;
  basalMetabolicRateKcal: number | null;
  inbodyScore: number | null;
  confidenceScore: number;
  needsManualReview: boolean;
  aiSummary: string;
  safetyNote: string;
};

export type InBodyRecord = {
  id: string;
  userId: string;
  measuredAt: string;
  weightKg: number | null;
  skeletalMuscleKg: number | null;
  bodyFatMassKg: number | null;
  bodyFatPercentage: number | null;
  bmi: number | null;
  waistHipRatio: number | null;
  visceralFatAreaCm2: number | null;
  basalMetabolicRateKcal: number | null;
  inbodyScore: number | null;
  note: string | null;
  aiSummary: string | null;
  source: InBodyRecordSource;
  createdAt: string;
};

export type InBodyMetricComparison = {
  current: number | null;
  previous: number | null;
  delta: number | null;
};

export type InBodyLatestSummary = {
  latest: InBodyRecord | null;
  previous: InBodyRecord | null;
  comparison: {
    weightKg: InBodyMetricComparison;
    skeletalMuscleKg: InBodyMetricComparison;
    bodyFatPercentage: InBodyMetricComparison;
    bodyFatMassKg: InBodyMetricComparison;
    visceralFatAreaCm2: InBodyMetricComparison;
  };
};

export type Glp1MedicationName =
  | "MOUNJARO"
  | "OZEMPIC"
  | "WEGOVY"
  | "SAXENDA"
  | "OTHER";

export type Glp1InjectionMethod =
  | "self"
  | "clinic"
  | "caregiver"
  | "unknown";

export type Glp1InjectionSite =
  | "abdomen"
  | "thigh"
  | "upper_arm"
  | "other"
  | "unknown";

export type Glp1MedicationLog = {
  id: string;
  userId: string;
  medicationName: Glp1MedicationName;
  doseMg: number;
  injectionDate: string;
  nextInjectionDate: string;
  injectionMethod: Glp1InjectionMethod;
  injectionSite: Glp1InjectionSite;
  lotNumber: string | null;
  note: string | null;
  createdAt: string;
};

export type Glp1SideEffectLog = {
  id: string;
  userId: string;
  medicationLogId: string | null;
  nauseaScore: number;
  vomiting: boolean;
  constipationScore: number;
  diarrheaScore: number;
  appetiteScore: number;
  dizziness: boolean;
  hypoglycemiaFeeling: boolean;
  abdominalPainScore: number;
  dehydrationConcern: boolean;
  note: string | null;
  createdAt: string;
};

export type Glp1LatestSummary = {
  latestMedicationLog: Glp1MedicationLog | null;
  latestSideEffectLog: Glp1SideEffectLog | null;
  daysUntilNextInjection: number | null;
  nextInjectionDueSoon: boolean;
  highSideEffectAlert: boolean;
  safetyNotice: string;
  severeSymptomNotice: string;
};

export type ClinicGlp1AlertPatient = PatientListItem & {
  latestGlp1Log: Glp1MedicationLog | null;
  latestSideEffectLog: Glp1SideEffectLog | null;
  nextInjectionDate: string | null;
  nextInjectionDueSoon: boolean;
  highSideEffectAlert: boolean;
  missingRecentReport: boolean;
  engagement?: PatientEngagementOverview;
};

export type TrainingIntensity = "LOW" | "MEDIUM" | "HIGH";

export type TrainingLog = {
  id: string;
  userId: string;
  trainedOn: string;
  startedAt?: string | null;
  endedAt?: string | null;
  gymProfileId?: string | null;
  gymName?: string | null;
  activityType: string;
  durationMinutes: number;
  intensity: TrainingIntensity;
  notes: string | null;
  createdAt: string;
  updatedAt?: string;
  sets?: TrainingSet[];
};

export type TrainingLaterality = "bilateral" | "unilateral";
export type TrainingSetSide = "both" | "left" | "right" | "alternating";
export type TrainingWeightBasis = "total" | "per_side" | "per_hand";
export type TrainingSetType = "warmup" | "working" | "drop";

export type TrainingSet = {
  id: string;
  trainingLogId: string;
  equipmentProfileId: string | null;
  exerciseOrder: number;
  setNumber: number;
  movementName: string;
  equipmentName: string | null;
  equipmentBrand: string | null;
  equipmentModel: string | null;
  laterality: TrainingLaterality;
  side: TrainingSetSide | null;
  weightKg: number | null;
  weightBasis: TrainingWeightBasis;
  reps: number | null;
  setType: TrainingSetType;
  toFailure: boolean;
  rpe: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TrainingEquipmentSignature = {
  equipmentProfileId?: string | null;
  gymName: string | null;
  movementName: string;
  equipmentBrand: string | null;
  equipmentName: string | null;
  equipmentModel: string | null;
  laterality: TrainingLaterality;
  weightBasis: TrainingWeightBasis;
};

export type TrainingLastPerformance = {
  sessionId: string;
  trainedOn: string;
  startedAt: string | null | undefined;
  gymName: string | null | undefined;
  signature: TrainingEquipmentSignature;
  sets: TrainingSet[];
  lastWorkingWeightKg: number | null;
  bestWorkingSet: TrainingSet | null;
  hasDropSet: boolean;
  hasToFailure: boolean;
};

export type TrainingSetCopyDraft = {
  exerciseOrder: string;
  setNumber: string;
  movementName: string;
  equipmentProfileId?: string | null;
  equipmentBrand: string;
  equipmentName: string;
  equipmentModel: string;
  laterality: TrainingLaterality;
  side: TrainingSetSide;
  weightKg: string;
  weightBasis: TrainingWeightBasis;
  reps: string;
  setType: TrainingSetType;
  toFailure: boolean;
  rpe: string;
  notes: string;
};

export type GymProfile = {
  id: string;
  ownerId: string;
  name: string;
  normalizedName: string;
  branchName: string | null;
  normalizedBranchName: string | null;
  locationText: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EquipmentProfile = {
  id: string;
  ownerId: string;
  gymProfileId: string | null;
  canonicalName: string;
  normalizedName: string;
  brand: string | null;
  model: string | null;
  defaultMovementName: string | null;
  defaultLaterality: TrainingLaterality | null;
  defaultWeightBasis: TrainingWeightBasis | null;
  seatSetting: string | null;
  padSetting: string | null;
  handleSetting: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  aliases?: EquipmentAlias[];
  gym?: GymProfile | null;
};

export type EquipmentAlias = {
  id: string;
  ownerId: string;
  equipmentProfileId: string;
  alias: string;
  normalizedAlias: string;
  createdAt: string;
};

export type EquipmentResolveResult = {
  match: EquipmentProfile | null;
  candidates: EquipmentProfile[];
  ambiguous: boolean;
};

export type EquipmentLegacyCandidate = {
  trainingSet: TrainingSet;
  trainingLog: TrainingLog;
};

export type EngagementMetric = {
  id: string;
  userId: string;
  metricDate: string;
  loginCount: number;
  foodLogged: boolean;
  workoutLogged: boolean;
  weightLogged: boolean;
  medicationLogged: boolean;
  inbodyUploaded: boolean;
  adherenceScore: number;
  createdAt: string;
};

export type EngagementSummary = {
  healthScore: number;
  completedItems: string[];
  missingItems: string[];
  consecutiveRecordDays: number;
  consecutiveLoginDays: number;
  completionRate7d: number;
  completionRate30d: number;
  lowEngagementAlert: boolean;
  foodMissingAlert: boolean;
  glp1MissingAlert: boolean;
  daysSinceLastLogin: number | null;
  daysSinceLastFoodLog: number | null;
  daysSinceLastMedicationLog: number | null;
  badgeSkeleton: string[];
};

export type DailyTaskStatus = "pending" | "completed" | "skipped";

export type DailyTaskType =
  | "weight_log"
  | "food_photo"
  | "protein_goal"
  | "hydration_goal"
  | "workout"
  | "glp1_injection"
  | "side_effect_report"
  | "inbody_upload"
  | "appointment_request";

export type DailyTaskPriority = "normal" | "important";

export type DailyTask = {
  id: string;
  userId: string;
  taskDate: string;
  taskType: DailyTaskType;
  title: string;
  description: string;
  status: DailyTaskStatus;
  completedAt: string | null;
  createdAt: string;
  priority: DailyTaskPriority;
};

export type StreakType =
  | "login"
  | "food"
  | "workout"
  | "medication_on_time"
  | "daily_record";

export type Streak = {
  id: string;
  userId: string;
  streakType: StreakType;
  currentCount: number;
  longestCount: number;
  lastCompletedDate: string | null;
  updatedAt: string;
};

export type Badge = {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  criteria: Record<string, unknown>;
  active: boolean;
};

export type UserBadge = {
  id: string;
  userId: string;
  badgeId: string;
  badge: Badge;
  earnedAt: string;
};

export type TodayTasksSummary = {
  taskDate: string;
  tasks: DailyTask[];
  completedCount: number;
  totalCount: number;
  completionRate: number;
  importantPendingCount: number;
  persisted: boolean;
};

export type BadgesSummary = {
  earned: UserBadge[];
  available: Badge[];
  earnedCount: number;
  totalCount: number;
  persisted: boolean;
};

export type PatientEngagementOverview = {
  consecutiveLoginDays: number;
  todayTaskCompletionRate: number;
  lowEngagementAlert: boolean;
  recentBadgeName: string | null;
  recentBadgeIcon: string | null;
};

export type AiCoachInsight = {
  id: string;
  userId: string;
  insightDate: string;
  persona: AssessmentPersona;
  summary: string;
  priorityTasks: string[];
  nutritionAdvice: string;
  exerciseAdvice: string;
  medicationAdvice: string;
  followUpAdvice: string;
  riskFlags: string[];
  aiRawResponse: Record<string, unknown>;
  createdAt: string;
};

export type AiCoachInsightResponse = {
  persisted: boolean;
  provider: "openai" | "anthropic" | "gemini" | "deepseek" | "fallback";
  insight: AiCoachInsight;
};

export type TrendPoint = {
  date: string;
  value: number | null;
};

export type TimeWindowSummary = {
  days: 7 | 30;
  logCount: number;
  averageCaloriesKcal: number;
  averageProteinG: number;
  proteinTargetRate: number;
};

export type TrainingWindowSummary = {
  days: 7 | 30;
  workoutCount: number;
  totalMinutes: number;
  executionRate: number;
};

export type SideEffectTrendPoint = {
  date: string;
  nauseaScore: number;
  abdominalPainScore: number;
  vomiting: boolean;
  dehydrationConcern: boolean;
};

export type VisitReportSummary = {
  weightChange30d: string;
  skeletalMuscleChange: string;
  bodyFatPercentageChange: string;
  proteinTargetStatus: string;
  exerciseExecutionRate: string;
  glp1Adherence: string;
  sideEffectSummary: string;
  physicianAttentionItems: string[];
  visitCommunicationPoints: string[];
  safetyNotice: string;
};

export type ClinicVisitReport = {
  id: string;
  patientId: string;
  generatedBy: string | null;
  reportPeriodStart: string;
  reportPeriodEnd: string;
  aiSummary: VisitReportSummary;
  plainTextSummary: string;
  createdAt: string;
};

export type ClinicPatientDetail = {
  patient: PatientListItem & {
    dateOfBirth: string | null;
    sex: string | null;
  };
  latestAssessment: AssessmentResult | null;
  inbody: {
    latest: InBodyRecord | null;
    history: InBodyRecord[];
    weightTrend: TrendPoint[];
    bodyFatTrend: TrendPoint[];
    skeletalMuscleTrend: TrendPoint[];
  };
  nutrition: {
    summary7d: TimeWindowSummary;
    summary30d: TimeWindowSummary;
  };
  training: {
    summary7d: TrainingWindowSummary;
    summary30d: TrainingWindowSummary;
    recentLogs: TrainingLog[];
  };
  glp1: Glp1LatestSummary & {
    history: Glp1MedicationLog[];
    sideEffectTrend: SideEffectTrendPoint[];
    daysUnreported: number | null;
  };
  engagement: EngagementSummary;
  riskAlerts: string[];
  latestVisitReport: ClinicVisitReport | null;
};

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "canceled"
  | "completed";

export type AppointmentTimeSlot =
  | "morning"
  | "afternoon"
  | "evening"
  | "flexible";

export type Appointment = {
  id: string;
  userId: string;
  clinicId: string | null;
  patientName: string | null;
  reason: string;
  preferredDate: string;
  preferredTimeSlot: AppointmentTimeSlot;
  status: AppointmentStatus;
  staffNote: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ReminderSeverity = "low" | "medium" | "high";

export type ReminderStatus = "open" | "dismissed" | "resolved";

export type ReminderEvent = {
  id: string;
  userId: string;
  clinicId: string | null;
  patientName: string | null;
  reminderType: string;
  severity: ReminderSeverity;
  title: string;
  message: string;
  status: ReminderStatus;
  source: string;
  createdAt: string;
  resolvedAt: string | null;
};

export type PatientReminderCenter = {
  todayReminders: ReminderEvent[];
  visitSuggestions: ReminderEvent[];
  incompleteItems: string[];
};

export type NotificationChannel = "line" | "email" | "sms" | "in_app";

export type NotificationStatus = "pending" | "sent" | "failed";

export type NotificationLog = {
  id: string;
  userId: string;
  clinicId: string | null;
  channel: NotificationChannel;
  title: string;
  message: string;
  status: NotificationStatus;
  providerResponse: Record<string, unknown>;
  createdAt: string;
};

export type ClinicStatus = "active" | "inactive";

export type ClinicMemberRole =
  | "owner"
  | "doctor"
  | "clinic_staff"
  | "nutritionist"
  | "coach"
  | "viewer"
  | "super_admin";

export type ClinicMemberStatus = "active" | "invited" | "disabled";

export type ClinicPatientStatus = "active" | "inactive" | "discharged";

export type PatientInviteStatus =
  | "pending"
  | "accepted"
  | "expired"
  | "canceled";

export type SubscriptionPlanStatus = "active" | "inactive";

export type ClinicSubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled";

export type Clinic = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  lineUrl: string | null;
  websiteUrl: string | null;
  status: ClinicStatus;
  createdAt: string;
  updatedAt: string;
};

export type ClinicMember = {
  id: string;
  clinicId: string;
  userId: string;
  role: ClinicMemberRole;
  status: ClinicMemberStatus;
  active: boolean;
  fullName: string | null;
  email: string | null;
  createdAt: string;
};

export type ClinicPatient = {
  id: string;
  clinicId: string;
  patientId: string;
  status: ClinicPatientStatus;
  joinedAt: string;
  note: string | null;
};

export type PatientInvite = {
  id: string;
  clinicId: string;
  inviteCode: string;
  invitedPhone: string | null;
  invitedEmail: string | null;
  status: PatientInviteStatus;
  expiresAt: string;
  acceptedBy: string | null;
  createdAt: string;
};

export type SubscriptionPlan = {
  id: string;
  code: "free" | "clinic_basic" | "clinic_pro" | "enterprise" | string;
  name: string;
  priceMonthly: number;
  maxPatients: number | null;
  maxStaff: number | null;
  features: Record<string, unknown>;
  status: SubscriptionPlanStatus;
};

export type ClinicSubscription = {
  id: string;
  clinicId: string;
  planId: string;
  plan: SubscriptionPlan | null;
  status: ClinicSubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  createdAt: string;
};

export type ClinicPermissions = {
  canViewPatient: boolean;
  canEditPatient: boolean;
  canGenerateVisitReport: boolean;
  canManageClinicSettings: boolean;
  canManageTeam: boolean;
  canViewBilling: boolean;
};

export type ClinicContext = {
  clinic: Clinic;
  member: ClinicMember;
  permissions: ClinicPermissions;
  persisted: boolean;
};

export type ClinicDashboardSummary = {
  totalPatients: number;
  activePatientsThisWeek: number;
  highSideEffectAlerts: number;
  pendingAppointments: number;
  inactivePatients7d: number;
  glp1DueSoon: number;
  recentVisitReports: ClinicVisitReport[];
  persisted: boolean;
};

export type AuditAction =
  | "patient.view"
  | "patient.update"
  | "visit_report.generate"
  | "glp1_log.create"
  | "glp1_side_effect.create"
  | "clinic_settings.update"
  | "team_member.invite"
  | "team_member.update"
  | "team_member.disable"
  | "appointment.update"
  | "ai_food_analysis.create"
  | "ai_inbody_analysis.create"
  | string;

export type AuditLog = {
  id: string;
  clinicId: string | null;
  actorUserId: string | null;
  actorName: string | null;
  targetUserId: string | null;
  targetName: string | null;
  action: AuditAction;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

export type UsageCounter = {
  id: string;
  clinicId: string;
  periodStart: string;
  periodEnd: string;
  aiFoodAnalysisCount: number;
  aiInbodyAnalysisCount: number;
  aiVisitReportCount: number;
  activePatientCount: number;
  staffCount: number;
  createdAt: string;
  updatedAt: string;
};

export type UsageLimitValue = number | null;

export type ClinicUsageSummary = {
  clinicId: string;
  plan: SubscriptionPlan | null;
  periodStart: string;
  periodEnd: string;
  counts: {
    activePatients: number;
    staff: number;
    aiFoodAnalysis: number;
    aiInbodyAnalysis: number;
    aiVisitReports: number;
  };
  limits: {
    maxPatients: UsageLimitValue;
    maxStaff: UsageLimitValue;
    aiFoodAnalysisMonthly: UsageLimitValue;
    aiInbodyAnalysisMonthly: UsageLimitValue;
    aiVisitReportsMonthly: UsageLimitValue;
  };
  persisted: boolean;
};

export type UsageLimitKey =
  | "maxPatients"
  | "maxStaff"
  | "aiFoodAnalysisMonthly"
  | "aiInbodyAnalysisMonthly"
  | "aiVisitReportsMonthly";

export type StaffInvite = {
  id: string;
  clinicId: string;
  email: string | null;
  phone: string | null;
  role: ClinicMemberRole;
  status: "invited";
  deliveryChannel: "email" | "line";
  providerStatus: "pending" | "demo_sent";
  createdAt: string;
};

export type FeedbackType = "bug" | "idea" | "confusing" | "praise";

export type FeedbackStatus = "open" | "reviewed" | "resolved";

export type FeedbackItem = {
  id: string;
  userId: string;
  userName: string | null;
  clinicId: string | null;
  pagePath: string;
  feedbackType: FeedbackType;
  message: string;
  screenshotUrl: string | null;
  status: FeedbackStatus;
  createdAt: string;
};

export type PilotCohortStatus = "planned" | "active" | "completed";

export type PilotCohortMemberStatus = "active" | "dropped" | "completed";

export type PilotCohort = {
  id: string;
  clinicId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: PilotCohortStatus;
  goal: string | null;
  createdAt: string;
};

export type PilotCohortMember = {
  id: string;
  cohortId: string;
  userId: string;
  patientName: string | null;
  enrolledAt: string;
  status: PilotCohortMemberStatus;
  note: string | null;
};

export type PilotMemberMetrics = {
  member: PilotCohortMember;
  loginDays: number;
  taskCompletionRate: number;
  foodLogDays: number;
  glp1LogCount: number;
  aiCoachUseCount: number;
  feedbackCount: number;
  lowEngagement: boolean;
};

export type PilotCohortDetail = {
  cohort: PilotCohort;
  members: PilotMemberMetrics[];
  feedbackItems: FeedbackItem[];
  feedbackSummary: string[];
  persisted: boolean;
};

export type PilotCohortReport = {
  cohort: PilotCohort;
  totalMembers: number;
  activeRate: number;
  averageTaskCompletionRate: number;
  foodLoggingRate: number;
  medicationLoggingRate: number;
  aiCoachUsageRate: number;
  averageFeedbackCount: number;
  lowEngagementMembers: Array<{
    userId: string;
    patientName: string | null;
    reason: string;
  }>;
  commonFeedbackSummary: string[];
  generatedAt: string;
  persisted: boolean;
};

export type ActivePilotEnrollment = {
  cohortId: string;
  name: string;
  startDate: string;
  endDate: string;
  goal: string | null;
};

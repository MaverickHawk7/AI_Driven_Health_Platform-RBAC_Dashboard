import { pgTable, text, serial, integer, boolean, timestamp, jsonb, date, real } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import crypto from "crypto";

// TABLE DEFINITIONS

export const centers = pgTable("centers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  block: text("block").notNull(),
  district: text("district").notNull(),
  state: text("state").notNull(),
  ngoName: text("ngo_name"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["field_worker", "supervisor", "cdpo", "dwcweo", "higher_official", "admin"] }).notNull(),
  name: text("name").notNull(),
  centerId: integer("center_id").references(() => centers.id),
  assignedBlock: text("assigned_block"),
  assignedDistrict: text("assigned_district"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  uuid: text("uuid").notNull().unique().$defaultFn(() => crypto.randomUUID()),
  patientIdNumber: text("patient_id_number"),
  name: text("name").notNull(),
  ageMonths: integer("age_months").notNull(),
  dob: date("dob"),
  gender: text("gender", { enum: ["male", "female"] }),
  caregiverName: text("caregiver_name").notNull(),
  contactNumber: text("contact_number"),
  address: text("address"),
  district: text("district"),
  block: text("block"),
  centerId: integer("center_id").references(() => centers.id),
  registeredByUserId: integer("registered_by_user_id").references(() => users.id),
  // Birth history
  modeDelivery: text("mode_delivery", { enum: ["vaginal", "c_section"] }),
  modeConception: text("mode_conception", { enum: ["natural", "art"] }),
  birthStatus: text("birth_status", { enum: ["term", "preterm", "post_term"] }),
  consanguinity: boolean("consanguinity").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const screenings = pgTable("screenings", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  date: timestamp("date").defaultNow(),
  answers: jsonb("answers").notNull(),
  riskScore: integer("risk_score"),
  riskLevel: text("risk_level", { enum: ["Low", "Medium", "High"] }),
  photoAnalysis: jsonb("photo_analysis"),
  screeningType: text("screening_type", { enum: ["baseline", "reassessment_3m", "reassessment_6m", "ad_hoc"] }).default("baseline"),
  baselineScreeningId: integer("baseline_screening_id"),
  domainScores: jsonb("domain_scores"),
  conductedByUserId: integer("conducted_by_user_id").references(() => users.id),
  // Phase 4: Behaviour & enhanced scoring
  behaviourConcerns: text("behaviour_concerns"), // comma-separated: "sleep,aggression,feeding"
  behaviourScore: integer("behaviour_score"),
  behaviourRiskLevel: text("behaviour_risk_level", { enum: ["Low", "Medium", "High"] }),
  autismRisk: text("autism_risk", { enum: ["Low", "Moderate", "High"] }),
  adhdRisk: text("adhd_risk", { enum: ["Low", "Moderate", "High"] }),
  developmentalStatus: text("developmental_status"), // e.g. "2 delays identified"
  formulaRiskScore: integer("formula_risk_score"),
  formulaRiskCategory: text("formula_risk_category", { enum: ["Low", "Medium", "High"] }),
  // DQ scores (optional, professional level)
  gmDQ: real("gm_dq"),
  fmDQ: real("fm_dq"),
  lcDQ: real("lc_dq"),
  cogDQ: real("cog_dq"),
  seDQ: real("se_dq"),
  compositeDQ: real("composite_dq"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const interventions = pgTable("interventions", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  screeningId: integer("screening_id").references(() => screenings.id),
  recommendation: text("recommendation").notNull(),
  status: text("status", { enum: ["pending", "in_progress", "completed"] }).default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const interventionPlans = pgTable("intervention_plans", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  screeningId: integer("screening_id").references(() => screenings.id),
  ageGroupMonths: text("age_group_months"),
  domain: text("domain", { enum: ["speech", "social", "motor", "cognitive", "nutrition"] }).notNull(),
  activities: jsonb("activities").notNull(), // array of {title, description, frequency, duration}
  caregiverVersion: text("caregiver_version"),
  professionalVersion: text("professional_version"),
  supervisorNotes: text("supervisor_notes"),
  supervisorModifiedByUserId: integer("supervisor_modified_by_user_id").references(() => users.id),
  status: text("status", { enum: ["recommended", "active", "completed", "discontinued"] }).default("recommended"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  interventionPlanId: integer("intervention_plan_id").references(() => interventionPlans.id).notNull(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  activityTitle: text("activity_title").notNull(),
  completedAt: timestamp("completed_at"),
  completedByUserId: integer("completed_by_user_id").references(() => users.id),
  caregiverFeedback: text("caregiver_feedback"),
  status: text("status", { enum: ["pending", "completed", "skipped"] }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const consentRecords = pgTable("consent_records", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  guardianName: text("guardian_name").notNull(),
  guardianRelationship: text("guardian_relationship", { enum: ["mother", "father", "legal_guardian", "other"] }).notNull(),
  consentType: text("consent_type", { enum: ["screening", "photo_analysis", "data_sharing", "research"] }).notNull(),
  consentGiven: boolean("consent_given").notNull(),
  consentMethod: text("consent_method", { enum: ["digital_signature", "verbal_witnessed", "paper_scanned"] }).notNull(),
  signatureData: text("signature_data"),
  witnessUserId: integer("witness_user_id").references(() => users.id),
  expiresAt: timestamp("expires_at"),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id"),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  type: text("type", { enum: ["high_risk_detected", "missed_followup", "no_improvement", "supervisor_escalation", "regional_risk_spike", "consent_expiring"] }).notNull(),
  severity: text("severity", { enum: ["critical", "high", "medium", "low"] }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  patientId: integer("patient_id").references(() => patients.id),
  screeningId: integer("screening_id").references(() => screenings.id),
  assignedToUserId: integer("assigned_to_user_id").references(() => users.id),
  createdByUserId: integer("created_by_user_id").references(() => users.id),
  status: text("status", { enum: ["active", "acknowledged", "resolved", "dismissed"] }).default("active"),
  acknowledgedAt: timestamp("acknowledged_at"),
  resolvedAt: timestamp("resolved_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const alertThresholds = pgTable("alert_thresholds", {
  id: serial("id").primaryKey(),
  alertType: text("alert_type").notNull(),
  thresholdKey: text("threshold_key").notNull(),
  thresholdValue: text("threshold_value").notNull(),
  isActive: boolean("is_active").default(true),
  modifiedByUserId: integer("modified_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const systemConfig = pgTable("system_config", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const nutritionAssessments = pgTable("nutrition_assessments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  screeningId: integer("screening_id").references(() => screenings.id),
  weightKg: real("weight_kg"),
  heightCm: real("height_cm"),
  muacCm: real("muac_cm"),
  hemoglobin: real("hemoglobin"),
  underweight: boolean("underweight").default(false),
  stunting: boolean("stunting").default(false),
  wasting: boolean("wasting").default(false),
  anemia: boolean("anemia").default(false),
  nutritionScore: integer("nutrition_score").default(0),
  nutritionRisk: text("nutrition_risk", { enum: ["Low", "Medium", "High"] }).default("Low"),
  assessedByUserId: integer("assessed_by_user_id").references(() => users.id),
  assessedAt: timestamp("assessed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const environmentAssessments = pgTable("environment_assessments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  parentChildInteraction: integer("parent_child_interaction"),
  parentMentalHealth: integer("parent_mental_health"),
  homeStimulation: integer("home_stimulation"),
  playMaterials: boolean("play_materials").default(false),
  caregiverEngagement: text("caregiver_engagement", { enum: ["Low", "Medium", "High"] }),
  languageExposure: text("language_exposure", { enum: ["Adequate", "Inadequate"] }),
  safeWater: boolean("safe_water").default(true),
  toiletFacility: boolean("toilet_facility").default(true),
  environmentScore: integer("environment_score").default(0),
  environmentRisk: text("environment_risk", { enum: ["Low", "Medium", "High"] }).default("Low"),
  assessedByUserId: integer("assessed_by_user_id").references(() => users.id),
  assessedAt: timestamp("assessed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  screeningId: integer("screening_id").references(() => screenings.id),
  referralTriggered: boolean("referral_triggered").default(false), // auto vs manual
  referralType: text("referral_type", { enum: ["PHC", "NRC", "DEIC", "RBSK", "AWW_Intervention", "Parent_Intervention"] }).notNull(),
  referralReason: text("referral_reason", { enum: ["GDD", "Autism", "ADHD", "Behaviour", "Environment", "Domain_Delay", "Nutrition"] }).notNull(),
  referralStatus: text("referral_status", { enum: ["Pending", "Under_Treatment", "Under_Evaluation", "Completed"] }).default("Pending"),
  referredByUserId: integer("referred_by_user_id").references(() => users.id),
  referredAt: timestamp("referred_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const outcomeTracking = pgTable("outcome_tracking", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  baselineScreeningId: integer("baseline_screening_id").references(() => screenings.id),
  followupScreeningId: integer("followup_screening_id").references(() => screenings.id),
  reductionInDelayMonths: integer("reduction_in_delay_months").default(0),
  domainImprovement: boolean("domain_improvement").default(false),
  autismRiskChange: text("autism_risk_change", { enum: ["Improved", "Same", "Worsened"] }),
  exitHighRisk: boolean("exit_high_risk").default(false),
  improvementStatus: text("improvement_status", { enum: ["Improved", "Same", "Worsened"] }),
  homeActivitiesAssigned: integer("home_activities_assigned").default(0),
  followupConducted: boolean("followup_conducted").default(false),
  assessedByUserId: integer("assessed_by_user_id").references(() => users.id),
  assessedAt: timestamp("assessed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const supervisorCenterAssignments = pgTable("supervisor_center_assignments", {
  id: serial("id").primaryKey(),
  supervisorId: integer("supervisor_id").references(() => users.id).notNull(),
  centerId: integer("center_id").references(() => centers.id).notNull(),
  assignedByUserId: integer("assigned_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").references(() => users.id).notNull(),
  recipientId: integer("recipient_id").references(() => users.id).notNull(),
  type: text("type", { enum: ["message", "task"] }).notNull().default("message"),
  subject: text("subject").notNull(),
  body: text("body"),
  priority: text("priority", { enum: ["low", "normal", "high", "urgent"] }).notNull().default("normal"),
  status: text("status", { enum: ["unread", "read", "accepted", "in_progress", "completed", "declined"] }).notNull().default("unread"),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  relatedPatientId: integer("related_patient_id").references(() => patients.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// === RELATIONS ===

export const centersRelations = relations(centers, ({ many }) => ({
  users: many(users, { relationName: "centerUsers" }),
  patients: many(patients, { relationName: "centerPatients" }),
  supervisorAssignments: many(supervisorCenterAssignments),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  center: one(centers, {
    fields: [users.centerId],
    references: [centers.id],
    relationName: "centerUsers",
  }),
  registeredPatients: many(patients, { relationName: "registrar" }),
  conductedScreenings: many(screenings, { relationName: "screener" }),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  registeredBy: one(users, {
    fields: [patients.registeredByUserId],
    references: [users.id],
    relationName: "registrar",
  }),
  center: one(centers, {
    fields: [patients.centerId],
    references: [centers.id],
    relationName: "centerPatients",
  }),
  screenings: many(screenings),
  interventions: many(interventions),
  interventionPlans: many(interventionPlans),
  consentRecords: many(consentRecords),
  nutritionAssessments: many(nutritionAssessments),
  environmentAssessments: many(environmentAssessments),
  referrals: many(referrals),
  outcomes: many(outcomeTracking),
}));

export const screeningsRelations = relations(screenings, ({ one, many }) => ({
  patient: one(patients, {
    fields: [screenings.patientId],
    references: [patients.id],
  }),
  conductedBy: one(users, {
    fields: [screenings.conductedByUserId],
    references: [users.id],
    relationName: "screener",
  }),
  interventions: many(interventions),
  interventionPlans: many(interventionPlans),
}));

export const interventionsRelations = relations(interventions, ({ one }) => ({
  patient: one(patients, {
    fields: [interventions.patientId],
    references: [patients.id],
  }),
  screening: one(screenings, {
    fields: [interventions.screeningId],
    references: [screenings.id],
  }),
}));

export const interventionPlansRelations = relations(interventionPlans, ({ one, many }) => ({
  patient: one(patients, {
    fields: [interventionPlans.patientId],
    references: [patients.id],
  }),
  screening: one(screenings, {
    fields: [interventionPlans.screeningId],
    references: [screenings.id],
  }),
  supervisorModifiedBy: one(users, {
    fields: [interventionPlans.supervisorModifiedByUserId],
    references: [users.id],
  }),
  activityLogs: many(activityLogs),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  interventionPlan: one(interventionPlans, {
    fields: [activityLogs.interventionPlanId],
    references: [interventionPlans.id],
  }),
  patient: one(patients, {
    fields: [activityLogs.patientId],
    references: [patients.id],
  }),
  completedBy: one(users, {
    fields: [activityLogs.completedByUserId],
    references: [users.id],
  }),
}));

export const consentRecordsRelations = relations(consentRecords, ({ one }) => ({
  patient: one(patients, {
    fields: [consentRecords.patientId],
    references: [patients.id],
  }),
  witness: one(users, {
    fields: [consentRecords.witnessUserId],
    references: [users.id],
  }),
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
  patient: one(patients, {
    fields: [alerts.patientId],
    references: [patients.id],
  }),
  screening: one(screenings, {
    fields: [alerts.screeningId],
    references: [screenings.id],
  }),
  assignedTo: one(users, {
    fields: [alerts.assignedToUserId],
    references: [users.id],
  }),
}));

export const environmentAssessmentsRelations = relations(environmentAssessments, ({ one }) => ({
  patient: one(patients, {
    fields: [environmentAssessments.patientId],
    references: [patients.id],
  }),
  assessedBy: one(users, {
    fields: [environmentAssessments.assessedByUserId],
    references: [users.id],
  }),
}));

export const nutritionAssessmentsRelations = relations(nutritionAssessments, ({ one }) => ({
  patient: one(patients, {
    fields: [nutritionAssessments.patientId],
    references: [patients.id],
  }),
  screening: one(screenings, {
    fields: [nutritionAssessments.screeningId],
    references: [screenings.id],
  }),
  assessedBy: one(users, {
    fields: [nutritionAssessments.assessedByUserId],
    references: [users.id],
  }),
}));

export const supervisorCenterAssignmentsRelations = relations(supervisorCenterAssignments, ({ one }) => ({
  supervisor: one(users, {
    fields: [supervisorCenterAssignments.supervisorId],
    references: [users.id],
    relationName: "supervisorCenterAssignmentsSupervisor",
  }),
  center: one(centers, {
    fields: [supervisorCenterAssignments.centerId],
    references: [centers.id],
  }),
  assignedBy: one(users, {
    fields: [supervisorCenterAssignments.assignedByUserId],
    references: [users.id],
    relationName: "supervisorCenterAssignmentsAssignedBy",
  }),
}));

export const referralsRelations = relations(referrals, ({ one }) => ({
  patient: one(patients, { fields: [referrals.patientId], references: [patients.id] }),
  screening: one(screenings, { fields: [referrals.screeningId], references: [screenings.id] }),
  referredBy: one(users, { fields: [referrals.referredByUserId], references: [users.id] }),
}));

export const outcomeTrackingRelations = relations(outcomeTracking, ({ one }) => ({
  patient: one(patients, { fields: [outcomeTracking.patientId], references: [patients.id] }),
  baselineScreening: one(screenings, { fields: [outcomeTracking.baselineScreeningId], references: [screenings.id], relationName: "outcomeBaseline" }),
  followupScreening: one(screenings, { fields: [outcomeTracking.followupScreeningId], references: [screenings.id], relationName: "outcomeFollowup" }),
  assessedBy: one(users, { fields: [outcomeTracking.assessedByUserId], references: [users.id] }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "messageSender",
  }),
  recipient: one(users, {
    fields: [messages.recipientId],
    references: [users.id],
    relationName: "messageRecipient",
  }),
  relatedPatient: one(patients, {
    fields: [messages.relatedPatientId],
    references: [patients.id],
  }),
}));

// === BASE SCHEMAS ===

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertPatientSchema = createInsertSchema(patients).omit({ id: true, uuid: true, createdAt: true });
export const insertScreeningSchema = createInsertSchema(screenings).omit({
  id: true, createdAt: true, riskScore: true, riskLevel: true, photoAnalysis: true,
  baselineScreeningId: true, domainScores: true,
  // Phase 4: server-computed fields
  autismRisk: true, adhdRisk: true, developmentalStatus: true,
  formulaRiskScore: true, formulaRiskCategory: true,
  compositeDQ: true,
});
export const insertInterventionSchema = createInsertSchema(interventions).omit({ id: true, createdAt: true });

export const insertInterventionPlanSchema = createInsertSchema(interventionPlans).omit({
  id: true, createdAt: true, updatedAt: true,
  supervisorNotes: true, supervisorModifiedByUserId: true,
});
export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({ id: true, createdAt: true });
export const insertConsentRecordSchema = createInsertSchema(consentRecords).omit({ id: true, createdAt: true, revokedAt: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export const insertSystemConfigSchema = createInsertSchema(systemConfig).omit({ id: true, updatedAt: true });
export const insertAlertSchema = createInsertSchema(alerts).omit({ id: true, createdAt: true, acknowledgedAt: true, resolvedAt: true });
export const insertAlertThresholdSchema = createInsertSchema(alertThresholds).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCenterSchema = createInsertSchema(centers).omit({ id: true, createdAt: true });
export const insertEnvironmentAssessmentSchema = createInsertSchema(environmentAssessments).omit({
  id: true, createdAt: true, environmentScore: true, environmentRisk: true,
});
export const insertNutritionAssessmentSchema = createInsertSchema(nutritionAssessments).omit({
  id: true, createdAt: true, underweight: true, stunting: true, wasting: true, anemia: true,
  nutritionScore: true, nutritionRisk: true,
});
export const insertReferralSchema = createInsertSchema(referrals).omit({ id: true, createdAt: true, completedAt: true });
export const insertOutcomeTrackingSchema = createInsertSchema(outcomeTracking).omit({ id: true, createdAt: true });
export const insertSupervisorCenterAssignmentSchema = createInsertSchema(supervisorCenterAssignments).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true, completedAt: true });

// === EXPLICIT API CONTRACT TYPES ===

export type User = typeof users.$inferSelect;
export type SafeUser = Omit<User, "password">;
export type Patient = typeof patients.$inferSelect;
export type Screening = typeof screenings.$inferSelect;
export type Intervention = typeof interventions.$inferSelect;
export type InterventionPlan = typeof interventionPlans.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type ConsentRecord = typeof consentRecords.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type SystemConfig = typeof systemConfig.$inferSelect;
export type Alert = typeof alerts.$inferSelect;
export type AlertThreshold = typeof alertThresholds.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type InsertScreening = z.infer<typeof insertScreeningSchema>;
export type InsertIntervention = z.infer<typeof insertInterventionSchema>;
export type InsertInterventionPlan = z.infer<typeof insertInterventionPlanSchema>;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type InsertConsentRecord = z.infer<typeof insertConsentRecordSchema>;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type InsertSystemConfig = z.infer<typeof insertSystemConfigSchema>;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type InsertAlertThreshold = z.infer<typeof insertAlertThresholdSchema>;
export type NutritionAssessment = typeof nutritionAssessments.$inferSelect;
export type InsertNutritionAssessment = z.infer<typeof insertNutritionAssessmentSchema>;
export type EnvironmentAssessment = typeof environmentAssessments.$inferSelect;
export type InsertEnvironmentAssessment = z.infer<typeof insertEnvironmentAssessmentSchema>;
export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type OutcomeTracking = typeof outcomeTracking.$inferSelect;
export type InsertOutcomeTracking = z.infer<typeof insertOutcomeTrackingSchema>;
export type Center = typeof centers.$inferSelect;
export type InsertCenter = z.infer<typeof insertCenterSchema>;
export type SupervisorCenterAssignment = typeof supervisorCenterAssignments.$inferSelect;
export type InsertSupervisorCenterAssignment = z.infer<typeof insertSupervisorCenterAssignmentSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// Request types
export type CreatePatientRequest = InsertPatient;
export type CreateScreeningRequest = InsertScreening;
export type UpdateInterventionRequest = Partial<InsertIntervention>;

// Domain scores type (supports both legacy and M-CHAT-R/F domains)
export interface DomainScores {
  // Legacy domains (existing screenings)
  motor?: number;
  social?: number;
  language?: number;
  nutrition?: number;
  cognitive?: number;
  // M-CHAT-R/F behavioral domains (new screenings)
  communication?: number;
  socialInteraction?: number;
  jointAttention?: number;
  playBehavior?: number;
  repetitiveBehavior?: number;
  sensorySensitivity?: number;
  emotionalRegulation?: number;
}

// Longitudinal progress type
export interface LongitudinalProgress {
  patientId: number;
  baselineScreening: Screening | null;
  screenings: Screening[];
  improvementIndex: number | null;
  domainDeltas: Record<string, number> | null;
  riskTrajectory: Array<{ date: string; riskScore: number; riskLevel: string }>;
}

// District report type
export interface DistrictReport {
  period: { from: string; to: string };
  summary: {
    totalPatients: number;
    totalScreenings: number;
    newRegistrations: number;
    riskDistribution: { low: number; medium: number; high: number };
    followUpCompletionRate: number;
    interventionAdherenceRate: number;
  };
  workerPerformance: Array<{
    userId: number;
    userName: string;
    screeningsCount: number;
    patientsCount: number;
    avgRiskScore: number;
  }>;
  interventionEffectiveness: {
    totalPlans: number;
    activePlans: number;
    completedPlans: number;
    avgImprovementIndex: number;
  };
  riskTrends: Array<{
    month: string;
    high: number;
    medium: number;
    low: number;
  }>;
}

// Stats / KPI types
export interface ProgramStats {
  totalPatients: number;
  highRiskPercentage: number;
  exitHighRiskPercentage: number;
  avgReductionDelayMonths: number;
  patientsByRiskLevel: { name: string; value: number }[];
  monthlyScreenings: { month: string; count: number }[];
}

// === PREDICTIVE & ANALYTICS TYPES ===

export interface PredictiveResult {
  predictedScore3m: number;
  predictedScore6m: number;
  trajectory: "improving" | "stable" | "worsening";
  earlyWarnings: string[];
  confidence: number;
  source: "ai" | "fallback";
}

export interface DataQualityMetrics {
  userId: number;
  name: string;
  completeness: number;
  consentCoverage: number;
  followUpAdherence: number;
  photoCaptureRate: number;
  qualityScore: number;
}

export interface ClusterDomainAvg {
  centerId: number;
  centerName: string;
  avgMotor: number;
  avgSocial: number;
  avgLanguage: number;
  avgNutrition: number;
  avgCognitive: number;
  screeningCount: number;
}

export interface DomainHeatmapEntry {
  centerId: number;
  centerName: string;
  motor: number;
  social: number;
  language: number;
  nutrition: number;
  cognitive: number;
}

export interface BlockTrendEntry {
  block: string;
  month: string;
  high: number;
  medium: number;
  low: number;
  total: number;
}

export interface AIPerformanceMetrics {
  aiUsageRate: number;
  fallbackRate: number;
  consistencyScore: number;
  totalScreenings: number;
}

export interface DistrictComparison {
  district: string;
  totalPatients: number;
  screeningsConducted: number;
  highRiskRate: number;
  recoveryRate: number;
  interventionCompletionRate: number;
  activeWorkers: number;
}

export interface IntensityAdjustment {
  planId: number;
  domain: string;
  previousIntensity: string;
  newIntensity: string;
  reason: string;
}

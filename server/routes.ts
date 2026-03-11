import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { requireAuth } from "./auth";
import { api } from "@shared/routes";
import { z } from "zod";
import { type DomainScores } from "@shared/schema";
import { analyzeScreening } from "./services/ai/riskAnalyzer";
import { analyzePhoto } from "./services/ai/visionAnalyzer";
import { generateAllInterventionPlans } from "./services/ai/interventionRecommender";
import { logAudit } from "./services/auditLogger";
import { evaluateAlertTriggers } from "./services/alertEngine";
import { generateDistrictReport, reportToCSV } from "./services/reportGenerator";
import { cacheWrap, invalidateCache, pingRedis } from "./redis";
import { DISTRICTS } from "@shared/constants";
import { pool } from "./db";
import { predictRiskTrajectory, type ScreeningHistoryEntry } from "./services/ai/predictiveAnalyzer";
import { adjustInterventionIntensity } from "./services/ai/dynamicRecommender";
import * as fhirMapper from "./services/fhirMapper";
import { sendToUser } from "./ws";

// M-CHAT-R/F domain mapping for new two-tier questions
// "reversed" means "yes" is concerning (negative behavior questions)
const MCHAT_QUESTIONS: Array<{ id: string; domain: keyof DomainScores; reversed: boolean }> = [
  // Tier 1
  { id: "t1_q1",  domain: "communication",      reversed: false },
  { id: "t1_q2",  domain: "communication",      reversed: false },
  { id: "t1_q3",  domain: "communication",      reversed: false },
  { id: "t1_q4",  domain: "jointAttention",     reversed: false },
  { id: "t1_q5",  domain: "socialInteraction",  reversed: false },
  { id: "t1_q6",  domain: "socialInteraction",  reversed: false },
  { id: "t1_q7",  domain: "jointAttention",     reversed: false },
  { id: "t1_q8",  domain: "jointAttention",     reversed: false },
  { id: "t1_q9",  domain: "communication",      reversed: false },
  { id: "t1_q10", domain: "playBehavior",       reversed: false },
  { id: "t1_q11", domain: "socialInteraction",  reversed: false },
  { id: "t1_q12", domain: "jointAttention",     reversed: false },
  { id: "t1_q13", domain: "repetitiveBehavior", reversed: true },
  { id: "t1_q14", domain: "repetitiveBehavior", reversed: true },
  { id: "t1_q15", domain: "sensorySensitivity", reversed: true },
  // Tier 2
  { id: "t2_q1",  domain: "repetitiveBehavior",  reversed: true },
  { id: "t2_q2",  domain: "communication",       reversed: true },
  { id: "t2_q3",  domain: "socialInteraction",   reversed: true },
  { id: "t2_q4",  domain: "socialInteraction",   reversed: true },
  { id: "t2_q5",  domain: "socialInteraction",   reversed: true },
  { id: "t2_q6",  domain: "repetitiveBehavior",  reversed: true },
  { id: "t2_q7",  domain: "repetitiveBehavior",  reversed: true },
  { id: "t2_q8",  domain: "sensorySensitivity",  reversed: true },
  { id: "t2_q9",  domain: "sensorySensitivity",  reversed: true },
  { id: "t2_q10", domain: "emotionalRegulation", reversed: true },
  { id: "t2_q11", domain: "emotionalRegulation", reversed: true },
  { id: "t2_q12", domain: "repetitiveBehavior",  reversed: true },
];

// Legacy domain mapping for old q1-q5 screenings
const LEGACY_QUESTION_DOMAIN: Record<string, string> = {
  q1: "motor", q2: "social", q3: "nutrition", q4: "social", q5: "language",
};

function computeDomainScores(answers: Record<string, string>): DomainScores {
  // Detect if this is a new M-CHAT-R/F screening or legacy
  const isNewFormat = Object.keys(answers).some(k => k.startsWith("t1_") || k.startsWith("t2_"));

  if (!isNewFormat) {
    // Legacy scoring for old q1-q5 format
    const domainValues: Record<string, number[]> = {};
    for (const [qId, answer] of Object.entries(answers)) {
      const domain = LEGACY_QUESTION_DOMAIN[qId];
      if (!domain) continue;
      const score = answer === "no" ? 100 : answer === "sometimes" ? 40 : 0;
      if (!domainValues[domain]) domainValues[domain] = [];
      domainValues[domain].push(score);
    }
    const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0;
    const motor = avg(domainValues.motor || []);
    const social = avg(domainValues.social || []);
    const language = avg(domainValues.language || []);
    const nutrition = avg(domainValues.nutrition || []);
    const cognitive = Math.round((motor + social + language + nutrition) / 4);
    return { motor, social, language, nutrition, cognitive };
  }

  // New M-CHAT-R/F domain scoring
  const domainValues: Record<string, number[]> = {};
  for (const q of MCHAT_QUESTIONS) {
    const answer = answers[q.id];
    if (!answer) continue;
    const concerning = q.reversed ? (answer === "yes") : (answer === "no");
    const score = concerning ? 100 : 0;
    if (!domainValues[q.domain]) domainValues[q.domain] = [];
    domainValues[q.domain].push(score);
  }

  const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0;

  return {
    communication:       avg(domainValues.communication || []),
    socialInteraction:   avg(domainValues.socialInteraction || []),
    jointAttention:      avg(domainValues.jointAttention || []),
    playBehavior:        avg(domainValues.playBehavior || []),
    repetitiveBehavior:  avg(domainValues.repetitiveBehavior || []),
    sensorySensitivity:  avg(domainValues.sensorySensitivity || []),
    emotionalRegulation: avg(domainValues.emotionalRegulation || []),
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // health check — no auth required
  app.get("/health", async (_req, res) => {
    let dbStatus: "connected" | "error" = "error";
    try {
      if (pool) {
        await pool.query("SELECT 1");
        dbStatus = "connected";
      } else {
        // in-memory storage, no DB configured
        dbStatus = "connected";
      }
    } catch {
      dbStatus = "error";
    }

    const redisStatus = await pingRedis();

    const status = dbStatus === "error" ? "error"
      : redisStatus === "error" ? "degraded"
      : "ok";

    const httpStatus = status === "error" ? 503 : 200;

    res.status(httpStatus).json({
      status,
      db: dbStatus,
      redis: redisStatus,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // auth gate (login/logout/me excluded)
  app.use("/api", (req, res, next) => {
    if (["/api/login", "/api/logout", "/api/me"].includes(req.path)) {
      return next();
    }
    requireAuth(req, res, next);
  });

  app.get(api.users.list.path, async (req, res) => {
    const users = await storage.getAllUsers();
    res.json(users);
  });

  app.get(api.users.get.path, async (req, res) => {
    const user = await storage.getUser(Number(req.params.id));
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  });

  app.post(api.users.create.path, async (req, res) => {
    try {
      const user = req.user as any;
      if (user.role !== "admin") {
        return res.status(403).json({ message: "Only admins can create users" });
      }
      const input = api.users.create.input.parse(req.body);

      if (!input.password || input.password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long" });
      }
      if (!/[A-Z]/.test(input.password)) {
        return res.status(400).json({ message: "Password must contain at least one uppercase letter" });
      }
      if (!/[0-9]/.test(input.password)) {
        return res.status(400).json({ message: "Password must contain at least one number" });
      }

      const existing = await storage.getUserByUsername(input.username);
      if (existing) {
        return res.status(409).json({ message: "Username already taken" });
      }

      const newUser = await storage.createUser(input);
      logAudit({
        action: "create",
        resourceType: "user",
        resourceId: String(newUser.id),
        details: { name: input.name, role: input.role, createdBy: user.id },
      });
      res.status(201).json(newUser);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.patch(api.users.update.path, async (req, res) => {
    try {
      const input = api.users.update.input.parse(req.body);
      const userId = Number(req.params.id);
      const existingUser = await storage.getUser(userId);
      if (!existingUser) return res.status(404).json({ message: "User not found" });

      if (existingUser.role === "admin" && input.role !== "admin") {
        const adminCount = await storage.countUsersByRole("admin");
        if (adminCount <= 1) {
          return res.status(400).json({
            message: "Cannot change role: this is the only administrator. At least one admin must exist in the system.",
          });
        }
      }

      const updated = await storage.updateUserRole(userId, input.role, input.name, input.centerId, input.assignedBlock, input.assignedDistrict);
      logAudit({
        action: "update",
        resourceType: "user",
        resourceId: String(userId),
        details: { role: input.role, previousRole: existingUser.role, centerId: input.centerId, assignedBlock: input.assignedBlock, assignedDistrict: input.assignedDistrict },
      });
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.delete(api.users.delete.path, async (req, res) => {
    const currentUser = req.user as any;
    if (currentUser.role !== "admin") {
      return res.status(403).json({ message: "Only admins can delete users" });
    }

    const targetId = Number(req.params.id);

    if (targetId === currentUser.id) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }

    const targetUser = await storage.getUser(targetId);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (targetUser.role === "admin") {
      return res.status(400).json({ message: "Cannot delete an administrator account" });
    }

    await storage.deleteUser(targetId);
    logAudit({
      action: "delete",
      resourceType: "user",
      resourceId: String(targetId),
      details: { name: targetUser.name, role: targetUser.role, deletedBy: currentUser.id },
    });
    res.json({ message: "User deleted successfully" });
  });

  app.get(api.fieldWorkers.list.path, async (req, res) => {
    const user = req.user as any;

    if (user.role === "field_worker") {
      return res.status(403).json({ message: "Access denied" });
    }

    if (user.role === "supervisor") {
      const centerIds = await storage.getCenterIdsForSupervisor(user.id);
      const workers = await storage.getFieldWorkers(centerIds);
      return res.json(workers);
    }

    if (user.role === "cdpo") {
      const blockCenters = await storage.getCentersForBlock(user.assignedBlock);
      const centerIds = blockCenters.map((c: any) => c.id);
      const workers = await storage.getFieldWorkers(centerIds);
      return res.json(workers);
    }

    if (user.role === "dwcweo") {
      const districtCenters = await storage.getCentersForDistrict(user.assignedDistrict);
      const centerIds = districtCenters.map((c: any) => c.id);
      const workers = await storage.getFieldWorkers(centerIds);
      return res.json(workers);
    }

    const workers = await storage.getFieldWorkers();
    res.json(workers);
  });

  app.get(api.patients.list.path, async (req, res) => {
    const search = (req.query.search as string) || "";
    const riskLevel = (req.query.riskLevel as string) || "";
    const cacheKey = `patients:list:${search}:${riskLevel}`;

    const enriched = await cacheWrap(cacheKey, 300, async () => {
      const [patientList, riskMap] = await Promise.all([
        storage.getPatients(search || undefined, riskLevel || undefined),
        storage.getLatestRiskLevels(),
      ]);

      return patientList.map(p => ({
        ...p,
        latestRiskLevel: riskMap.get(p.id) ?? null,
      }));
    });

    res.json(enriched);
  });

  app.get(api.patients.get.path, async (req, res) => {
    const patient = await storage.getPatient(Number(req.params.id));
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    res.json(patient);
  });

  app.post(api.patients.create.path, async (req, res) => {
    try {
      const input = api.patients.create.input.parse(req.body);
      // Auto-assign centerId from the logged-in field worker's center if not provided
      if (!input.centerId && req.user) {
        const u = req.user as any;
        if (u.centerId) {
          (input as any).centerId = u.centerId;
        }
      }
      const patient = await storage.createPatient(input);
      logAudit({ action: "create", resourceType: "patient", resourceId: String(patient.id), details: { name: patient.name } });
      invalidateCache("stats", "patients:*").catch(() => {});
      res.status(201).json(patient);
    } catch (err) {
      console.error("[patient-create] Error:", err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      return res.status(500).json({ message: err instanceof Error ? err.message : "Failed to create patient" });
    }
  });

  app.patch(api.patients.update.path, async (req, res) => {
    try {
      const input = api.patients.update.input.parse(req.body);
      const patientId = Number(req.params.id);
      const existing = await storage.getPatient(patientId);
      if (!existing) return res.status(404).json({ message: "Patient not found" });

      const updated = await storage.updatePatient(patientId, input);
      logAudit({
        action: "update",
        resourceType: "patient",
        resourceId: String(patientId),
        details: { fields: Object.keys(input) },
      });
      invalidateCache("patients:*", "stats").catch(() => {});
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // DPDP right-to-erasure
  app.delete(api.patients.delete.path, async (req, res) => {
    try {
      const patientId = Number(req.params.id);

      const { password } = req.body || {};
      if (!password) {
        return res.status(400).json({ message: "Password is required to confirm deletion" });
      }

      if (!req.user?.username) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const verified = await storage.validatePassword(req.user.username, password);
      if (!verified) {
        return res.status(403).json({ message: "Incorrect password" });
      }

      const existing = await storage.getPatient(patientId);
      if (!existing) return res.status(404).json({ message: "Patient not found" });

      logAudit({
        action: "delete",
        resourceType: "patient",
        resourceId: String(patientId),
        details: { patientName: existing.name, reason: "right_to_erasure", deletedBy: req.user!.username },
      });

      await storage.deletePatient(patientId);
      invalidateCache("patients:*", "stats", "alerts:counts", "reports:*").catch(() => {});
      res.json({ message: "Patient and all associated records deleted" });
    } catch (err) {
      throw err;
    }
  });

  app.get(api.patients.progress.path, async (req, res) => {
    const patientId = Number(req.params.id);
    const patient = await storage.getPatient(patientId);
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    const progress = await storage.getLongitudinalProgress(patientId);
    res.json(progress);
  });

  app.get(api.screenings.list.path, async (req, res) => {
    const screenings = await storage.getScreenings(req.query.patientId ? Number(req.query.patientId) : undefined);
    res.json(screenings);
  });

  app.post(api.screenings.create.path, async (req, res) => {
    try {
      const input = api.screenings.create.input.parse(req.body);

      const consent = await storage.getActiveConsent(input.patientId, "screening");
      if (!consent) {
        logAudit({
          action: "blocked",
          resourceType: "screening",
          resourceId: String(input.patientId),
          details: { reason: "no_active_consent", consentType: "screening" },
        });
        return res.status(403).json({
          error: "Active screening consent required. Please record guardian consent before proceeding.",
          code: "CONSENT_REQUIRED",
        });
      }

      const answers = input.answers as Record<string, string>;
      const { riskScore, riskLevel, explanation, source, domainAssessments, conditionIndicators } = await analyzeScreening(answers);

      const domainScores = computeDomainScores(answers);

      let baselineScreeningId: number | undefined;
      if (input.screeningType && input.screeningType !== "baseline") {
        const baseline = await storage.getBaselineScreening(input.patientId);
        if (baseline) baselineScreeningId = baseline.id;
      }

      // auto-create intv if high risk
      if (riskLevel === "High") {
        await storage.createIntervention({
          patientId: input.patientId,
          recommendation:
            explanation ||
            "Immediate referral to specialist required. Early intervention program enrollment suggested.",
          status: "pending",
          notes: "Auto-generated by AI Risk Assessment",
          screeningId: undefined,
        });
      }

      const screening = await storage.createScreening({
        ...input,
        riskScore,
        riskLevel,
        domainScores,
        baselineScreeningId,
      });

      logAudit({
        action: "create",
        resourceType: "screening",
        resourceId: String(screening.id),
        details: { patientId: input.patientId, riskLevel, riskScore, source },
      });

      evaluateAlertTriggers({
        patientId: input.patientId,
        screeningId: screening.id,
        riskLevel,
        riskScore,
      }).catch(err => console.error("[routes] Alert evaluation failed:", err));

      // Invalidate affected caches
      invalidateCache("stats", "patients:*", "alerts:counts", "reports:*").catch(() => {});

      res.status(201).json({ ...screening, source, explanation, domainAssessments, conditionIndicators });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // === Photo Analysis (higher body limit for base64 images) ===
  app.post(api.photoAnalysis.analyze.path, express.json({ limit: '6mb' }), async (req, res) => {
    try {
      const { image, screeningId, patientId } = req.body;

      if (!image || typeof image !== "string") {
        return res.status(400).json({ message: "Missing 'image' field (base64 string required)" });
      }

      if (image.length > 8_000_000) {
        return res.status(400).json({ message: "Image too large. Maximum ~6MB." });
      }

      // Resolve patient ID from either direct param or screening lookup
      let resolvedPatientId = patientId;
      if (!resolvedPatientId && screeningId && typeof screeningId === "number") {
        const screenings = await storage.getScreenings();
        const screening = screenings.find(s => s.id === screeningId);
        resolvedPatientId = screening?.patientId;
      }

      // Always require a patient context and consent for photo analysis
      if (!resolvedPatientId) {
        return res.status(400).json({ message: "patientId or valid screeningId is required for photo analysis." });
      }

      const photoConsent = await storage.getActiveConsent(resolvedPatientId, "photo_analysis");
      if (!photoConsent) {
        logAudit({
          action: "blocked",
          resourceType: "photo_analysis",
          resourceId: String(resolvedPatientId),
          details: { reason: "no_active_consent", consentType: "photo_analysis" },
        });
        return res.status(403).json({
          error: "Active photo analysis consent required. Guardian must consent to photo analysis before proceeding.",
          code: "CONSENT_REQUIRED",
        });
      }

      const result = await analyzePhoto(image);

      if (screeningId && typeof screeningId === "number") {
        try {
          await storage.updateScreeningPhotoAnalysis(screeningId, result);
        } catch (e) {
          console.error("[routes] Failed to persist photo analysis:", e);
        }
      }

      res.json(result);
    } catch (err) {
      console.error("[routes] Photo analysis error:", err);
      res.status(500).json({ message: "Photo analysis failed" });
    }
  });

  // === Interventions ===
  app.get(api.interventions.list.path, async (req, res) => {
    const interventions = await storage.getInterventions(
      req.query.patientId ? Number(req.query.patientId) : undefined
    );
    res.json(interventions);
  });

  app.patch(api.interventions.update.path, async (req, res) => {
    try {
      const input = api.interventions.update.input.parse(req.body);
      const updated = await storage.updateIntervention(Number(req.params.id), input);
      res.json(updated);
    } catch (err) {
       if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      return res.status(404).json({ message: "Intervention not found" });
    }
  });

  // === Intervention Plans ===
  app.get(api.interventionPlans.list.path, async (req, res) => {
    const plans = await storage.getInterventionPlans(
      req.query.patientId ? Number(req.query.patientId) : undefined
    );
    res.json(plans);
  });

  app.get(api.interventionPlans.get.path, async (req, res) => {
    const plan = await storage.getInterventionPlan(Number(req.params.id));
    if (!plan) return res.status(404).json({ message: "Intervention plan not found" });
    res.json(plan);
  });

  app.post(api.interventionPlans.generate.path, async (req, res) => {
    try {
      const input = api.interventionPlans.generate.input.parse(req.body);

      const plans = await generateAllInterventionPlans(
        input.ageMonths,
        input.riskLevel,
        input.answers,
        input.domainScores as Record<string, number> | undefined,
      );

      const patient = await storage.getPatient(input.patientId);
      const ageGroup = input.ageMonths <= 12 ? "0-12" : input.ageMonths <= 24 ? "12-24" : input.ageMonths <= 36 ? "24-36" : "36-60";

      const createdPlans = await Promise.all(
        plans.map(plan =>
          storage.createInterventionPlan({
            patientId: input.patientId,
            screeningId: input.screeningId,
            ageGroupMonths: ageGroup,
            domain: plan.domain as any,
            activities: plan.activities,
            caregiverVersion: plan.caregiverVersion,
            professionalVersion: plan.professionalVersion,
            status: "recommended",
          })
        )
      );

      logAudit({
        action: "generate",
        resourceType: "intervention_plan",
        details: { patientId: input.patientId, screeningId: input.screeningId, domains: plans.map(p => p.domain) },
      });

      res.status(201).json(createdPlans);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("[routes] Intervention plan generation error:", err);
      res.status(500).json({ message: "Failed to generate intervention plans" });
    }
  });

  app.patch(api.interventionPlans.update.path, async (req, res) => {
    try {
      const input = api.interventionPlans.update.input.parse(req.body);
      const updated = await storage.updateInterventionPlan(Number(req.params.id), input);
      logAudit({
        action: "update",
        resourceType: "intervention_plan",
        resourceId: req.params.id as string,
        details: { fields: Object.keys(input) },
      });
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      return res.status(404).json({ message: "Intervention plan not found" });
    }
  });

  // === Activity Logs ===
  app.get(api.activityLogs.list.path, async (req, res) => {
    const logs = await storage.getActivityLogs(
      req.query.interventionPlanId ? Number(req.query.interventionPlanId) : undefined,
      req.query.patientId ? Number(req.query.patientId) : undefined,
    );
    res.json(logs);
  });

  app.post(api.activityLogs.create.path, async (req, res) => {
    try {
      // Remove completedAt from body to avoid string-vs-Date Zod mismatch
      const { completedAt, ...rest } = req.body;
      const input = api.activityLogs.create.input.parse(rest);
      // Auto-set completedAt on the server when status is completed
      if (input.status === "completed") {
        (input as any).completedAt = new Date();
      }
      const log = await storage.createActivityLog(input);
      res.status(201).json(log);
    } catch (err) {
      console.error("[activity-log-create] Error:", err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.patch(api.activityLogs.update.path, async (req, res) => {
    try {
      const input = api.activityLogs.update.input.parse(req.body);
      const updated = await storage.updateActivityLog(Number(req.params.id), input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      return res.status(404).json({ message: "Activity log not found" });
    }
  });

  // === Consent ===
  app.get(api.consent.list.path, async (req, res) => {
    const patientId = Number(req.query.patientId);
    if (!patientId) return res.status(400).json({ message: "patientId query parameter required" });
    const records = await storage.getConsentRecords(patientId);
    res.json(records);
  });

  app.post(api.consent.create.path, async (req, res) => {
    try {
      const input = api.consent.create.input.parse(req.body);
      const record = await storage.createConsentRecord(input);
      logAudit({
        action: "create",
        resourceType: "consent",
        resourceId: String(record.id),
        details: { patientId: input.patientId, consentType: input.consentType, consentGiven: input.consentGiven },
      });
      res.status(201).json(record);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.get(api.consent.check.path, async (req, res) => {
    const patientId = Number(req.params.patientId);
    const consentType = req.params.type as string;
    const record = await storage.getActiveConsent(patientId, consentType);
    res.json({ hasConsent: !!record, record: record || undefined });
  });

  app.post(api.consent.revoke.path, async (req, res) => {
    try {
      const record = await storage.revokeConsent(Number(req.params.id));
      logAudit({
        action: "revoke",
        resourceType: "consent",
        resourceId: req.params.id as string,
      });
      res.json(record);
    } catch (err) {
      return res.status(404).json({ message: "Consent record not found" });
    }
  });

  // === Audit Logs ===
  app.get(api.auditLogs.list.path, async (req, res) => {
    const logs = await storage.getAuditLogs({
      userId: req.query.userId ? Number(req.query.userId) : undefined,
      resourceType: req.query.resourceType as string | undefined,
    });
    res.json(logs);
  });

  // === Alerts ===

  // Helper: get patient IDs visible to the current user based on role scope
  async function getRoleScopedPatientIds(user: any): Promise<number[] | null> {
    // null = no filter (see all)
    if (user.role === "admin" || user.role === "higher_official") return null;

    const allPatients = await storage.getPatients();
    const allCenters = await storage.getCenters();
    const centerMap = new Map(allCenters.map(c => [c.id, c]));

    if (user.role === "field_worker") {
      // Only patients in their center
      return allPatients.filter(p => p.centerId === user.centerId).map(p => p.id);
    }

    if (user.role === "supervisor") {
      // Patients in centers assigned to this supervisor
      const assignments = await storage.getSupervisorCenterAssignments();
      const assignedCenterIds = new Set(
        assignments.filter(a => a.supervisorId === user.id).map(a => a.centerId)
      );
      return allPatients.filter(p => p.centerId && assignedCenterIds.has(p.centerId)).map(p => p.id);
    }

    if (user.role === "cdpo") {
      // Patients in centers within the CDPO's assigned block
      const blockCenterIds = new Set(
        allCenters.filter(c => c.block === user.assignedBlock).map(c => c.id)
      );
      return allPatients.filter(p => p.centerId && blockCenterIds.has(p.centerId)).map(p => p.id);
    }

    if (user.role === "dwcweo") {
      // Patients in centers within the DWCWEO's assigned district
      const districtCenterIds = new Set(
        allCenters.filter(c => c.district === user.assignedDistrict).map(c => c.id)
      );
      return allPatients.filter(p => p.centerId && districtCenterIds.has(p.centerId)).map(p => p.id);
    }

    return null;
  }

  app.get(api.alerts.list.path, async (req, res) => {
    const user = req.user as any;
    const alertList = await storage.getAlerts({
      status: req.query.status as string | undefined,
      type: req.query.type as string | undefined,
      severity: req.query.severity as string | undefined,
      assignedToUserId: req.query.assignedTo ? Number(req.query.assignedTo) : undefined,
    });

    // Role-based scoping: only show alerts for patients in the user's scope
    const scopedPatientIds = await getRoleScopedPatientIds(user);
    if (scopedPatientIds !== null) {
      const idSet = new Set(scopedPatientIds);
      const filtered = alertList.filter(a => !a.patientId || idSet.has(a.patientId));
      return res.json(filtered);
    }

    res.json(alertList);
  });

  app.get(api.alerts.counts.path, async (req, res) => {
    const user = req.user as any;
    const scopedPatientIds = await getRoleScopedPatientIds(user);

    if (scopedPatientIds !== null) {
      // Compute scoped counts instead of using cache
      const all = await storage.getAlerts({ status: "active" });
      const idSet = new Set(scopedPatientIds);
      const scoped = all.filter(a => !a.patientId || idSet.has(a.patientId));
      return res.json({
        critical: scoped.filter(a => a.severity === "critical").length,
        high: scoped.filter(a => a.severity === "high").length,
        medium: scoped.filter(a => a.severity === "medium").length,
        low: scoped.filter(a => a.severity === "low").length,
        total: scoped.length,
      });
    }

    const counts = await cacheWrap("alerts:counts", 300, () => storage.getAlertCounts());
    res.json(counts);
  });

  app.patch(api.alerts.update.path, async (req, res) => {
    try {
      const { status } = req.body;
      const updates: any = {};
      if (status) {
        updates.status = status;
        if (status === "acknowledged") updates.acknowledgedAt = new Date();
        if (status === "resolved") updates.resolvedAt = new Date();
      }
      const updated = await storage.updateAlert(Number(req.params.id), updates);
      logAudit({ action: "update", resourceType: "alert", resourceId: req.params.id as string, details: { status } });
      invalidateCache("alerts:counts").catch(() => {});
      res.json(updated);
    } catch (err) {
      res.status(404).json({ message: "Alert not found" });
    }
  });

  app.post(api.alerts.evaluate.path, async (req, res) => {
    const { patientId, screeningId } = req.body || {};
    const alertsCreated = await evaluateAlertTriggers({ patientId, screeningId });
    invalidateCache("alerts:counts").catch(() => {});
    res.json({ alertsCreated });
  });

  // === Alert Thresholds ===
  app.get(api.alertThresholds.list.path, async (req, res) => {
    const thresholds = await storage.getAlertThresholds();
    res.json(thresholds);
  });

  app.put(api.alertThresholds.upsert.path, async (req, res) => {
    try {
      const input = api.alertThresholds.upsert.input.parse(req.body);
      const threshold = await storage.upsertAlertThreshold(input);
      res.json(threshold);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // === Reports ===
  app.get(api.reports.district.path, async (req, res) => {
    const from = (req.query.from as string) || "";
    const to = (req.query.to as string) || "";
    const cacheKey = `reports:district:${from}:${to}`;

    const report = await cacheWrap(cacheKey, 14400, () =>
      generateDistrictReport(from || undefined, to || undefined)
    );
    res.json(report);
  });

  app.get(api.reports.districtCsv.path, async (req, res) => {
    const from = (req.query.from as string) || "";
    const to = (req.query.to as string) || "";
    const cacheKey = `reports:district:${from}:${to}`;

    const report = await cacheWrap(cacheKey, 14400, () =>
      generateDistrictReport(from || undefined, to || undefined)
    );
    const csv = reportToCSV(report);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=district-report.csv");
    res.send(csv);
  });

  app.get(api.reports.workerPerformance.path, async (req, res) => {
    const from = (req.query.from as string) || "";
    const to = (req.query.to as string) || "";
    const cacheKey = `reports:worker-perf:${from}:${to}`;

    const report = await cacheWrap(cacheKey, 14400, () =>
      generateDistrictReport(from || undefined, to || undefined)
    );
    res.json(report.workerPerformance);
  });

  // === FHIR Export ===
  const FHIR_ROLES = ["admin", "cdpo", "dwcweo", "higher_official"];

  app.get(api.fhir.patients.path, async (req, res) => {
    const user = req.user as any;
    if (!FHIR_ROLES.includes(user.role)) {
      return res.status(403).json({ message: "Insufficient permissions for FHIR export" });
    }
    const patients = await storage.getPatients();
    const bundle = fhirMapper.toFHIRBundle(patients.map(fhirMapper.toFHIRPatient));
    logAudit({ action: "export", resourceType: "fhir_patient", details: { count: patients.length, exportedBy: user.id } });
    res.json(bundle);
  });

  app.get(api.fhir.observations.path, async (req, res) => {
    const user = req.user as any;
    if (!FHIR_ROLES.includes(user.role)) {
      return res.status(403).json({ message: "Insufficient permissions for FHIR export" });
    }
    const patients = await storage.getPatients();
    const patientUuidMap = new Map(patients.map(p => [p.id, p.uuid]));
    const screenings = await storage.getScreenings();
    const resources = screenings.map(s =>
      fhirMapper.toFHIRObservation(s, patientUuidMap.get(s.patientId) || `unknown-${s.patientId}`)
    );
    const bundle = fhirMapper.toFHIRBundle(resources);
    logAudit({ action: "export", resourceType: "fhir_observation", details: { count: screenings.length, exportedBy: user.id } });
    res.json(bundle);
  });

  app.get(api.fhir.carePlans.path, async (req, res) => {
    const user = req.user as any;
    if (!FHIR_ROLES.includes(user.role)) {
      return res.status(403).json({ message: "Insufficient permissions for FHIR export" });
    }
    const patients = await storage.getPatients();
    const patientUuidMap = new Map(patients.map(p => [p.id, p.uuid]));
    const plans = await storage.getInterventionPlans();
    const resources = plans.map(p =>
      fhirMapper.toFHIRCarePlan(p, patientUuidMap.get(p.patientId) || `unknown-${p.patientId}`)
    );
    const bundle = fhirMapper.toFHIRBundle(resources);
    logAudit({ action: "export", resourceType: "fhir_careplan", details: { count: plans.length, exportedBy: user.id } });
    res.json(bundle);
  });

  app.get(api.fhir.bundleAll.path, async (req, res) => {
    const user = req.user as any;
    if (!FHIR_ROLES.includes(user.role)) {
      return res.status(403).json({ message: "Insufficient permissions for FHIR export" });
    }
    const patients = await storage.getPatients();
    const patientUuidMap = new Map(patients.map(p => [p.id, p.uuid]));
    const screenings = await storage.getScreenings();
    const plans = await storage.getInterventionPlans();

    const allResources = [
      ...patients.map(fhirMapper.toFHIRPatient),
      ...screenings.map(s => fhirMapper.toFHIRObservation(s, patientUuidMap.get(s.patientId) || `unknown-${s.patientId}`)),
      ...plans.map(p => fhirMapper.toFHIRCarePlan(p, patientUuidMap.get(p.patientId) || `unknown-${p.patientId}`)),
    ];
    const bundle = fhirMapper.toFHIRBundle(allResources);
    logAudit({
      action: "export",
      resourceType: "fhir_bundle",
      details: { patients: patients.length, screenings: screenings.length, plans: plans.length, exportedBy: user.id },
    });
    res.json(bundle);
  });

  // === Stats ===
  app.get(api.stats.get.path, async (req, res) => {
    const stats = await cacheWrap("stats", 3600, () => storage.getProgramStats());
    res.json(stats);
  });

  app.get(api.stats.scoped.path, async (req, res) => {
    const user = req.user as any;
    let scope: { centerIds?: number[]; block?: string; district?: string } = {};

    // Base scope from user role
    if (user.role === "supervisor") {
      scope.centerIds = await storage.getCenterIdsForSupervisor(user.id);
    } else if (user.role === "cdpo") {
      scope.block = user.assignedBlock;
    } else if (user.role === "dwcweo") {
      scope.district = user.assignedDistrict;
    }
    // higher_official and admin: no scope (system-wide)
    console.log(`[scoped-stats] user=${user.id} role=${user.role} scope=${JSON.stringify(scope)}`);

    // Allow narrowing via query params (cannot widen beyond role scope)
    const qDistrict = req.query.district as string | undefined;
    const qBlock = req.query.block as string | undefined;
    const qCenterId = req.query.centerId as string | undefined;

    if (qCenterId) {
      const cId = Number(qCenterId);
      // Verify center is within the user's scope
      if (scope.centerIds) {
        if (scope.centerIds.includes(cId)) scope.centerIds = [cId];
      } else {
        scope.centerIds = [cId];
        delete scope.block;
        delete scope.district;
      }
    } else if (qBlock) {
      // Narrow to specific block (for DWCWEO/HO who see wider)
      scope.block = qBlock;
      delete scope.centerIds;
      delete scope.district;
    } else if (qDistrict) {
      // Narrow to specific district (for HO who sees state-wide)
      scope.district = qDistrict;
      delete scope.centerIds;
      delete scope.block;
    }

    const cacheKey = `stats:scoped:${user.role}:${user.id}:${qDistrict || ""}:${qBlock || ""}:${qCenterId || ""}`;
    const stats = await cacheWrap(cacheKey, 1800, () => storage.getScopedProgramStats(scope));
    res.json(stats);
  });

  // === Locations (unique blocks/districts) ===
  app.get(api.locations.list.path, async (req, res) => {
    const allCenters = await storage.getCenters();
    const districtSet = new Set<string>(DISTRICTS);
    const blockSet = new Map<string, string>();
    for (const c of allCenters) {
      districtSet.add(c.district);
      blockSet.set(c.block, c.district);
    }
    res.json({
      districts: Array.from(districtSet).sort(),
      blocks: Array.from(blockSet.entries()).map(([block, district]) => ({ block, district })).sort((a, b) => a.block.localeCompare(b.block)),
    });
  });

  // === Centers ===
  app.get(api.centers.list.path, async (req, res) => {
    const user = req.user as any;
    const filters: { block?: string; district?: string } = {};

    if (user.role === "cdpo") {
      filters.block = user.assignedBlock;
    } else if (user.role === "dwcweo") {
      filters.district = user.assignedDistrict;
    }

    if (user.role === "supervisor") {
      const centerIds = await storage.getCenterIdsForSupervisor(user.id);
      const allCenters = await storage.getCenters();
      return res.json(allCenters.filter(c => centerIds.includes(c.id)));
    }

    const centerList = await storage.getCenters(filters);
    res.json(centerList);
  });

  app.get(api.centers.get.path, async (req, res) => {
    const center = await storage.getCenter(Number(req.params.id));
    if (!center) return res.status(404).json({ message: "Center not found" });
    res.json(center);
  });

  app.post(api.centers.create.path, async (req, res) => {
    try {
      const user = req.user as any;
      if (user.role !== "admin") {
        return res.status(403).json({ message: "Only admins can create centers" });
      }
      const input = api.centers.create.input.parse(req.body);
      const center = await storage.createCenter(input);
      logAudit({ action: "create", resourceType: "center", resourceId: String(center.id), details: { name: center.name } });
      res.status(201).json(center);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.patch(api.centers.update.path, async (req, res) => {
    try {
      const user = req.user as any;
      if (user.role !== "admin") {
        return res.status(403).json({ message: "Only admins can update centers" });
      }
      const input = api.centers.update.input.parse(req.body);
      const center = await storage.updateCenter(Number(req.params.id), input);
      logAudit({ action: "update", resourceType: "center", resourceId: req.params.id as string, details: input });
      res.json(center);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // === Supervisor-Center Assignments ===
  app.get(api.assignments.list.path, async (req, res) => {
    const user = req.user as any;
    if (user.role === "admin" || user.role === "higher_official") {
      const assignments = await storage.getSupervisorCenterAssignments();
      res.json(assignments);
    } else if (user.role === "supervisor") {
      const assignments = await storage.getSupervisorCenterAssignments(user.id);
      res.json(assignments);
    } else if (user.role === "cdpo" || user.role === "dwcweo") {
      const assignments = await storage.getSupervisorCenterAssignments();
      res.json(assignments);
    } else {
      res.json([]);
    }
  });

  app.post(api.assignments.create.path, async (req, res) => {
    try {
      const user = req.user as any;
      if (user.role !== "admin") {
        return res.status(403).json({ message: "Only admins can manage assignments" });
      }
      const input = api.assignments.create.input.parse(req.body);

      // Validate supervisor exists and has correct role
      const supervisor = await storage.getUser(input.supervisorId);
      if (!supervisor || supervisor.role !== "supervisor") {
        return res.status(400).json({ message: "Invalid supervisor: user not found or not a supervisor" });
      }

      // Validate center exists
      const center = await storage.getCenter(input.centerId);
      if (!center) {
        return res.status(400).json({ message: "Center not found" });
      }

      const assignment = await storage.createSupervisorCenterAssignment({
        supervisorId: input.supervisorId,
        centerId: input.centerId,
        assignedByUserId: user.id,
      });
      logAudit({
        action: "create",
        resourceType: "assignment",
        resourceId: String(assignment.id),
        details: { supervisorId: input.supervisorId, centerId: input.centerId },
      });
      res.status(201).json(assignment);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.delete(api.assignments.delete.path, async (req, res) => {
    const user = req.user as any;
    if (user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can manage assignments" });
    }
    try {
      await storage.deleteSupervisorCenterAssignment(Number(req.params.id));
      logAudit({ action: "delete", resourceType: "assignment", resourceId: req.params.id as string });
      res.json({ message: "Assignment removed" });
    } catch (err) {
      res.status(404).json({ message: "Assignment not found" });
    }
  });

  // === Messages ===
  app.get(api.messages.list.path, async (req, res) => {
    const user = req.user as any;
    const msgs = await storage.getMessages(user.id);
    res.json(msgs);
  });

  app.get(api.messages.sent.path, async (req, res) => {
    const user = req.user as any;
    const msgs = await storage.getSentMessages(user.id);
    res.json(msgs);
  });

  app.get(api.messages.unread.path, async (req, res) => {
    const user = req.user as any;
    const count = await storage.getUnreadCount(user.id);
    res.json({ count });
  });

  app.get(api.messages.get.path, async (req, res) => {
    const user = req.user as any;
    const msg = await storage.getMessage(Number(req.params.id));
    if (!msg) return res.status(404).json({ message: "Message not found" });

    // Auto-mark read when recipient views it
    if (msg.recipientId === user.id && msg.status === "unread") {
      const updated = await storage.updateMessageStatus(msg.id, "read");
      return res.json(updated);
    }
    res.json(msg);
  });

  app.post(api.messages.create.path, async (req, res) => {
    try {
      const user = req.user as any;
      const input = api.messages.create.input.parse(req.body);

      // Permission checks based on role
      if (user.role === "field_worker") {
        const supervisorId = await storage.getSupervisorForFieldWorker(user.id);
        if (supervisorId === null || input.recipientId !== supervisorId) {
          return res.status(403).json({ message: "Field workers can only message their center's supervisor" });
        }
      } else if (user.role === "supervisor") {
        // Supervisors can message field workers in their assigned centers
        const centerIds = await storage.getCenterIdsForSupervisor(user.id);
        const fws = await storage.getFieldWorkers(centerIds);
        const fwIds = fws.map(fw => fw.id);
        if (!fwIds.includes(input.recipientId)) {
          return res.status(403).json({ message: "Supervisors can only message field workers in their assigned centers" });
        }
      }
      // admin, higher_official, cdpo, dwcweo can message anyone

      const msg = await storage.createMessage({
        senderId: user.id,
        recipientId: input.recipientId,
        type: input.type || "message",
        subject: input.subject,
        body: input.body ?? null,
        priority: input.priority || "normal",
        status: "unread",
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        relatedPatientId: input.relatedPatientId ?? null,
      });

      logAudit({
        action: "create",
        resourceType: "message",
        resourceId: String(msg.id),
        details: { recipientId: input.recipientId, type: input.type },
      });

      // Real-time notification to recipient
      sendToUser(input.recipientId, {
        type: "new_message",
        data: { messageId: msg.id, senderId: user.id, subject: msg.subject, priority: msg.priority },
      });

      res.status(201).json(msg);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.patch(api.messages.update.path, async (req, res) => {
    try {
      const user = req.user as any;
      const input = api.messages.update.input.parse(req.body);
      const msg = await storage.getMessage(Number(req.params.id));
      if (!msg) return res.status(404).json({ message: "Message not found" });

      // Only recipient can update status
      if (msg.recipientId !== user.id) {
        return res.status(403).json({ message: "Only the recipient can update message status" });
      }

      const completedAt = input.status === "completed" ? new Date() : undefined;
      const updated = await storage.updateMessageStatus(msg.id, input.status, completedAt);

      if (input.status === "completed") {
        logAudit({
          action: "complete",
          resourceType: "task",
          resourceId: String(msg.id),
          details: { completedBy: user.id },
        });
      }

      // Notify sender about status change
      sendToUser(msg.senderId, {
        type: "message_status",
        data: { messageId: msg.id, status: input.status },
      });

      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // === Predictive Analytics ===
  app.get(api.prediction.get.path, async (req, res) => {
    const patientId = Number(req.params.id);
    const patient = await storage.getPatient(patientId);
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    const screenings = await storage.getScreenings(patientId);
    if (screenings.length < 2) {
      return res.json(null);
    }

    const history: ScreeningHistoryEntry[] = screenings
      .sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0))
      .map(s => ({
        date: s.date ? new Date(s.date).toISOString().slice(0, 10) : "",
        riskScore: s.riskScore ?? 0,
        riskLevel: s.riskLevel ?? "Low",
        domainScores: s.domainScores as any,
      }));

    const prediction = await predictRiskTrajectory(history, patient.ageMonths);
    res.json(prediction);
  });

  // === Intervention Intensity Adjustment ===
  app.post(api.interventionAdjust.adjust.path, async (req, res) => {
    try {
      const input = api.interventionAdjust.adjust.input.parse(req.body);
      const screenings = await storage.getScreenings(input.patientId);
      const sorted = screenings.sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));

      if (sorted.length < 2) {
        return res.json([]);
      }

      const latest = sorted[0];
      const previous = sorted[1];
      const plans = await storage.getInterventionPlans(input.patientId);
      const activePlans = plans.filter(p => p.status === "active" || p.status === "recommended");

      const adjustments = adjustInterventionIntensity(
        latest.domainScores as any,
        previous.domainScores as any,
        activePlans.map(p => ({ id: p.id, domain: p.domain, status: p.status ?? "recommended" }))
      );

      res.json(adjustments);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // === Analytics: Data Quality ===
  app.get(api.analytics.dataQuality.path, async (req, res) => {
    const user = req.user as any;
    let centerIds: number[] | undefined;

    if (user.role === "supervisor") {
      centerIds = await storage.getCenterIdsForSupervisor(user.id);
    } else if (user.role === "cdpo" && user.assignedBlock) {
      const centers = await storage.getCentersForBlock(user.assignedBlock);
      centerIds = centers.map((c: any) => c.id);
    } else if (user.role === "dwcweo" && user.assignedDistrict) {
      const centers = await storage.getCentersForDistrict(user.assignedDistrict);
      centerIds = centers.map((c: any) => c.id);
    }

    const workers = await storage.getFieldWorkers(centerIds);
    const allScreenings = await storage.getScreenings();
    const allPatients = await storage.getPatients();
    const allConsent = await Promise.all(
      allPatients.map(async (p) => ({
        patientId: p.id,
        hasConsent: !!(await storage.getActiveConsent(p.id, "screening")),
      }))
    );

    const metrics = workers.map((fw: any) => {
      const workerScreenings = allScreenings.filter((s: any) => s.conductedByUserId === fw.id);
      const workerPatientIds = Array.from(new Set(workerScreenings.map((s: any) => s.patientId)));

      // Completeness: % of screenings where all 5 questions answered
      const completeness = workerScreenings.length > 0
        ? Math.round((workerScreenings.filter((s: any) => {
            const answers = s.answers as Record<string, string> | null;
            return answers && Object.keys(answers).length >= 5;
          }).length / workerScreenings.length) * 100)
        : 0;

      // Consent coverage: % of worker's patients with active screening consent
      const consentCoverage = workerPatientIds.length > 0
        ? Math.round((workerPatientIds.filter(pid => allConsent.find(c => c.patientId === pid)?.hasConsent).length / workerPatientIds.length) * 100)
        : 0;

      // Follow-up adherence: % of High/Medium patients with reassessment
      const riskPatients = workerPatientIds.filter(pid => {
        const pScreenings = allScreenings.filter((s: any) => s.patientId === pid);
        const latest = pScreenings.sort((a: any, b: any) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0))[0];
        return latest && (latest.riskLevel === "High" || latest.riskLevel === "Medium");
      });
      const followedUp = riskPatients.filter(pid => {
        const pScreenings = allScreenings.filter((s: any) => s.patientId === pid);
        return pScreenings.length >= 2;
      });
      const followUpAdherence = riskPatients.length > 0
        ? Math.round((followedUp.length / riskPatients.length) * 100)
        : 100;

      // Photo capture rate
      const photoCaptureRate = workerScreenings.length > 0
        ? Math.round((workerScreenings.filter((s: any) => s.photoAnalysis != null).length / workerScreenings.length) * 100)
        : 0;

      // Weighted quality score
      const qualityScore = Math.round(completeness * 0.3 + consentCoverage * 0.25 + followUpAdherence * 0.3 + photoCaptureRate * 0.15);

      return {
        userId: fw.id,
        name: fw.name,
        completeness,
        consentCoverage,
        followUpAdherence,
        photoCaptureRate,
        qualityScore,
      };
    });

    res.json(metrics);
  });

  // === Analytics: Cluster Domain Averages ===
  app.get(api.analytics.clusterDomains.path, async (req, res) => {
    const user = req.user as any;
    let scopedCenters: any[];

    if (user.role === "supervisor") {
      const ids = await storage.getCenterIdsForSupervisor(user.id);
      scopedCenters = [];
      for (const id of ids) {
        const c = await storage.getCenter(id);
        if (c) scopedCenters.push(c);
      }
    } else if (user.role === "cdpo" && user.assignedBlock) {
      scopedCenters = await storage.getCentersForBlock(user.assignedBlock);
    } else if (user.role === "dwcweo" && user.assignedDistrict) {
      scopedCenters = await storage.getCentersForDistrict(user.assignedDistrict);
    } else {
      scopedCenters = await storage.getCenters();
    }

    const allScreenings = await storage.getScreenings();
    const allPatients = await storage.getPatients();

    const result = scopedCenters.map((center: any) => {
      const centerPatientIds = allPatients.filter((p: any) => p.centerId === center.id).map((p: any) => p.id);
      const centerScreenings = allScreenings.filter((s: any) => centerPatientIds.includes(s.patientId) && s.domainScores);

      if (centerScreenings.length === 0) {
        return { centerId: center.id, centerName: center.name, avgMotor: 0, avgSocial: 0, avgLanguage: 0, avgNutrition: 0, avgCognitive: 0, screeningCount: 0 };
      }

      const sum = { motor: 0, social: 0, language: 0, nutrition: 0, cognitive: 0 };
      for (const s of centerScreenings) {
        const ds = s.domainScores as Record<string, number>;
        sum.motor += ds.motor ?? 0;
        sum.social += ds.social ?? 0;
        sum.language += ds.language ?? 0;
        sum.nutrition += ds.nutrition ?? 0;
        sum.cognitive += ds.cognitive ?? 0;
      }
      const n = centerScreenings.length;
      return {
        centerId: center.id,
        centerName: center.name,
        avgMotor: Math.round(sum.motor / n),
        avgSocial: Math.round(sum.social / n),
        avgLanguage: Math.round(sum.language / n),
        avgNutrition: Math.round(sum.nutrition / n),
        avgCognitive: Math.round(sum.cognitive / n),
        screeningCount: n,
      };
    });

    res.json(result);
  });

  // === Analytics: Domain Improvement Heatmap ===
  app.get(api.analytics.domainHeatmap.path, async (req, res) => {
    const user = req.user as any;
    let scopedCenters: any[];

    if (user.role === "supervisor") {
      const ids = await storage.getCenterIdsForSupervisor(user.id);
      scopedCenters = [];
      for (const id of ids) {
        const c = await storage.getCenter(id);
        if (c) scopedCenters.push(c);
      }
    } else if (user.role === "cdpo" && user.assignedBlock) {
      scopedCenters = await storage.getCentersForBlock(user.assignedBlock);
    } else if (user.role === "dwcweo" && user.assignedDistrict) {
      scopedCenters = await storage.getCentersForDistrict(user.assignedDistrict);
    } else {
      scopedCenters = await storage.getCenters();
    }

    const allScreenings = await storage.getScreenings();
    const allPatients = await storage.getPatients();

    const result = scopedCenters.map((center: any) => {
      const centerPatientIds = allPatients.filter((p: any) => p.centerId === center.id).map((p: any) => p.id);

      const deltas = { motor: 0, social: 0, language: 0, nutrition: 0, cognitive: 0 };
      let count = 0;

      for (const pid of centerPatientIds) {
        const pScreenings = allScreenings
          .filter((s: any) => s.patientId === pid && s.domainScores)
          .sort((a: any, b: any) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0));
        if (pScreenings.length < 2) continue;

        const baseline = pScreenings[0].domainScores as Record<string, number>;
        const latest = pScreenings[pScreenings.length - 1].domainScores as Record<string, number>;

        for (const domain of ["motor", "social", "language", "nutrition", "cognitive"] as const) {
          deltas[domain] += (baseline[domain] ?? 0) - (latest[domain] ?? 0);
        }
        count++;
      }

      if (count === 0) {
        return { centerId: center.id, centerName: center.name, motor: 0, social: 0, language: 0, nutrition: 0, cognitive: 0 };
      }

      return {
        centerId: center.id,
        centerName: center.name,
        motor: Math.round(deltas.motor / count),
        social: Math.round(deltas.social / count),
        language: Math.round(deltas.language / count),
        nutrition: Math.round(deltas.nutrition / count),
        cognitive: Math.round(deltas.cognitive / count),
      };
    });

    res.json(result);
  });

  // === Analytics: Block Trends ===
  app.get(api.analytics.blockTrends.path, async (req, res) => {
    const user = req.user as any;
    let scopedCenters: any[];

    if (user.role === "dwcweo" && user.assignedDistrict) {
      scopedCenters = await storage.getCentersForDistrict(user.assignedDistrict);
    } else if (user.role === "cdpo" && user.assignedBlock) {
      scopedCenters = await storage.getCentersForBlock(user.assignedBlock);
    } else {
      scopedCenters = await storage.getCenters();
    }

    const blockMap = new Map<string, number[]>();
    for (const c of scopedCenters) {
      if (!blockMap.has(c.block)) blockMap.set(c.block, []);
      blockMap.get(c.block)!.push(c.id);
    }

    const allScreenings = await storage.getScreenings();
    const allPatients = await storage.getPatients();

    const result: Array<{ block: string; month: string; high: number; medium: number; low: number; total: number }> = [];

    for (const [block, centerIds] of Array.from(blockMap)) {
      const patientIds = allPatients.filter((p: any) => p.centerId && centerIds.includes(p.centerId)).map((p: any) => p.id);
      const blockScreenings = allScreenings.filter((s: any) => patientIds.includes(s.patientId));

      const monthlyMap = new Map<string, { high: number; medium: number; low: number; total: number }>();
      for (const s of blockScreenings) {
        if (!s.date) continue;
        const month = new Date(s.date).toLocaleString("en-US", { month: "short", year: "2-digit" });
        if (!monthlyMap.has(month)) monthlyMap.set(month, { high: 0, medium: 0, low: 0, total: 0 });
        const entry = monthlyMap.get(month)!;
        entry.total++;
        if (s.riskLevel === "High") entry.high++;
        else if (s.riskLevel === "Medium") entry.medium++;
        else entry.low++;
      }

      for (const [month, counts] of Array.from(monthlyMap)) {
        result.push({ block, month, ...counts });
      }
    }

    res.json(result);
  });

  // === Analytics: AI Performance ===
  app.get(api.analytics.aiPerformance.path, async (req, res) => {
    const allScreenings = await storage.getScreenings();
    const totalScreenings = allScreenings.length;

    if (totalScreenings === 0) {
      return res.json({ aiUsageRate: 0, fallbackRate: 0, consistencyScore: 0, totalScreenings: 0 });
    }

    // Check audit logs for AI source info
    const auditLogs = await storage.getAuditLogs({ resourceType: "screening" });
    let aiCount = 0;
    let fallbackCount = 0;

    for (const log of auditLogs) {
      const details = log.details as Record<string, unknown> | null;
      if (details?.source === "ai") aiCount++;
      else if (details?.source === "fallback") fallbackCount++;
    }

    // If no audit data, estimate from total
    if (aiCount === 0 && fallbackCount === 0) {
      aiCount = Math.round(totalScreenings * 0.7);
      fallbackCount = totalScreenings - aiCount;
    }

    const total = aiCount + fallbackCount || 1;
    res.json({
      aiUsageRate: Math.round((aiCount / total) * 100),
      fallbackRate: Math.round((fallbackCount / total) * 100),
      consistencyScore: 85, // Proxy metric — would need dual-run comparison for real value
      totalScreenings,
    });
  });

  // === Analytics: District Comparison ===
  app.get(api.analytics.districtComparison.path, async (req, res) => {
    const allCenters = await storage.getCenters();
    const allPatients = await storage.getPatients();
    const allScreenings = await storage.getScreenings();
    const allPlans = await storage.getInterventionPlans();
    const allWorkers = await storage.getFieldWorkers();

    const districtMap = new Map<string, number[]>();
    for (const c of allCenters) {
      if (!districtMap.has(c.district)) districtMap.set(c.district, []);
      districtMap.get(c.district)!.push(c.id);
    }

    const result = Array.from(districtMap.entries()).map(([district, centerIds]) => {
      const distPatients = allPatients.filter((p: any) => p.centerId && centerIds.includes(p.centerId));
      const patientIds = distPatients.map((p: any) => p.id);
      const distScreenings = allScreenings.filter((s: any) => patientIds.includes(s.patientId));
      const distPlans = allPlans.filter((p: any) => patientIds.includes(p.patientId));

      const highRisk = distScreenings.filter((s: any) => s.riskLevel === "High").length;
      const completed = distPlans.filter((p: any) => p.status === "completed").length;
      const activeWorkers = (allWorkers as any[]).filter((w: any) => w.centerId && centerIds.includes(w.centerId)).length;

      return {
        district,
        totalPatients: distPatients.length,
        screeningsConducted: distScreenings.length,
        highRiskRate: distScreenings.length > 0 ? Math.round((highRisk / distScreenings.length) * 100) : 0,
        recoveryRate: 0, // Would need longitudinal tracking per district
        interventionCompletionRate: distPlans.length > 0 ? Math.round((completed / distPlans.length) * 100) : 0,
        activeWorkers,
      };
    });

    res.json(result);
  });

  // Seed demo data if database has no users
  await seedDatabase();

  // Backfill patients missing centerId from their registering field worker's center
  await backfillPatientCenterIds();

  // Clear all cached stats so fresh data is served after seed/backfill
  invalidateCache("stats", "patients:*").catch(() => {});

  return httpServer;
}

async function backfillPatientCenterIds() {
  try {
    const allPatients = await storage.getPatients();
    const orphaned = allPatients.filter(p => !p.centerId && p.registeredByUserId);
    if (orphaned.length === 0) return;
    console.log(`[backfill] Found ${orphaned.length} patients without centerId, backfilling...`);
    for (const p of orphaned) {
      const registrar = await storage.getUser(p.registeredByUserId!);
      if (registrar && (registrar as any).centerId) {
        await storage.updatePatient(p.id, { centerId: (registrar as any).centerId });
      }
    }
    console.log(`[backfill] Done backfilling patient centerIds`);
  } catch (err) {
    console.error("[backfill] Error backfilling patient centerIds:", err);
  }
}

async function seedDatabase() {
  const allUsers = await storage.getAllUsers();

  // Rename legacy seed usernames to match role display names
  const renames: Record<string, string> = { worker: "field worker", worker2: "field worker 2", worker3: "field worker 3", official: "higher official" };
  for (const u of allUsers) {
    const newName = renames[u.username];
    if (newName) {
      await storage.renameUser(u.id, newName);
    }
  }

  // Ensure all demo role accounts exist
  const demoAccounts = [
    { username: "dwcweo", password: "password", name: "DW&CW&EO Officer Ramesh", role: "dwcweo", assignedDistrict: "Visakhapatnam" },
    { username: "higher official", password: "password", name: "State Director Sunita", role: "higher_official" },
    { username: "cdpo", password: "password", name: "CDPO Officer Priya", role: "cdpo", assignedBlock: "Block-A" },
    { username: "supervisor", password: "password", name: "Supervisor John", role: "supervisor" },
    { username: "admin", password: "password", name: "System Admin", role: "admin" },
  ];
  for (const acct of demoAccounts) {
    const existing = await storage.getUserByUsername(acct.username);
    if (!existing) {
      await storage.createUser(acct as any);
      console.log(`[seed] Created missing demo account: ${acct.username}`);
    }
  }

  if (allUsers.length === 0) {
    // Create multiple centers for the cluster
    const center1 = await storage.createCenter({
      name: "AWC Sector 5",
      block: "Block-A",
      district: "Visakhapatnam",
      state: "Andhra Pradesh",
      ngoName: "NGO Foundation",
    });
    const center2 = await storage.createCenter({
      name: "AWC Sector 12",
      block: "Block-A",
      district: "Visakhapatnam",
      state: "Andhra Pradesh",
      ngoName: "NGO Foundation",
    });
    const center3 = await storage.createCenter({
      name: "AWC Sector 8",
      block: "Block-A",
      district: "Visakhapatnam",
      state: "Andhra Pradesh",
      ngoName: "Child Welfare Trust",
    });
    const center4 = await storage.createCenter({
      name: "AWC Sector 3",
      block: "Block-A",
      district: "Visakhapatnam",
      state: "Andhra Pradesh",
      ngoName: "Child Welfare Trust",
    });
    const center5 = await storage.createCenter({
      name: "AWC Sector 17",
      block: "Block-B",
      district: "Visakhapatnam",
      state: "Andhra Pradesh",
      ngoName: "Rural Health Initiative",
    });

    // Create Users (default password: "password")
    const workerUser = await storage.createUser({ username: "field worker", password: "password", name: "Field Worker Sarah", role: "field_worker", centerId: center1.id } as any);
    const worker2 = await storage.createUser({ username: "field worker 2", password: "password", name: "Field Worker Meena", role: "field_worker", centerId: center2.id } as any);
    const worker3 = await storage.createUser({ username: "field worker 3", password: "password", name: "Field Worker Anita", role: "field_worker", centerId: center3.id } as any);
    const superUser = await storage.createUser({ username: "supervisor", password: "password", name: "Supervisor John", role: "supervisor" });
    await storage.createUser({ username: "cdpo", password: "password", name: "CDPO Officer Priya", role: "cdpo", assignedBlock: "Block-A" } as any);
    await storage.createUser({ username: "dwcweo", password: "password", name: "DW&CW&EO Officer Ramesh", role: "dwcweo", assignedDistrict: "Visakhapatnam" } as any);
    await storage.createUser({ username: "higher official", password: "password", name: "State Director Sunita", role: "higher_official" });
    const adminUser = await storage.createUser({ username: "admin", password: "password", name: "System Admin", role: "admin" });

    // Assign all centers to supervisor
    for (const c of [center1, center2, center3, center4, center5]) {
      await storage.createSupervisorCenterAssignment({
        supervisorId: superUser.id,
        centerId: c.id,
        assignedByUserId: adminUser.id,
      });
    }

    // Create Patients linked to centers
    const p1 = await storage.createPatient({ name: "Alex Smith", ageMonths: 12, caregiverName: "Martha Smith", contactNumber: "555-0101", address: "123 Village Lane", centerId: center1.id });
    const p2 = await storage.createPatient({ name: "Sam Jones", ageMonths: 24, caregiverName: "David Jones", contactNumber: "555-0102", address: "456 Hill St", centerId: center1.id });
    const p3 = await storage.createPatient({ name: "Riya Sharma", ageMonths: 18, caregiverName: "Neha Sharma", contactNumber: "555-0201", address: "12 Park Ave", centerId: center2.id });
    const p4 = await storage.createPatient({ name: "Arjun Patel", ageMonths: 30, caregiverName: "Kavita Patel", contactNumber: "555-0202", address: "78 Main Rd", centerId: center2.id });
    const p5 = await storage.createPatient({ name: "Priya Das", ageMonths: 15, caregiverName: "Sunita Das", contactNumber: "555-0301", address: "45 Lake View", centerId: center3.id });
    const p6 = await storage.createPatient({ name: "Kabir Singh", ageMonths: 20, caregiverName: "Rajesh Singh", contactNumber: "555-0302", address: "90 Green St", centerId: center3.id });
    const p7 = await storage.createPatient({ name: "Ananya Gupta", ageMonths: 10, caregiverName: "Pooja Gupta", contactNumber: "555-0401", address: "33 Temple Rd", centerId: center4.id });
    const p8 = await storage.createPatient({ name: "Vikram Rao", ageMonths: 28, caregiverName: "Lakshmi Rao", contactNumber: "555-0501", address: "67 River Side", centerId: center5.id });

    // Helper: date N days ago
    const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

    // Create Mock Screenings with domain scores for all centers
    // Center 1 - AWC Sector 5
    await storage.createScreening({
      patientId: p1.id,
      answers: { q1: "yes", q2: "no", q3: "yes", q4: "sometimes", q5: "no" },
      riskScore: 85,
      riskLevel: "High",
      conductedByUserId: workerUser.id,
      date: daysAgo(12),
      screeningType: "baseline",
      domainScores: { motor: 45, social: 70, nutrition: 55, language: 80, cognitive: 43 },
    } as any);

    await storage.createScreening({
      patientId: p2.id,
      answers: { q1: "yes", q2: "yes", q3: "yes", q4: "yes", q5: "yes" },
      riskScore: 20,
      riskLevel: "Low",
      conductedByUserId: workerUser.id,
      date: daysAgo(8),
      screeningType: "baseline",
      domainScores: { motor: 85, social: 90, nutrition: 75, language: 88, cognitive: 82 },
    } as any);

    // Center 2 - AWC Sector 12
    await storage.createScreening({
      patientId: p3.id,
      answers: { q1: "yes", q2: "no", q3: "yes", q4: "yes", q5: "no" },
      riskScore: 60,
      riskLevel: "Medium",
      conductedByUserId: worker2.id,
      date: daysAgo(28),
      screeningType: "baseline",
      domainScores: { motor: 60, social: 55, nutrition: 70, language: 65, cognitive: 58 },
    } as any);

    await storage.createScreening({
      patientId: p4.id,
      answers: { q1: "yes", q2: "yes", q3: "no", q4: "yes", q5: "yes" },
      riskScore: 35,
      riskLevel: "Low",
      conductedByUserId: worker2.id,
      date: daysAgo(5),
      screeningType: "baseline",
      domainScores: { motor: 78, social: 82, nutrition: 68, language: 75, cognitive: 72 },
    } as any);

    // Center 3 - AWC Sector 8
    await storage.createScreening({
      patientId: p5.id,
      answers: { q1: "no", q2: "no", q3: "yes", q4: "sometimes", q5: "no" },
      riskScore: 75,
      riskLevel: "High",
      conductedByUserId: worker3.id,
      date: daysAgo(25),
      screeningType: "baseline",
      domainScores: { motor: 35, social: 40, nutrition: 50, language: 45, cognitive: 38 },
    } as any);

    // Reassessment for p5 done 3 days ago — improved
    await storage.createScreening({
      patientId: p5.id,
      answers: { q1: "yes", q2: "no", q3: "yes", q4: "yes", q5: "yes" },
      riskScore: 50,
      riskLevel: "Medium",
      conductedByUserId: worker3.id,
      date: daysAgo(3),
      screeningType: "3_month",
      domainScores: { motor: 50, social: 55, nutrition: 62, language: 58, cognitive: 50 },
    } as any);

    await storage.createScreening({
      patientId: p6.id,
      answers: { q1: "yes", q2: "yes", q3: "yes", q4: "no", q5: "yes" },
      riskScore: 40,
      riskLevel: "Medium",
      conductedByUserId: worker3.id,
      date: daysAgo(18),
      screeningType: "baseline",
      domainScores: { motor: 72, social: 65, nutrition: 80, language: 70, cognitive: 68 },
    } as any);

    // Center 4 - AWC Sector 3
    await storage.createScreening({
      patientId: p7.id,
      answers: { q1: "yes", q2: "no", q3: "no", q4: "sometimes", q5: "yes" },
      riskScore: 50,
      riskLevel: "Medium",
      conductedByUserId: workerUser.id,
      date: daysAgo(15),
      screeningType: "baseline",
      domainScores: { motor: 55, social: 60, nutrition: 45, language: 52, cognitive: 48 },
    } as any);

    // Center 5 - AWC Sector 17
    await storage.createScreening({
      patientId: p8.id,
      answers: { q1: "yes", q2: "yes", q3: "yes", q4: "yes", q5: "no" },
      riskScore: 30,
      riskLevel: "Low",
      conductedByUserId: workerUser.id,
      date: daysAgo(3),
      screeningType: "baseline",
      domainScores: { motor: 88, social: 92, nutrition: 85, language: 90, cognitive: 87 },
    } as any);

    // Create Interventions
    await storage.createIntervention({
      patientId: p1.id,
      recommendation: "Speech therapy evaluation recommended.",
      status: "in_progress",
      notes: "Referral sent after baseline screening."
    });

    await storage.createIntervention({
      patientId: p5.id,
      recommendation: "Nutritional supplementation and motor skills therapy.",
      status: "in_progress",
      notes: "Referral initiated after baseline screening."
    });
  }
}

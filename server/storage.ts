import { db } from "./db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import {
  users, patients, screenings, interventions,
  interventionPlans, activityLogs, consentRecords, auditLogs, systemConfig,
  alerts, alertThresholds, supervisorCenterAssignments, messages, centers,
  type User, type SafeUser, type InsertUser,
  type Patient, type InsertPatient,
  type Screening, type InsertScreening,
  type Intervention, type InsertIntervention,
  type InterventionPlan, type InsertInterventionPlan,
  type ActivityLog, type InsertActivityLog,
  type ConsentRecord, type InsertConsentRecord,
  type AuditLog, type InsertAuditLog,
  type SystemConfig, type InsertSystemConfig,
  type Alert, type InsertAlert,
  type AlertThreshold, type InsertAlertThreshold,
  type Center, type InsertCenter,
  type SupervisorCenterAssignment, type InsertSupervisorCenterAssignment,
  type Message, type InsertMessage,
  type ProgramStats, type LongitudinalProgress, type DomainScores,
} from "@shared/schema";
import { eq, desc, sql, and, isNull, inArray } from "drizzle-orm";
import { encryptField, decryptField } from "./encryption";

function stripPassword(user: User): SafeUser {
  const { password, ...safe } = user;
  return safe;
}

function encryptPatientPII(data: Partial<InsertPatient>): Partial<InsertPatient> {
  const out = { ...data };
  if (out.name !== undefined) out.name = encryptField(out.name) as string;
  if (out.caregiverName !== undefined) out.caregiverName = encryptField(out.caregiverName) as string;
  if (out.contactNumber !== undefined) out.contactNumber = encryptField(out.contactNumber);
  if (out.address !== undefined) out.address = encryptField(out.address);
  return out;
}

function decryptPatient(p: Patient): Patient {
  return {
    ...p,
    name: decryptField(p.name) ?? p.name,
    caregiverName: decryptField(p.caregiverName) ?? p.caregiverName,
    contactNumber: decryptField(p.contactNumber),
    address: decryptField(p.address),
  };
}

export interface IStorage {
  getUser(id: number): Promise<SafeUser | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<SafeUser>;
  getAllUsers(): Promise<SafeUser[]>;
  validatePassword(username: string, password: string): Promise<SafeUser | null>;
  updateUserRole(id: number, role: string, name?: string): Promise<SafeUser>;
  deleteUser(id: number): Promise<void>;
  countUsersByRole(role: string): Promise<number>;

  getPatients(search?: string, riskLevel?: string): Promise<Patient[]>;
  getPatient(id: number): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: number, updates: Partial<InsertPatient>): Promise<Patient>;
  deletePatient(id: number): Promise<void>;

  getCenters(filters?: { block?: string; district?: string; state?: string }): Promise<Center[]>;
  getCenter(id: number): Promise<Center | undefined>;
  createCenter(data: InsertCenter): Promise<Center>;
  updateCenter(id: number, updates: Partial<InsertCenter>): Promise<Center>;

  getFieldWorkers(filterCenterIds?: number[]): Promise<Array<SafeUser & { screeningsCount: number; patientsCount: number; avgRiskScore: number }>>;

  getScreenings(patientId?: number): Promise<Screening[]>;
  createScreening(screening: InsertScreening & { riskScore: number; riskLevel: string; domainScores?: DomainScores; baselineScreeningId?: number }): Promise<Screening>;
  updateScreeningPhotoAnalysis(screeningId: number, analysis: unknown): Promise<void>;

  getInterventions(patientId?: number): Promise<Intervention[]>;
  updateIntervention(id: number, updates: Partial<InsertIntervention>): Promise<Intervention>;
  createIntervention(intervention: InsertIntervention): Promise<Intervention>;


  getInterventionPlans(patientId?: number): Promise<InterventionPlan[]>;
  getInterventionPlan(id: number): Promise<InterventionPlan | undefined>;
  createInterventionPlan(plan: InsertInterventionPlan): Promise<InterventionPlan>;
  updateInterventionPlan(id: number, updates: Partial<InsertInterventionPlan & { supervisorNotes?: string; supervisorModifiedByUserId?: number }>): Promise<InterventionPlan>;


  getActivityLogs(interventionPlanId?: number, patientId?: number): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  updateActivityLog(id: number, updates: Partial<InsertActivityLog>): Promise<ActivityLog>;


  getConsentRecords(patientId: number): Promise<ConsentRecord[]>;
  getActiveConsent(patientId: number, consentType: string): Promise<ConsentRecord | undefined>;
  createConsentRecord(record: InsertConsentRecord): Promise<ConsentRecord>;
  revokeConsent(id: number): Promise<ConsentRecord>;


  getAuditLogs(filters?: { userId?: number; resourceType?: string }): Promise<AuditLog[]>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;


  getBaselineScreening(patientId: number): Promise<Screening | undefined>;
  getLongitudinalProgress(patientId: number): Promise<LongitudinalProgress>;


  getSystemConfig(): Promise<SystemConfig[]>;
  upsertSystemConfig(key: string, value: string, description?: string): Promise<SystemConfig>;


  getAlerts(filters?: { status?: string; type?: string; severity?: string; assignedToUserId?: number }): Promise<Alert[]>;
  getAlertCounts(): Promise<Record<string, number>>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  updateAlert(id: number, updates: Partial<{ status: string; acknowledgedAt: Date; resolvedAt: Date }>): Promise<Alert>;
  getActiveAlertsForPatient(patientId: number): Promise<Alert[]>;


  getAlertThresholds(): Promise<AlertThreshold[]>;
  upsertAlertThreshold(threshold: InsertAlertThreshold): Promise<AlertThreshold>;

  getLatestRiskLevels(): Promise<Map<number, string>>;

  getProgramStats(): Promise<ProgramStats>;


  getSupervisorCenterAssignments(supervisorId?: number): Promise<SupervisorCenterAssignment[]>;
  createSupervisorCenterAssignment(data: InsertSupervisorCenterAssignment): Promise<SupervisorCenterAssignment>;
  deleteSupervisorCenterAssignment(id: number): Promise<void>;
  getCenterIdsForSupervisor(supervisorId: number): Promise<number[]>;
  getSupervisorForFieldWorker(fieldWorkerId: number): Promise<number | null>;
  getCentersForBlock(block: string): Promise<Center[]>;
  getCentersForDistrict(district: string): Promise<Center[]>;


  getScopedProgramStats(scope: { centerIds?: number[]; block?: string; district?: string }): Promise<ProgramStats>;


  getMessages(recipientId: number): Promise<Message[]>;
  getSentMessages(senderId: number): Promise<Message[]>;
  getMessage(id: number): Promise<Message | undefined>;
  createMessage(data: InsertMessage): Promise<Message>;
  updateMessageStatus(id: number, status: string, completedAt?: Date): Promise<Message>;
  getUnreadCount(recipientId: number): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<SafeUser | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user ? stripPassword(user) : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<SafeUser> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const [user] = await db.insert(users).values({ ...insertUser, password: hashedPassword }).returning();
    return stripPassword(user);
  }

  async getAllUsers(): Promise<SafeUser[]> {
    const all = await db.select().from(users);
    return all.map(stripPassword);
  }

  async validatePassword(username: string, password: string): Promise<SafeUser | null> {
    const user = await this.getUserByUsername(username);
    if (!user) return null;
    const valid = await bcrypt.compare(password, user.password);
    return valid ? stripPassword(user) : null;
  }

  async updateUserRole(id: number, role: string, name?: string): Promise<SafeUser> {
    const updates: Record<string, any> = { role };
    if (name !== undefined) updates.name = name;
    const [updated] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    if (!updated) throw new Error("User not found");
    return stripPassword(updated);
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async countUsersByRole(role: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, role as typeof users.role.enumValues[number]));
    return Number(result[0].count);
  }

  async getPatients(search?: string, riskLevel?: string): Promise<Patient[]> {
    const allPatients = (await db.select().from(patients)).map(decryptPatient);

    let result = allPatients;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.caregiverName ?? "").toLowerCase().includes(q)
      );
    }
    if (riskLevel) {
      const riskMap = await this.getLatestRiskLevels();
      result = result.filter(p => riskMap.get(p.id) === riskLevel);
    }
    return result;
  }

  async getPatient(id: number): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    return patient ? decryptPatient(patient) : undefined;
  }

  async createPatient(patient: InsertPatient): Promise<Patient> {
    const encrypted = encryptPatientPII(patient) as InsertPatient;
    const [newPatient] = await db.insert(patients).values(encrypted).returning();
    return decryptPatient(newPatient);
  }

  async updatePatient(id: number, updates: Partial<InsertPatient>): Promise<Patient> {
    const encrypted = encryptPatientPII(updates);
    const [updated] = await db.update(patients).set(encrypted).where(eq(patients.id, id)).returning();
    if (!updated) throw new Error("Patient not found");
    return decryptPatient(updated);
  }

  async deletePatient(id: number): Promise<void> {
    // cascade delete
    await db.delete(activityLogs).where(eq(activityLogs.patientId, id));
    await db.delete(interventionPlans).where(eq(interventionPlans.patientId, id));
    await db.delete(interventions).where(eq(interventions.patientId, id));
    await db.delete(consentRecords).where(eq(consentRecords.patientId, id));
    await db.delete(alerts).where(eq(alerts.patientId, id));

    const patientScreenings = await db.select({ id: screenings.id }).from(screenings).where(eq(screenings.patientId, id));
    for (const s of patientScreenings) {
      await db.delete(interventions).where(eq(interventions.screeningId, s.id));
    }
    await db.delete(screenings).where(eq(screenings.patientId, id));

    await db.delete(patients).where(eq(patients.id, id));
  }

  async getFieldWorkers(filterCenterIds?: number[]): Promise<Array<SafeUser & { screeningsCount: number; patientsCount: number; avgRiskScore: number }>> {
    const allUsers = await db.select().from(users);
    let fieldWorkers = allUsers.filter(u => u.role === "field_worker");
    if (filterCenterIds && filterCenterIds.length > 0) {
      fieldWorkers = fieldWorkers.filter(u => u.centerId != null && filterCenterIds.includes(u.centerId));
    }
    const allScreenings = await db.select().from(screenings);

    return fieldWorkers.map(fw => {
      const workerScreenings = allScreenings.filter(s => s.conductedByUserId === fw.id);
      const uniquePatients = new Set(workerScreenings.map(s => s.patientId));
      const totalRisk = workerScreenings.reduce((sum, s) => sum + (s.riskScore ?? 0), 0);
      return {
        ...stripPassword(fw),
        screeningsCount: workerScreenings.length,
        patientsCount: uniquePatients.size,
        avgRiskScore: workerScreenings.length > 0 ? Math.round(totalRisk / workerScreenings.length) : 0,
      };
    });
  }

  async getScreenings(patientId?: number): Promise<Screening[]> {
    if (patientId) {
      return await db.select().from(screenings).where(eq(screenings.patientId, patientId)).orderBy(desc(screenings.date));
    }
    return await db.select().from(screenings).orderBy(desc(screenings.date));
  }

  async createScreening(screening: InsertScreening & { riskScore: number; riskLevel: string; domainScores?: DomainScores; baselineScreeningId?: number }): Promise<Screening> {
    const [newScreening] = await db.insert(screenings).values({
      ...screening,
      riskLevel: screening.riskLevel as "Low" | "Medium" | "High",
      domainScores: screening.domainScores ?? null,
      baselineScreeningId: screening.baselineScreeningId ?? null,
    }).returning();
    return newScreening;
  }

  async updateScreeningPhotoAnalysis(screeningId: number, analysis: unknown): Promise<void> {
    await db.update(screenings).set({ photoAnalysis: analysis }).where(eq(screenings.id, screeningId));
  }

  async getInterventions(patientId?: number): Promise<Intervention[]> {
    if (patientId) {
      return await db.select().from(interventions).where(eq(interventions.patientId, patientId)).orderBy(desc(interventions.createdAt));
    }
    return await db.select().from(interventions).orderBy(desc(interventions.createdAt));
  }

  async updateIntervention(id: number, updates: Partial<InsertIntervention>): Promise<Intervention> {
    const [updated] = await db.update(interventions).set(updates).where(eq(interventions.id, id)).returning();
    return updated;
  }

  async createIntervention(intervention: InsertIntervention): Promise<Intervention> {
    const [newIntervention] = await db.insert(interventions).values(intervention).returning();
    return newIntervention;
  }


  async getInterventionPlans(patientId?: number): Promise<InterventionPlan[]> {
    if (patientId) {
      return await db.select().from(interventionPlans).where(eq(interventionPlans.patientId, patientId)).orderBy(desc(interventionPlans.createdAt));
    }
    return await db.select().from(interventionPlans).orderBy(desc(interventionPlans.createdAt));
  }

  async getInterventionPlan(id: number): Promise<InterventionPlan | undefined> {
    const [plan] = await db.select().from(interventionPlans).where(eq(interventionPlans.id, id));
    return plan;
  }

  async createInterventionPlan(plan: InsertInterventionPlan): Promise<InterventionPlan> {
    const [newPlan] = await db.insert(interventionPlans).values(plan).returning();
    return newPlan;
  }

  async updateInterventionPlan(id: number, updates: Partial<InsertInterventionPlan & { supervisorNotes?: string; supervisorModifiedByUserId?: number }>): Promise<InterventionPlan> {
    const [updated] = await db.update(interventionPlans).set({ ...updates, updatedAt: new Date() }).where(eq(interventionPlans.id, id)).returning();
    return updated;
  }


  async getActivityLogs(interventionPlanId?: number, patientId?: number): Promise<ActivityLog[]> {
    if (interventionPlanId) {
      return await db.select().from(activityLogs).where(eq(activityLogs.interventionPlanId, interventionPlanId)).orderBy(desc(activityLogs.createdAt));
    }
    if (patientId) {
      return await db.select().from(activityLogs).where(eq(activityLogs.patientId, patientId)).orderBy(desc(activityLogs.createdAt));
    }
    return await db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt));
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [newLog] = await db.insert(activityLogs).values(log).returning();
    return newLog;
  }

  async updateActivityLog(id: number, updates: Partial<InsertActivityLog>): Promise<ActivityLog> {
    const [updated] = await db.update(activityLogs).set(updates).where(eq(activityLogs.id, id)).returning();
    return updated;
  }


  async getConsentRecords(patientId: number): Promise<ConsentRecord[]> {
    return await db.select().from(consentRecords).where(eq(consentRecords.patientId, patientId)).orderBy(desc(consentRecords.createdAt));
  }

  async getActiveConsent(patientId: number, consentType: string): Promise<ConsentRecord | undefined> {
    const [record] = await db.select().from(consentRecords).where(
      and(
        eq(consentRecords.patientId, patientId),
        eq(consentRecords.consentType, consentType as any),
        eq(consentRecords.consentGiven, true),
        isNull(consentRecords.revokedAt),
      )
    );
    if (record && record.expiresAt && new Date(record.expiresAt) < new Date()) {
      return undefined;
    }
    return record;
  }

  async createConsentRecord(record: InsertConsentRecord): Promise<ConsentRecord> {
    const [newRecord] = await db.insert(consentRecords).values(record).returning();
    return newRecord;
  }

  async revokeConsent(id: number): Promise<ConsentRecord> {
    const [updated] = await db.update(consentRecords).set({ revokedAt: new Date() }).where(eq(consentRecords.id, id)).returning();
    return updated;
  }


  async getAuditLogs(filters?: { userId?: number; resourceType?: string }): Promise<AuditLog[]> {
    if (filters?.userId) {
      return await db.select().from(auditLogs).where(eq(auditLogs.userId, filters.userId)).orderBy(desc(auditLogs.createdAt));
    }
    if (filters?.resourceType) {
      return await db.select().from(auditLogs).where(eq(auditLogs.resourceType, filters.resourceType)).orderBy(desc(auditLogs.createdAt));
    }
    return await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt));
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [newLog] = await db.insert(auditLogs).values(log).returning();
    return newLog;
  }


  async getBaselineScreening(patientId: number): Promise<Screening | undefined> {
    const [baseline] = await db.select().from(screenings)
      .where(and(eq(screenings.patientId, patientId), eq(screenings.screeningType, "baseline")))
      .orderBy(screenings.date);
    return baseline;
  }

  async getLongitudinalProgress(patientId: number): Promise<LongitudinalProgress> {
    const allScreenings = await db.select().from(screenings)
      .where(eq(screenings.patientId, patientId))
      .orderBy(screenings.date);

    const baseline = allScreenings.find(s => s.screeningType === "baseline") || allScreenings[0] || null;
    const latest = allScreenings[allScreenings.length - 1];

    let improvementIndex: number | null = null;
    let domainDeltas: Record<string, number> | null = null;

    if (baseline && latest && baseline.id !== latest.id) {
      const baseScore = baseline.riskScore ?? 0;
      const currentScore = latest.riskScore ?? 0;
      if (baseScore === 0) {
        improvementIndex = currentScore === 0 ? 0 : -100;
      } else {
        improvementIndex = Math.round(((baseScore - currentScore) / baseScore) * 100);
      }

      const baseDS = baseline.domainScores as DomainScores | null;
      const currDS = latest.domainScores as DomainScores | null;
      if (baseDS && currDS) {
        domainDeltas = {};
        for (const key of Object.keys(baseDS) as (keyof DomainScores)[]) {
          domainDeltas[key] = (baseDS[key] ?? 0) - (currDS[key] ?? 0);
        }
      }
    }

    const riskTrajectory = allScreenings.map(s => ({
      date: s.date ? new Date(s.date).toISOString().slice(0, 10) : "",
      riskScore: s.riskScore ?? 0,
      riskLevel: s.riskLevel ?? "Low",
    }));

    return { patientId, baselineScreening: baseline, screenings: allScreenings, improvementIndex, domainDeltas, riskTrajectory };
  }


  async getSystemConfig(): Promise<SystemConfig[]> {
    return await db.select().from(systemConfig);
  }

  async upsertSystemConfig(key: string, value: string, description?: string): Promise<SystemConfig> {
    const existing = await db.select().from(systemConfig).where(eq(systemConfig.key, key));
    if (existing.length > 0) {
      const [updated] = await db.update(systemConfig).set({ value, description, updatedAt: new Date() }).where(eq(systemConfig.key, key)).returning();
      return updated;
    }
    const [created] = await db.insert(systemConfig).values({ key, value, description }).returning();
    return created;
  }

  async getLatestRiskLevels(): Promise<Map<number, string>> {
    const allScreenings = await db.select().from(screenings).orderBy(desc(screenings.date));
    const map = new Map<number, string>();
    for (const s of allScreenings) {
      if (!map.has(s.patientId)) {
        map.set(s.patientId, s.riskLevel ?? "Low");
      }
    }
    return map;
  }

  async getProgramStats(): Promise<ProgramStats> {
    const patientCount = (await db.select({ count: sql<number>`count(*)` }).from(patients))[0].count;
    const allScreenings = await db.select().from(screenings);
    const allPatients = await db.select().from(patients);

    const high = allScreenings.filter(s => s.riskLevel === "High").length;
    const medium = allScreenings.filter(s => s.riskLevel === "Medium").length;
    const low = allScreenings.filter(s => s.riskLevel === "Low").length;

    const monthlyMap = new Map<string, number>();
    for (const s of allScreenings) {
      if (s.date) {
        const d = new Date(s.date);
        const key = d.toLocaleString("en-US", { month: "short" });
        monthlyMap.set(key, (monthlyMap.get(key) || 0) + 1);
      }
    }
    const monthlyScreenings = Array.from(monthlyMap.entries()).map(([month, count]) => ({ month, count }));

    let exitedHighRisk = 0;
    let everHighRisk = 0;
    for (const p of allPatients) {
      const pScreenings = allScreenings.filter(s => s.patientId === p.id).sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0));
      const wasHigh = pScreenings.some(s => s.riskLevel === "High");
      if (wasHigh) {
        everHighRisk++;
        const latest = pScreenings[pScreenings.length - 1];
        if (latest && latest.riskLevel !== "High") exitedHighRisk++;
      }
    }
    const exitHighRiskPercentage = everHighRisk > 0 ? Math.round((exitedHighRisk / everHighRisk) * 100) : 0;

    let totalMonths = 0;
    let improvedCount = 0;
    for (const p of allPatients) {
      const pScreenings = allScreenings.filter(s => s.patientId === p.id).sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0));
      if (pScreenings.length < 2) continue;
      const baseline = pScreenings[0];
      const baseScore = baseline.riskScore ?? 0;
      if (baseScore === 0) continue;
      for (let i = 1; i < pScreenings.length; i++) {
        if ((pScreenings[i].riskScore ?? baseScore) < baseScore && baseline.date && pScreenings[i].date) {
          const diffMs = new Date(pScreenings[i].date!).getTime() - new Date(baseline.date!).getTime();
          totalMonths += diffMs / (1000 * 60 * 60 * 24 * 30);
          improvedCount++;
          break;
        }
      }
    }
    const avgReductionDelayMonths = improvedCount > 0 ? Math.round(totalMonths / improvedCount * 10) / 10 : 0;

    return {
      totalPatients: Number(patientCount),
      highRiskPercentage: Math.round((high / Math.max(allScreenings.length, 1)) * 100),
      exitHighRiskPercentage,
      avgReductionDelayMonths,
      patientsByRiskLevel: [
        { name: "Low", value: low },
        { name: "Medium", value: medium },
        { name: "High", value: high },
      ],
      monthlyScreenings: monthlyScreenings.length > 0 ? monthlyScreenings : [
        { month: "Jan", count: 0 },
      ],
    };
  }

  async getCenters(filters?: { block?: string; district?: string; state?: string }): Promise<Center[]> {
    let result = await db.select().from(centers);
    if (filters?.block) result = result.filter(c => c.block === filters.block);
    if (filters?.district) result = result.filter(c => c.district === filters.district);
    if (filters?.state) result = result.filter(c => c.state === filters.state);
    return result;
  }

  async getCenter(id: number): Promise<Center | undefined> {
    const [center] = await db.select().from(centers).where(eq(centers.id, id));
    return center;
  }

  async createCenter(data: InsertCenter): Promise<Center> {
    const [center] = await db.insert(centers).values(data).returning();
    return center;
  }

  async updateCenter(id: number, updates: Partial<InsertCenter>): Promise<Center> {
    const [updated] = await db.update(centers).set(updates).where(eq(centers.id, id)).returning();
    if (!updated) throw new Error("Center not found");
    return updated;
  }


  async getSupervisorCenterAssignments(supervisorId?: number): Promise<SupervisorCenterAssignment[]> {
    if (supervisorId) {
      return await db.select().from(supervisorCenterAssignments).where(eq(supervisorCenterAssignments.supervisorId, supervisorId));
    }
    return await db.select().from(supervisorCenterAssignments);
  }

  async createSupervisorCenterAssignment(data: InsertSupervisorCenterAssignment): Promise<SupervisorCenterAssignment> {
    const [record] = await db.insert(supervisorCenterAssignments).values(data).returning();
    return record;
  }

  async deleteSupervisorCenterAssignment(id: number): Promise<void> {
    await db.delete(supervisorCenterAssignments).where(eq(supervisorCenterAssignments.id, id));
  }

  async getCenterIdsForSupervisor(supervisorId: number): Promise<number[]> {
    const rows = await db.select({ centerId: supervisorCenterAssignments.centerId })
      .from(supervisorCenterAssignments)
      .where(eq(supervisorCenterAssignments.supervisorId, supervisorId));
    return rows.map(r => r.centerId);
  }

  async getSupervisorForFieldWorker(fieldWorkerId: number): Promise<number | null> {
    const [fw] = await db.select().from(users).where(eq(users.id, fieldWorkerId));
    if (!fw?.centerId) return null;
    const [assignment] = await db.select({ supervisorId: supervisorCenterAssignments.supervisorId })
      .from(supervisorCenterAssignments)
      .where(eq(supervisorCenterAssignments.centerId, fw.centerId));
    return assignment?.supervisorId ?? null;
  }

  async getCentersForBlock(block: string): Promise<Center[]> {
    return await db.select().from(centers).where(eq(centers.block, block));
  }

  async getCentersForDistrict(district: string): Promise<Center[]> {
    return await db.select().from(centers).where(eq(centers.district, district));
  }


  async getScopedProgramStats(scope: { centerIds?: number[]; block?: string; district?: string }): Promise<ProgramStats> {
    let centerIds = scope.centerIds;
    if (!centerIds && scope.block) {
      const blockCenters = await this.getCentersForBlock(scope.block);
      centerIds = blockCenters.map(c => c.id);
    }
    if (!centerIds && scope.district) {
      const districtCenters = await this.getCentersForDistrict(scope.district);
      centerIds = districtCenters.map(c => c.id);
    }

    if (!centerIds || centerIds.length === 0) {
      return this.getProgramStats();
    }

    const allPatients = (await db.select().from(patients)).filter(p => p.centerId != null && centerIds!.includes(p.centerId));
    const patientIds = allPatients.map(p => p.id);
    const allScreenings = patientIds.length > 0
      ? (await db.select().from(screenings)).filter(s => patientIds.includes(s.patientId))
      : [];

    const high = allScreenings.filter(s => s.riskLevel === "High").length;
    const medium = allScreenings.filter(s => s.riskLevel === "Medium").length;
    const low = allScreenings.filter(s => s.riskLevel === "Low").length;

    const monthlyMap = new Map<string, number>();
    for (const s of allScreenings) {
      if (s.date) {
        const d = new Date(s.date);
        const key = d.toLocaleString("en-US", { month: "short" });
        monthlyMap.set(key, (monthlyMap.get(key) || 0) + 1);
      }
    }
    const monthlyScreenings = Array.from(monthlyMap.entries()).map(([month, count]) => ({ month, count }));

    let exitedHighRisk = 0;
    let everHighRisk = 0;
    for (const p of allPatients) {
      const pScreenings = allScreenings.filter(s => s.patientId === p.id).sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0));
      const wasHigh = pScreenings.some(s => s.riskLevel === "High");
      if (wasHigh) {
        everHighRisk++;
        const latest = pScreenings[pScreenings.length - 1];
        if (latest && latest.riskLevel !== "High") exitedHighRisk++;
      }
    }
    const exitHighRiskPercentage = everHighRisk > 0 ? Math.round((exitedHighRisk / everHighRisk) * 100) : 0;

    let totalMonths = 0;
    let improvedCount = 0;
    for (const p of allPatients) {
      const pScreenings = allScreenings.filter(s => s.patientId === p.id).sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0));
      if (pScreenings.length < 2) continue;
      const baseline = pScreenings[0];
      const baseScore = baseline.riskScore ?? 0;
      if (baseScore === 0) continue;
      for (let i = 1; i < pScreenings.length; i++) {
        if ((pScreenings[i].riskScore ?? baseScore) < baseScore && baseline.date && pScreenings[i].date) {
          const diffMs = new Date(pScreenings[i].date!).getTime() - new Date(baseline.date!).getTime();
          totalMonths += diffMs / (1000 * 60 * 60 * 24 * 30);
          improvedCount++;
          break;
        }
      }
    }
    const avgReductionDelayMonths = improvedCount > 0 ? Math.round(totalMonths / improvedCount * 10) / 10 : 0;

    return {
      totalPatients: allPatients.length,
      highRiskPercentage: Math.round((high / Math.max(allScreenings.length, 1)) * 100),
      exitHighRiskPercentage,
      avgReductionDelayMonths,
      patientsByRiskLevel: [
        { name: "Low", value: low },
        { name: "Medium", value: medium },
        { name: "High", value: high },
      ],
      monthlyScreenings: monthlyScreenings.length > 0 ? monthlyScreenings : [
        { month: "Jan", count: 0 },
      ],
    };
  }


  async getMessages(recipientId: number): Promise<Message[]> {
    return await db.select().from(messages)
      .where(eq(messages.recipientId, recipientId))
      .orderBy(desc(messages.createdAt));
  }

  async getSentMessages(senderId: number): Promise<Message[]> {
    return await db.select().from(messages)
      .where(eq(messages.senderId, senderId))
      .orderBy(desc(messages.createdAt));
  }

  async getMessage(id: number): Promise<Message | undefined> {
    const [msg] = await db.select().from(messages).where(eq(messages.id, id));
    return msg;
  }

  async createMessage(data: InsertMessage): Promise<Message> {
    const [msg] = await db.insert(messages).values(data).returning();
    return msg;
  }

  async updateMessageStatus(id: number, status: string, completedAt?: Date): Promise<Message> {
    const updates: any = { status };
    if (completedAt) updates.completedAt = completedAt;
    const [msg] = await db.update(messages).set(updates).where(eq(messages.id, id)).returning();
    return msg;
  }

  async getUnreadCount(recipientId: number): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(and(eq(messages.recipientId, recipientId), eq(messages.status, "unread")));
    return Number(result[0].count);
  }


  async getAlerts(filters?: { status?: string; type?: string; severity?: string; assignedToUserId?: number }): Promise<Alert[]> {
    let result = await db.select().from(alerts).orderBy(desc(alerts.createdAt));
    if (filters?.status) result = result.filter(a => a.status === filters.status);
    if (filters?.type) result = result.filter(a => a.type === filters.type);
    if (filters?.severity) result = result.filter(a => a.severity === filters.severity);
    if (filters?.assignedToUserId) result = result.filter(a => a.assignedToUserId === filters.assignedToUserId);
    return result;
  }

  async getAlertCounts(): Promise<Record<string, number>> {
    const all = await db.select().from(alerts);
    const active = all.filter(a => a.status === "active");
    return {
      critical: active.filter(a => a.severity === "critical").length,
      high: active.filter(a => a.severity === "high").length,
      medium: active.filter(a => a.severity === "medium").length,
      low: active.filter(a => a.severity === "low").length,
      total: active.length,
    };
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const [newAlert] = await db.insert(alerts).values(alert).returning();
    return newAlert;
  }

  async updateAlert(id: number, updates: Partial<{ status: string; acknowledgedAt: Date; resolvedAt: Date }>): Promise<Alert> {
    const [updated] = await db.update(alerts).set(updates as any).where(eq(alerts.id, id)).returning();
    return updated;
  }

  async getActiveAlertsForPatient(patientId: number): Promise<Alert[]> {
    return (await db.select().from(alerts).where(
      and(eq(alerts.patientId, patientId), eq(alerts.status, "active"))
    ));
  }


  async getAlertThresholds(): Promise<AlertThreshold[]> {
    return await db.select().from(alertThresholds);
  }

  async upsertAlertThreshold(threshold: InsertAlertThreshold): Promise<AlertThreshold> {
    const existing = await db.select().from(alertThresholds).where(
      and(eq(alertThresholds.alertType, threshold.alertType), eq(alertThresholds.thresholdKey, threshold.thresholdKey))
    );
    if (existing.length > 0) {
      const [updated] = await db.update(alertThresholds).set({ ...threshold, updatedAt: new Date() }).where(eq(alertThresholds.id, existing[0].id)).returning();
      return updated;
    }
    const [created] = await db.insert(alertThresholds).values(threshold).returning();
    return created;
  }
}

class InMemoryStorage implements IStorage {
  private users: User[] = [];
  private patients: Patient[] = [];
  private screenings: Screening[] = [];
  private interventions: Intervention[] = [];
  private interventionPlansList: InterventionPlan[] = [];
  private activityLogsList: ActivityLog[] = [];
  private consentRecordsList: ConsentRecord[] = [];
  private auditLogsList: AuditLog[] = [];
  private systemConfigList: SystemConfig[] = [];
  private alertsList: Alert[] = [];
  private alertThresholdsList: AlertThreshold[] = [];
  private assignmentsList: SupervisorCenterAssignment[] = [];
  private messagesList: Message[] = [];
  private centersList: Center[] = [];
  private nextId = { user: 1, patient: 1, screening: 1, intervention: 1, interventionPlan: 1, activityLog: 1, consentRecord: 1, auditLog: 1, systemConfig: 1, alert: 1, alertThreshold: 1, assignment: 1, message: 1, center: 1 };

  private now() { return new Date(); }

  async getUser(id: number): Promise<SafeUser | undefined> {
    const user = this.users.find(u => u.id === id);
    return user ? stripPassword(user) : undefined;
  }
  async getUserByUsername(username: string) { return this.users.find(u => u.username === username); }
  async getAllUsers(): Promise<SafeUser[]> { return this.users.map(stripPassword); }
  async createUser(u: InsertUser): Promise<SafeUser> {
    const hashedPassword = await bcrypt.hash(u.password, 10);
    const record: User = {
      id: this.nextId.user++,
      createdAt: this.now(),
      centerId: null,
      assignedBlock: null,
      assignedDistrict: null,
      ...u,
      password: hashedPassword,
    };
    this.users.push(record);
    return stripPassword(record);
  }
  async validatePassword(username: string, password: string): Promise<SafeUser | null> {
    const user = this.users.find(u => u.username === username);
    if (!user) return null;
    const valid = await bcrypt.compare(password, user.password);
    return valid ? stripPassword(user) : null;
  }

  async updateUserRole(id: number, role: string, name?: string): Promise<SafeUser> {
    const user = this.users.find(u => u.id === id);
    if (!user) throw new Error("User not found");
    user.role = role as any;
    if (name !== undefined) user.name = name;
    return stripPassword(user);
  }

  async deleteUser(id: number): Promise<void> {
    this.users = this.users.filter(u => u.id !== id);
  }

  async countUsersByRole(role: string): Promise<number> {
    return this.users.filter(u => u.role === role).length;
  }

  async getPatients(search?: string, riskLevel?: string) {
    let result = [...this.patients];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.caregiverName ?? "").toLowerCase().includes(q)
      );
    }
    if (riskLevel) {
      result = result.filter(p => {
        const latestScreening = this.screenings
          .filter(s => s.patientId === p.id)
          .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0))[0];
        return latestScreening?.riskLevel === riskLevel;
      });
    }
    return result;
  }
  async getPatient(id: number) { return this.patients.find(p => p.id === id); }
  async createPatient(p: InsertPatient): Promise<Patient> {
    const record: Patient = {
      id: this.nextId.patient++,
      uuid: crypto.randomUUID(),
      createdAt: this.now(),
      contactNumber: null,
      address: null,
      registeredByUserId: null,
      centerId: null,
      ...p,
    };
    this.patients.push(record);
    return record;
  }

  async updatePatient(id: number, updates: Partial<InsertPatient>): Promise<Patient> {
    const idx = this.patients.findIndex(p => p.id === id);
    if (idx === -1) throw new Error("Patient not found");
    this.patients[idx] = { ...this.patients[idx], ...updates };
    return this.patients[idx];
  }

  async deletePatient(id: number): Promise<void> {
    this.activityLogsList = this.activityLogsList.filter(l => l.patientId !== id);
    this.interventionPlansList = this.interventionPlansList.filter(p => p.patientId !== id);
    this.interventions = this.interventions.filter(i => i.patientId !== id);
    this.consentRecordsList = this.consentRecordsList.filter(r => r.patientId !== id);
    this.alertsList = this.alertsList.filter(a => a.patientId !== id);
    this.screenings = this.screenings.filter(s => s.patientId !== id);
    this.patients = this.patients.filter(p => p.id !== id);
  }

  async getFieldWorkers(filterIds?: number[]): Promise<Array<SafeUser & { screeningsCount: number; patientsCount: number; avgRiskScore: number }>> {
    let fieldWorkers = this.users.filter(u => u.role === "field_worker");
    if (filterIds) {
      fieldWorkers = fieldWorkers.filter(u => filterIds.includes(u.id));
    }
    return fieldWorkers.map(fw => {
      const workerScreenings = this.screenings.filter(s => s.conductedByUserId === fw.id);
      const uniquePatients = new Set(workerScreenings.map(s => s.patientId));
      const totalRisk = workerScreenings.reduce((sum, s) => sum + (s.riskScore ?? 0), 0);
      return {
        ...stripPassword(fw),
        screeningsCount: workerScreenings.length,
        patientsCount: uniquePatients.size,
        avgRiskScore: workerScreenings.length > 0 ? Math.round(totalRisk / workerScreenings.length) : 0,
      };
    });
  }

  async getScreenings(patientId?: number) {
    const list = patientId
      ? this.screenings.filter(s => s.patientId === patientId)
      : [...this.screenings];
    return list.sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));
  }
  async createScreening(s: InsertScreening & { riskScore: number; riskLevel: string; domainScores?: DomainScores; baselineScreeningId?: number }): Promise<Screening> {
    const record: Screening = {
      ...s,
      id: this.nextId.screening++,
      createdAt: this.now(),
      date: (s as any).date ?? this.now(),
      conductedByUserId: s.conductedByUserId ?? null,
      riskScore: s.riskScore,
      riskLevel: s.riskLevel as "Low" | "Medium" | "High",
      photoAnalysis: null,
      screeningType: s.screeningType ?? "baseline",
      baselineScreeningId: s.baselineScreeningId ?? null,
      domainScores: s.domainScores ?? null,
    };
    this.screenings.push(record);
    return record;
  }

  async updateScreeningPhotoAnalysis(screeningId: number, analysis: unknown): Promise<void> {
    const screening = this.screenings.find(s => s.id === screeningId);
    if (screening) {
      (screening as any).photoAnalysis = analysis;
    }
  }

  async getInterventions(patientId?: number) {
    const list = patientId
      ? this.interventions.filter(i => i.patientId === patientId)
      : [...this.interventions];
    return list.sort((a, b) =>
      (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)
    );
  }
  async createIntervention(i: InsertIntervention): Promise<Intervention> {
    const record: Intervention = {
      id: this.nextId.intervention++,
      createdAt: this.now(),
      screeningId: null,
      notes: null,
      status: "pending",
      ...i,
    };
    this.interventions.push(record);
    return record;
  }
  async updateIntervention(id: number, updates: Partial<InsertIntervention>): Promise<Intervention> {
    const idx = this.interventions.findIndex(i => i.id === id);
    if (idx === -1) throw new Error("Intervention not found");
    this.interventions[idx] = { ...this.interventions[idx], ...updates };
    return this.interventions[idx];
  }


  async getInterventionPlans(patientId?: number): Promise<InterventionPlan[]> {
    const list = patientId
      ? this.interventionPlansList.filter(p => p.patientId === patientId)
      : [...this.interventionPlansList];
    return list.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  async getInterventionPlan(id: number): Promise<InterventionPlan | undefined> {
    return this.interventionPlansList.find(p => p.id === id);
  }

  async createInterventionPlan(plan: InsertInterventionPlan): Promise<InterventionPlan> {
    const record: InterventionPlan = {
      id: this.nextId.interventionPlan++,
      createdAt: this.now(),
      updatedAt: this.now(),
      supervisorNotes: null,
      supervisorModifiedByUserId: null,
      caregiverVersion: null,
      professionalVersion: null,
      ageGroupMonths: null,
      screeningId: null,
      status: "recommended",
      ...plan,
    };
    this.interventionPlansList.push(record);
    return record;
  }

  async updateInterventionPlan(id: number, updates: Partial<InsertInterventionPlan & { supervisorNotes?: string; supervisorModifiedByUserId?: number }>): Promise<InterventionPlan> {
    const idx = this.interventionPlansList.findIndex(p => p.id === id);
    if (idx === -1) throw new Error("Intervention plan not found");
    this.interventionPlansList[idx] = { ...this.interventionPlansList[idx], ...updates, updatedAt: this.now() };
    return this.interventionPlansList[idx];
  }


  async getActivityLogs(interventionPlanId?: number, patientId?: number): Promise<ActivityLog[]> {
    let list = [...this.activityLogsList];
    if (interventionPlanId) list = list.filter(l => l.interventionPlanId === interventionPlanId);
    if (patientId) list = list.filter(l => l.patientId === patientId);
    return list.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const record: ActivityLog = {
      id: this.nextId.activityLog++,
      createdAt: this.now(),
      completedAt: null,
      completedByUserId: null,
      caregiverFeedback: null,
      status: "pending",
      ...log,
    };
    this.activityLogsList.push(record);
    return record;
  }

  async updateActivityLog(id: number, updates: Partial<InsertActivityLog>): Promise<ActivityLog> {
    const idx = this.activityLogsList.findIndex(l => l.id === id);
    if (idx === -1) throw new Error("Activity log not found");
    this.activityLogsList[idx] = { ...this.activityLogsList[idx], ...updates };
    return this.activityLogsList[idx];
  }


  async getConsentRecords(patientId: number): Promise<ConsentRecord[]> {
    return this.consentRecordsList
      .filter(r => r.patientId === patientId)
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  async getActiveConsent(patientId: number, consentType: string): Promise<ConsentRecord | undefined> {
    const now = new Date();
    return this.consentRecordsList.find(r =>
      r.patientId === patientId &&
      r.consentType === consentType &&
      r.consentGiven &&
      !r.revokedAt &&
      (!r.expiresAt || new Date(r.expiresAt) >= now)
    );
  }

  async createConsentRecord(record: InsertConsentRecord): Promise<ConsentRecord> {
    const newRecord: ConsentRecord = {
      id: this.nextId.consentRecord++,
      createdAt: this.now(),
      revokedAt: null,
      signatureData: null,
      witnessUserId: null,
      expiresAt: null,
      ...record,
    };
    this.consentRecordsList.push(newRecord);
    return newRecord;
  }

  async revokeConsent(id: number): Promise<ConsentRecord> {
    const idx = this.consentRecordsList.findIndex(r => r.id === id);
    if (idx === -1) throw new Error("Consent record not found");
    this.consentRecordsList[idx] = { ...this.consentRecordsList[idx], revokedAt: this.now() };
    return this.consentRecordsList[idx];
  }


  async getAuditLogs(filters?: { userId?: number; resourceType?: string }): Promise<AuditLog[]> {
    let list = [...this.auditLogsList];
    if (filters?.userId) list = list.filter(l => l.userId === filters.userId);
    if (filters?.resourceType) list = list.filter(l => l.resourceType === filters.resourceType);
    return list.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const record: AuditLog = {
      id: this.nextId.auditLog++,
      createdAt: this.now(),
      userId: null,
      resourceId: null,
      details: null,
      ipAddress: null,
      ...log,
    };
    this.auditLogsList.push(record);
    return record;
  }


  async getBaselineScreening(patientId: number): Promise<Screening | undefined> {
    const patientScreenings = this.screenings
      .filter(s => s.patientId === patientId)
      .sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0));
    return patientScreenings.find(s => s.screeningType === "baseline") || patientScreenings[0];
  }

  async getLongitudinalProgress(patientId: number): Promise<LongitudinalProgress> {
    const allScreenings = this.screenings
      .filter(s => s.patientId === patientId)
      .sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0));

    const baseline = allScreenings.find(s => s.screeningType === "baseline") || allScreenings[0] || null;
    const latest = allScreenings[allScreenings.length - 1];

    let improvementIndex: number | null = null;
    let domainDeltas: Record<string, number> | null = null;

    if (baseline && latest && baseline.id !== latest.id) {
      const baseScore = baseline.riskScore ?? 0;
      const currentScore = latest.riskScore ?? 0;
      if (baseScore === 0) {
        improvementIndex = currentScore === 0 ? 0 : -100;
      } else {
        improvementIndex = Math.round(((baseScore - currentScore) / baseScore) * 100);
      }

      const baseDS = baseline.domainScores as DomainScores | null;
      const currDS = latest.domainScores as DomainScores | null;
      if (baseDS && currDS) {
        domainDeltas = {};
        for (const key of Object.keys(baseDS) as (keyof DomainScores)[]) {
          domainDeltas[key] = (baseDS[key] ?? 0) - (currDS[key] ?? 0);
        }
      }
    }

    const riskTrajectory = allScreenings.map(s => ({
      date: s.date ? new Date(s.date).toISOString().slice(0, 10) : "",
      riskScore: s.riskScore ?? 0,
      riskLevel: s.riskLevel ?? "Low",
    }));

    return { patientId, baselineScreening: baseline, screenings: allScreenings, improvementIndex, domainDeltas, riskTrajectory };
  }


  async getSystemConfig(): Promise<SystemConfig[]> {
    return [...this.systemConfigList];
  }

  async upsertSystemConfig(key: string, value: string, description?: string): Promise<SystemConfig> {
    const idx = this.systemConfigList.findIndex(c => c.key === key);
    if (idx >= 0) {
      this.systemConfigList[idx] = { ...this.systemConfigList[idx], value, description: description ?? this.systemConfigList[idx].description, updatedAt: this.now() };
      return this.systemConfigList[idx];
    }
    const record: SystemConfig = { id: this.nextId.systemConfig++, key, value, description: description ?? null, updatedAt: this.now() };
    this.systemConfigList.push(record);
    return record;
  }

  async getLatestRiskLevels(): Promise<Map<number, string>> {
    const sorted = [...this.screenings].sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));
    const map = new Map<number, string>();
    for (const s of sorted) {
      if (!map.has(s.patientId)) {
        map.set(s.patientId, s.riskLevel ?? "Low");
      }
    }
    return map;
  }

  async getProgramStats(): Promise<ProgramStats> {
    const high   = this.screenings.filter(s => s.riskLevel === "High").length;
    const medium = this.screenings.filter(s => s.riskLevel === "Medium").length;
    const low    = this.screenings.filter(s => s.riskLevel === "Low").length;
    const total  = Math.max(this.screenings.length, 1);

    const monthlyMap = new Map<string, number>();
    for (const s of this.screenings) {
      if (s.date) {
        const key = new Date(s.date).toLocaleString("en-US", { month: "short" });
        monthlyMap.set(key, (monthlyMap.get(key) || 0) + 1);
      }
    }
    const monthlyScreenings = Array.from(monthlyMap.entries()).map(([month, count]) => ({ month, count }));

    let exitedHighRisk = 0;
    let everHighRisk = 0;
    for (const p of this.patients) {
      const pScreenings = this.screenings.filter(s => s.patientId === p.id).sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0));
      const wasHigh = pScreenings.some(s => s.riskLevel === "High");
      if (wasHigh) {
        everHighRisk++;
        const latest = pScreenings[pScreenings.length - 1];
        if (latest && latest.riskLevel !== "High") exitedHighRisk++;
      }
    }
    const exitHighRiskPercentage = everHighRisk > 0 ? Math.round((exitedHighRisk / everHighRisk) * 100) : 0;

    let totalMonths = 0;
    let improvedCount = 0;
    for (const p of this.patients) {
      const pScreenings = this.screenings.filter(s => s.patientId === p.id).sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0));
      if (pScreenings.length < 2) continue;
      const baseline = pScreenings[0];
      const baseScore = baseline.riskScore ?? 0;
      if (baseScore === 0) continue;
      for (let i = 1; i < pScreenings.length; i++) {
        if ((pScreenings[i].riskScore ?? baseScore) < baseScore && baseline.date && pScreenings[i].date) {
          const diffMs = new Date(pScreenings[i].date!).getTime() - new Date(baseline.date!).getTime();
          totalMonths += diffMs / (1000 * 60 * 60 * 24 * 30);
          improvedCount++;
          break;
        }
      }
    }
    const avgReductionDelayMonths = improvedCount > 0 ? Math.round(totalMonths / improvedCount * 10) / 10 : 0;

    return {
      totalPatients: this.patients.length,
      highRiskPercentage: Math.round((high / total) * 100),
      exitHighRiskPercentage,
      avgReductionDelayMonths,
      patientsByRiskLevel: [
        { name: "Low",    value: low    },
        { name: "Medium", value: medium },
        { name: "High",   value: high   },
      ],
      monthlyScreenings: monthlyScreenings.length > 0 ? monthlyScreenings : [{ month: "Jan", count: 0 }],
    };
  }


  async getAlerts(filters?: { status?: string; type?: string; severity?: string; assignedToUserId?: number }): Promise<Alert[]> {
    let list = [...this.alertsList];
    if (filters?.status) list = list.filter(a => a.status === filters.status);
    if (filters?.type) list = list.filter(a => a.type === filters.type);
    if (filters?.severity) list = list.filter(a => a.severity === filters.severity);
    if (filters?.assignedToUserId) list = list.filter(a => a.assignedToUserId === filters.assignedToUserId);
    return list.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  async getAlertCounts(): Promise<Record<string, number>> {
    const active = this.alertsList.filter(a => a.status === "active");
    return {
      critical: active.filter(a => a.severity === "critical").length,
      high: active.filter(a => a.severity === "high").length,
      medium: active.filter(a => a.severity === "medium").length,
      low: active.filter(a => a.severity === "low").length,
      total: active.length,
    };
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const record: Alert = {
      id: this.nextId.alert++,
      createdAt: this.now(),
      acknowledgedAt: null,
      resolvedAt: null,
      metadata: null,
      patientId: null,
      screeningId: null,
      assignedToUserId: null,
      createdByUserId: null,
      status: "active",
      ...alert,
    };
    this.alertsList.push(record);
    return record;
  }

  async updateAlert(id: number, updates: Partial<{ status: string; acknowledgedAt: Date; resolvedAt: Date }>): Promise<Alert> {
    const idx = this.alertsList.findIndex(a => a.id === id);
    if (idx === -1) throw new Error("Alert not found");
    this.alertsList[idx] = { ...this.alertsList[idx], ...updates } as Alert;
    return this.alertsList[idx];
  }

  async getActiveAlertsForPatient(patientId: number): Promise<Alert[]> {
    return this.alertsList.filter(a => a.patientId === patientId && a.status === "active");
  }


  async getAlertThresholds(): Promise<AlertThreshold[]> {
    return [...this.alertThresholdsList];
  }

  async upsertAlertThreshold(threshold: InsertAlertThreshold): Promise<AlertThreshold> {
    const idx = this.alertThresholdsList.findIndex(t => t.alertType === threshold.alertType && t.thresholdKey === threshold.thresholdKey);
    if (idx >= 0) {
      this.alertThresholdsList[idx] = { ...this.alertThresholdsList[idx], ...threshold, updatedAt: this.now() };
      return this.alertThresholdsList[idx];
    }
    const record: AlertThreshold = {
      id: this.nextId.alertThreshold++,
      createdAt: this.now(),
      updatedAt: this.now(),
      isActive: true,
      modifiedByUserId: null,
      ...threshold,
    };
    this.alertThresholdsList.push(record);
    return record;
  }

  async getCenters(filters?: { block?: string; district?: string; state?: string }): Promise<Center[]> {
    let list = [...this.centersList];
    if (filters?.block) list = list.filter(c => c.block === filters.block);
    if (filters?.district) list = list.filter(c => c.district === filters.district);
    if (filters?.state) list = list.filter(c => c.state === filters.state);
    return list;
  }

  async getCenter(id: number): Promise<Center | undefined> {
    return this.centersList.find(c => c.id === id);
  }

  async createCenter(data: InsertCenter): Promise<Center> {
    const record: Center = {
      id: this.nextId.center++,
      createdAt: this.now(),
      isActive: true,
      ngoName: null,
      ...data,
    };
    this.centersList.push(record);
    return record;
  }

  async updateCenter(id: number, updates: Partial<InsertCenter>): Promise<Center> {
    const idx = this.centersList.findIndex(c => c.id === id);
    if (idx === -1) throw new Error("Center not found");
    this.centersList[idx] = { ...this.centersList[idx], ...updates };
    return this.centersList[idx];
  }


  async getSupervisorCenterAssignments(supervisorId?: number): Promise<SupervisorCenterAssignment[]> {
    if (supervisorId) {
      return this.assignmentsList.filter(a => a.supervisorId === supervisorId);
    }
    return [...this.assignmentsList];
  }

  async createSupervisorCenterAssignment(data: InsertSupervisorCenterAssignment): Promise<SupervisorCenterAssignment> {
    const record: SupervisorCenterAssignment = {
      id: this.nextId.assignment++,
      createdAt: this.now(),
      assignedByUserId: data.assignedByUserId ?? null,
      ...data,
    };
    this.assignmentsList.push(record);
    return record;
  }

  async deleteSupervisorCenterAssignment(id: number): Promise<void> {
    this.assignmentsList = this.assignmentsList.filter(a => a.id !== id);
  }

  async getCenterIdsForSupervisor(supervisorId: number): Promise<number[]> {
    return this.assignmentsList.filter(a => a.supervisorId === supervisorId).map(a => a.centerId);
  }

  async getSupervisorForFieldWorker(fieldWorkerId: number): Promise<number | null> {
    const worker = this.users.find(u => u.id === fieldWorkerId);
    if (!worker?.centerId) return null;
    const assignment = this.assignmentsList.find(a => a.centerId === worker.centerId);
    return assignment?.supervisorId ?? null;
  }

  async getCentersForBlock(block: string): Promise<Center[]> {
    return this.centersList.filter(c => c.block === block);
  }

  async getCentersForDistrict(district: string): Promise<Center[]> {
    return this.centersList.filter(c => c.district === district);
  }


  async getScopedProgramStats(scope: { centerIds?: number[]; block?: string; district?: string }): Promise<ProgramStats> {
    let patientSubset = [...this.patients];
    if (scope.centerIds && scope.centerIds.length > 0) {
      patientSubset = patientSubset.filter(p => p.centerId != null && scope.centerIds!.includes(p.centerId));
    } else if (scope.block) {
      const blockCenterIds = this.centersList.filter(c => c.block === scope.block).map(c => c.id);
      patientSubset = patientSubset.filter(p => p.centerId != null && blockCenterIds.includes(p.centerId));
    } else if (scope.district) {
      const districtCenterIds = this.centersList.filter(c => c.district === scope.district).map(c => c.id);
      patientSubset = patientSubset.filter(p => p.centerId != null && districtCenterIds.includes(p.centerId));
    }

    const patientIds = new Set(patientSubset.map(p => p.id));
    const scopedScreenings = this.screenings.filter(s => patientIds.has(s.patientId));

    const high = scopedScreenings.filter(s => s.riskLevel === "High").length;
    const medium = scopedScreenings.filter(s => s.riskLevel === "Medium").length;
    const low = scopedScreenings.filter(s => s.riskLevel === "Low").length;
    const total = Math.max(scopedScreenings.length, 1);

    const monthlyMap = new Map<string, number>();
    for (const s of scopedScreenings) {
      if (s.date) {
        const key = new Date(s.date).toLocaleString("en-US", { month: "short" });
        monthlyMap.set(key, (monthlyMap.get(key) || 0) + 1);
      }
    }
    const monthlyScreenings = Array.from(monthlyMap.entries()).map(([month, count]) => ({ month, count }));

    return {
      totalPatients: patientSubset.length,
      highRiskPercentage: Math.round((high / total) * 100),
      exitHighRiskPercentage: 0,
      avgReductionDelayMonths: 0,
      patientsByRiskLevel: [
        { name: "Low", value: low },
        { name: "Medium", value: medium },
        { name: "High", value: high },
      ],
      monthlyScreenings: monthlyScreenings.length > 0 ? monthlyScreenings : [{ month: "Jan", count: 0 }],
    };
  }


  async getMessages(recipientId: number): Promise<Message[]> {
    return this.messagesList
      .filter(m => m.recipientId === recipientId)
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  async getSentMessages(senderId: number): Promise<Message[]> {
    return this.messagesList
      .filter(m => m.senderId === senderId)
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  async getMessage(id: number): Promise<Message | undefined> {
    return this.messagesList.find(m => m.id === id);
  }

  async createMessage(data: InsertMessage): Promise<Message> {
    const record: Message = {
      id: this.nextId.message++,
      createdAt: this.now(),
      completedAt: null,
      body: data.body ?? null,
      dueDate: data.dueDate ?? null,
      relatedPatientId: data.relatedPatientId ?? null,
      type: data.type ?? "message",
      priority: data.priority ?? "normal",
      status: data.status ?? "unread",
      ...data,
    };
    this.messagesList.push(record);
    return record;
  }

  async updateMessageStatus(id: number, status: string, completedAt?: Date): Promise<Message> {
    const idx = this.messagesList.findIndex(m => m.id === id);
    if (idx === -1) throw new Error("Message not found");
    this.messagesList[idx] = { ...this.messagesList[idx], status: status as any };
    if (completedAt) this.messagesList[idx].completedAt = completedAt;
    return this.messagesList[idx];
  }

  async getUnreadCount(recipientId: number): Promise<number> {
    return this.messagesList.filter(m => m.recipientId === recipientId && m.status === "unread").length;
  }
}

export const storage: IStorage = process.env.DATABASE_URL
  ? new DatabaseStorage()
  : new InMemoryStorage();

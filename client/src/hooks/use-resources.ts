import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import {
  type CreatePatientRequest,
  type CreateScreeningRequest,
  type UpdateInterventionRequest,
  type ProgramStats,
  type LongitudinalProgress,
  type SupervisorCenterAssignment,
  type Center,
  type Message,
  type PredictiveResult,
  type DataQualityMetrics,
  type ClusterDomainAvg,
  type DomainHeatmapEntry,
  type BlockTrendEntry,
  type AIPerformanceMetrics,
  type DistrictComparison,
  type IntensityAdjustment,
} from "@shared/schema";
import { useToast } from "@/hooks/use-toast";


export function usePatients(filters?: { search?: string; riskLevel?: 'Low' | 'Medium' | 'High' }) {
  return useQuery({
    queryKey: [api.patients.list.path, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.search)    params.set("search",    filters.search);
      if (filters?.riskLevel) params.set("riskLevel", filters.riskLevel);
      const qs = params.toString();
      const url = qs ? `${api.patients.list.path}?${qs}` : api.patients.list.path;

      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch patients");
      return api.patients.list.responses[200].parse(await res.json());
    },
  });
}

export function usePatient(id: number) {
  return useQuery({
    queryKey: [api.patients.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.patients.get.path, { id });
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch patient");
      return api.patients.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreatePatientRequest) => {
      const validated = api.patients.create.input.parse(data);
      const res = await fetch(api.patients.create.path, {
        method: api.patients.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = api.patients.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create patient");
      }
      return api.patients.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.patients.list.path] });
      toast({ title: "Success", description: "Patient registered successfully" });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });
}


export function useScreenings(patientId?: number) {
  return useQuery({
    queryKey: [api.screenings.list.path, patientId],
    queryFn: async () => {
      const url = patientId
        ? `${api.screenings.list.path}?patientId=${patientId}`
        : api.screenings.list.path;

      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch screenings");
      return api.screenings.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateScreening() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateScreeningRequest) => {
      const validated = api.screenings.create.input.parse(data);
      const res = await fetch(api.screenings.create.path, {
        method: api.screenings.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = api.screenings.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        if (res.status === 403) {
          const body = await res.json().catch(() => ({}));
          const err = new Error(body.error || "Consent required");
          (err as any).code = body.code;
          throw err;
        }
        throw new Error("Failed to submit screening");
      }
      return api.screenings.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.screenings.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.patients.list.path] });
      toast({ title: "Assessment Complete", description: "Screening submitted and analyzed." });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });
}


export function useInterventions(patientId?: number) {
  return useQuery({
    queryKey: [api.interventions.list.path, patientId],
    queryFn: async () => {
      const url = patientId
        ? `${api.interventions.list.path}?patientId=${patientId}`
        : api.interventions.list.path;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch interventions");
      return api.interventions.list.responses[200].parse(await res.json());
    },
  });
}

export function useUpdateIntervention() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateInterventionRequest) => {
      const validated = api.interventions.update.input.parse(updates);
      const url = buildUrl(api.interventions.update.path, { id });

      const res = await fetch(url, {
        method: api.interventions.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });

      if (!res.ok) {
        if (res.status === 404) throw new Error("Intervention not found");
        throw new Error("Failed to update intervention");
      }
      return api.interventions.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.interventions.list.path] });
      toast({ title: "Success", description: "Intervention updated" });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });
}


export function useInterventionPlans(patientId?: number) {
  return useQuery({
    queryKey: [api.interventionPlans.list.path, patientId],
    queryFn: async () => {
      const url = patientId
        ? `${api.interventionPlans.list.path}?patientId=${patientId}`
        : api.interventionPlans.list.path;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch intervention plans");
      return res.json();
    },
  });
}

export function useInterventionPlan(id: number) {
  return useQuery({
    queryKey: [api.interventionPlans.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.interventionPlans.get.path, { id });
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch intervention plan");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useGenerateInterventionPlan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      patientId: number;
      screeningId: number;
      ageMonths: number;
      riskLevel: string;
      answers: Record<string, string>;
      domainScores?: Record<string, number>;
    }) => {
      const res = await fetch(api.interventionPlans.generate.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to generate intervention plans");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.interventionPlans.list.path] });
      toast({ title: "Plans Generated", description: "Intervention plans created successfully." });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });
}

export function useUpdateInterventionPlan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number; [key: string]: any }) => {
      const url = buildUrl(api.interventionPlans.update.path, { id });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update intervention plan");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.interventionPlans.list.path] });
      toast({ title: "Success", description: "Intervention plan updated" });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });
}


export function useActivityLogs(interventionPlanId?: number, patientId?: number) {
  return useQuery({
    queryKey: [api.activityLogs.list.path, interventionPlanId, patientId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (interventionPlanId) params.set("interventionPlanId", String(interventionPlanId));
      if (patientId) params.set("patientId", String(patientId));
      const qs = params.toString();
      const url = qs ? `${api.activityLogs.list.path}?${qs}` : api.activityLogs.list.path;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch activity logs");
      return res.json();
    },
  });
}

export function useCreateActivityLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(api.activityLogs.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create activity log");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.activityLogs.list.path] });
    },
  });
}

export function useUpdateActivityLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number; [key: string]: any }) => {
      const url = buildUrl(api.activityLogs.update.path, { id });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update activity log");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.activityLogs.list.path] });
    },
  });
}


export function useConsentRecords(patientId: number) {
  return useQuery({
    queryKey: [api.consent.list.path, patientId],
    queryFn: async () => {
      const res = await fetch(`${api.consent.list.path}?patientId=${patientId}`);
      if (!res.ok) throw new Error("Failed to fetch consent records");
      return res.json();
    },
    enabled: !!patientId,
  });
}

export function useConsentCheck(patientId: number, consentType: string) {
  return useQuery({
    queryKey: [api.consent.check.path, patientId, consentType],
    queryFn: async () => {
      const url = buildUrl(api.consent.check.path, { patientId, type: consentType });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to check consent");
      return res.json() as Promise<{ hasConsent: boolean; record?: any }>;
    },
    enabled: !!patientId && !!consentType,
  });
}

export function useCreateConsent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(api.consent.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to create consent" }));
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.consent.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.consent.check.path] });
      toast({ title: "Consent Recorded", description: "Guardian consent has been recorded." });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });
}

export function useRevokeConsent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.consent.revoke.path, { id });
      const res = await fetch(url, { method: "POST" });
      if (!res.ok) throw new Error("Failed to revoke consent");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.consent.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.consent.check.path] });
      toast({ title: "Consent Revoked", description: "Consent has been revoked." });
    },
  });
}


export function usePatientProgress(patientId: number) {
  return useQuery({
    queryKey: [api.patients.progress.path, patientId],
    queryFn: async () => {
      const url = buildUrl(api.patients.progress.path, { id: patientId });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch patient progress");
      return res.json() as Promise<LongitudinalProgress>;
    },
    enabled: !!patientId,
  });
}


export function useAlerts(filters?: { status?: string; type?: string; severity?: string }) {
  return useQuery({
    queryKey: [api.alerts.list.path, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.set("status", filters.status);
      if (filters?.type) params.set("type", filters.type);
      if (filters?.severity) params.set("severity", filters.severity);
      const qs = params.toString();
      const url = qs ? `${api.alerts.list.path}?${qs}` : api.alerts.list.path;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch alerts");
      return res.json();
    },
  });
}

export function useAlertCounts() {
  return useQuery({
    queryKey: [api.alerts.counts.path],
    queryFn: async () => {
      const res = await fetch(api.alerts.counts.path);
      if (!res.ok) throw new Error("Failed to fetch alert counts");
      return res.json() as Promise<Record<string, number>>;
    },
  });
}

export function useUpdateAlert() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const url = buildUrl(api.alerts.update.path, { id });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update alert");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.alerts.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.alerts.counts.path] });
      toast({ title: "Alert Updated", description: "Alert status has been updated." });
    },
  });
}


export function useDistrictReport(from?: string, to?: string) {
  return useQuery({
    queryKey: [api.reports.district.path, from, to],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const qs = params.toString();
      const url = qs ? `${api.reports.district.path}?${qs}` : api.reports.district.path;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to generate report");
      return res.json();
    },
    enabled: false,
  });
}

export function useWorkerPerformance() {
  return useQuery({
    queryKey: [api.reports.workerPerformance.path],
    queryFn: async () => {
      const res = await fetch(api.reports.workerPerformance.path);
      if (!res.ok) throw new Error("Failed to fetch worker performance");
      return res.json();
    },
  });
}


export function useStats() {
  return useQuery({
    queryKey: [api.stats.get.path],
    queryFn: async () => {
      const res = await fetch(api.stats.get.path);
      if (!res.ok) throw new Error("Failed to fetch statistics");
      return api.stats.get.responses[200].parse(await res.json());
    },
  });
}


export function useUsers() {
  return useQuery({
    queryKey: [api.users.list.path],
    queryFn: async () => {
      const res = await fetch(api.users.list.path);
      if (!res.ok) throw new Error("Failed to fetch users");
      return api.users.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { username: string; password: string; name: string; role: string }) => {
      const res = await fetch(api.users.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Failed to create user" }));
        throw new Error(body.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.users.list.path] });
      toast({ title: "User Created", description: "New user account created successfully." });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, role, name }: { id: number; role: string; name?: string }) => {
      const url = buildUrl(api.users.update.path, { id });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, name }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Failed to update user" }));
        throw new Error(body.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.users.list.path] });
      toast({ title: "User Updated", description: "User role has been updated successfully." });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.users.delete.path, { id });
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Failed to delete user" }));
        throw new Error(body.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.users.list.path] });
      toast({ title: "User Deleted", description: "The user account has been removed." });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}


export function useAuditLogs(filters?: { userId?: number; resourceType?: string }) {
  return useQuery({
    queryKey: [api.auditLogs.list.path, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.userId) params.set("userId", String(filters.userId));
      if (filters?.resourceType) params.set("resourceType", filters.resourceType);
      const qs = params.toString();
      const url = qs ? `${api.auditLogs.list.path}?${qs}` : api.auditLogs.list.path;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      return res.json() as Promise<any[]>;
    },
  });
}


export function useAlertThresholds() {
  return useQuery({
    queryKey: [api.alertThresholds.list.path],
    queryFn: async () => {
      const res = await fetch(api.alertThresholds.list.path);
      if (!res.ok) throw new Error("Failed to fetch alert thresholds");
      return res.json() as Promise<any[]>;
    },
  });
}

export function useUpsertAlertThreshold() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { alertType: string; thresholdKey: string; thresholdValue: string; isActive?: boolean }) => {
      const res = await fetch(api.alertThresholds.upsert.path, {
        method: api.alertThresholds.upsert.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update threshold");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.alertThresholds.list.path] });
      toast({ title: "Threshold Updated", description: "Alert threshold saved successfully." });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}


export function useCenters() {
  return useQuery({
    queryKey: [api.centers.list.path],
    queryFn: async () => {
      const res = await fetch(api.centers.list.path);
      if (!res.ok) throw new Error("Failed to fetch centers");
      return res.json() as Promise<Center[]>;
    },
  });
}

export function useCenter(id: number) {
  return useQuery({
    queryKey: [api.centers.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.centers.get.path, { id });
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch center");
      return res.json() as Promise<Center>;
    },
    enabled: !!id,
  });
}

export function useCreateCenter() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { name: string; block: string; district: string; state: string; ngoName?: string }) => {
      const res = await fetch(api.centers.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Failed to create center" }));
        throw new Error(body.message);
      }
      return res.json() as Promise<Center>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.centers.list.path] });
      toast({ title: "Center Created", description: "Anganwadi center added successfully." });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export function useUpdateCenter() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number; [key: string]: any }) => {
      const url = buildUrl(api.centers.update.path, { id });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update center");
      return res.json() as Promise<Center>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.centers.list.path] });
      toast({ title: "Center Updated", description: "Center details updated." });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}


export function useAssignments() {
  return useQuery({
    queryKey: [api.assignments.list.path],
    queryFn: async () => {
      const res = await fetch(api.assignments.list.path);
      if (!res.ok) throw new Error("Failed to fetch assignments");
      return res.json() as Promise<SupervisorCenterAssignment[]>;
    },
  });
}

export function useCreateAssignment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { supervisorId: number; centerId: number }) => {
      const res = await fetch(api.assignments.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Failed to create assignment" }));
        throw new Error(body.message);
      }
      return res.json() as Promise<SupervisorCenterAssignment>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.assignments.list.path] });
      toast({ title: "Assignment Created", description: "Center assigned to supervisor." });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export function useDeleteAssignment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.assignments.delete.path, { id });
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete assignment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.assignments.list.path] });
      toast({ title: "Assignment Removed", description: "Center unassigned from supervisor." });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}


export function useScopedStats() {
  return useQuery({
    queryKey: [api.stats.scoped.path],
    queryFn: async () => {
      const res = await fetch(api.stats.scoped.path);
      if (!res.ok) throw new Error("Failed to fetch scoped statistics");
      return res.json() as Promise<ProgramStats>;
    },
  });
}


export function useMessages() {
  return useQuery({
    queryKey: [api.messages.list.path],
    queryFn: async () => {
      const res = await fetch(api.messages.list.path);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json() as Promise<Message[]>;
    },
  });
}

export function useSentMessages() {
  return useQuery({
    queryKey: [api.messages.sent.path],
    queryFn: async () => {
      const res = await fetch(api.messages.sent.path);
      if (!res.ok) throw new Error("Failed to fetch sent messages");
      return res.json() as Promise<Message[]>;
    },
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: [api.messages.unread.path],
    queryFn: async () => {
      const res = await fetch(api.messages.unread.path);
      if (!res.ok) throw new Error("Failed to fetch unread count");
      return res.json() as Promise<{ count: number }>;
    },
    refetchInterval: 30000,
  });
}

export function useMessage(id: number) {
  return useQuery({
    queryKey: [api.messages.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.messages.get.path, { id });
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch message");
      return res.json() as Promise<Message>;
    },
    enabled: !!id,
  });
}

export function useCreateMessage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      recipientId: number;
      type?: "message" | "task";
      subject: string;
      body?: string;
      priority?: "low" | "normal" | "high" | "urgent";
      dueDate?: string;
      relatedPatientId?: number;
    }) => {
      const res = await fetch(api.messages.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Failed to send message" }));
        throw new Error(body.message);
      }
      return res.json() as Promise<Message>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.messages.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.messages.sent.path] });
      queryClient.invalidateQueries({ queryKey: [api.messages.unread.path] });
      toast({ title: "Sent", description: "Message sent successfully." });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export function useUpdateMessageStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const url = buildUrl(api.messages.update.path, { id });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Failed to update message" }));
        throw new Error(body.message);
      }
      return res.json() as Promise<Message>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.messages.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.messages.sent.path] });
      queryClient.invalidateQueries({ queryKey: [api.messages.unread.path] });
      queryClient.invalidateQueries({ queryKey: [api.messages.get.path] });
      toast({ title: "Updated", description: "Message status updated." });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}


export function usePatientPrediction(patientId: number | undefined) {
  return useQuery({
    queryKey: [api.prediction.get.path, patientId],
    queryFn: async () => {
      const url = buildUrl(api.prediction.get.path, { id: patientId! });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch prediction");
      return res.json() as Promise<PredictiveResult | null>;
    },
    enabled: !!patientId,
  });
}

export function useAdjustInterventionIntensity() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { patientId: number; screeningId: number }) => {
      const res = await fetch(api.interventionAdjust.adjust.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Failed to adjust interventions" }));
        throw new Error(body.message);
      }
      return res.json() as Promise<IntensityAdjustment[]>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.interventions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.prediction.get.path, variables.patientId] });
      toast({ title: "Updated", description: "Intervention intensity adjusted based on latest screening." });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}


export function useDataQuality() {
  return useQuery({
    queryKey: [api.analytics.dataQuality.path],
    queryFn: async () => {
      const res = await fetch(api.analytics.dataQuality.path);
      if (!res.ok) throw new Error("Failed to fetch data quality metrics");
      return res.json() as Promise<DataQualityMetrics[]>;
    },
  });
}

export function useClusterDomains() {
  return useQuery({
    queryKey: [api.analytics.clusterDomains.path],
    queryFn: async () => {
      const res = await fetch(api.analytics.clusterDomains.path);
      if (!res.ok) throw new Error("Failed to fetch cluster domain averages");
      return res.json() as Promise<ClusterDomainAvg[]>;
    },
  });
}

export function useDomainHeatmap() {
  return useQuery({
    queryKey: [api.analytics.domainHeatmap.path],
    queryFn: async () => {
      const res = await fetch(api.analytics.domainHeatmap.path);
      if (!res.ok) throw new Error("Failed to fetch domain heatmap");
      return res.json() as Promise<DomainHeatmapEntry[]>;
    },
  });
}

export function useBlockTrends() {
  return useQuery({
    queryKey: [api.analytics.blockTrends.path],
    queryFn: async () => {
      const res = await fetch(api.analytics.blockTrends.path);
      if (!res.ok) throw new Error("Failed to fetch block trends");
      return res.json() as Promise<BlockTrendEntry[]>;
    },
  });
}

export function useAIPerformance() {
  return useQuery({
    queryKey: [api.analytics.aiPerformance.path],
    queryFn: async () => {
      const res = await fetch(api.analytics.aiPerformance.path);
      if (!res.ok) throw new Error("Failed to fetch AI performance metrics");
      return res.json() as Promise<AIPerformanceMetrics>;
    },
  });
}

export function useDistrictComparison() {
  return useQuery({
    queryKey: [api.analytics.districtComparison.path],
    queryFn: async () => {
      const res = await fetch(api.analytics.districtComparison.path);
      if (!res.ok) throw new Error("Failed to fetch district comparison");
      return res.json() as Promise<DistrictComparison[]>;
    },
  });
}

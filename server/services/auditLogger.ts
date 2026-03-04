import { storage } from "../storage";
import type { InsertAuditLog } from "@shared/schema";

export interface AuditEntry {
  userId?: number;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * Log an audit event. Fire-and-forget — never throws.
 */
export function logAudit(entry: AuditEntry): void {
  const log: InsertAuditLog = {
    userId: entry.userId ?? null,
    action: entry.action,
    resourceType: entry.resourceType,
    resourceId: entry.resourceId ?? null,
    details: entry.details ?? null,
    ipAddress: entry.ipAddress ?? null,
  };

  storage.createAuditLog(log).catch((err) => {
    console.error("[auditLogger] Failed to write audit log:", err);
  });
}

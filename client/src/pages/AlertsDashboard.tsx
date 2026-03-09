import { useState } from "react";
import { useAlerts, useAlertCounts, useUpdateAlert } from "@/hooks/use-resources";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { Bell, AlertTriangle, AlertCircle, CheckCircle2, Eye, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";

export default function AlertsDashboard() {
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [severityFilter, setSeverityFilter] = useState<string>("");

  const { data: alertsList, isLoading } = useAlerts({
    status: statusFilter || undefined,
    severity: severityFilter || undefined,
  });
  const { data: counts } = useAlertCounts();
  const { mutate: updateAlert } = useUpdateAlert();

  const severityConfig: Record<string, { color: string; icon: typeof AlertCircle; label: string }> = {
    critical: { color: "bg-red-100 text-red-700 border-red-200", icon: AlertCircle, label: "Critical" },
    high: { color: "bg-orange-100 text-orange-700 border-orange-200", icon: AlertTriangle, label: "High" },
    medium: { color: "bg-amber-100 text-amber-700 border-amber-200", icon: Bell, label: "Medium" },
    low: { color: "bg-blue-100 text-blue-700 border-blue-200", icon: Eye, label: "Low" },
  };

  const typeLabels: Record<string, string> = {
    high_risk_detected: "High Risk Detected",
    missed_followup: "Missed Follow-up",
    no_improvement: "No Improvement",
    supervisor_escalation: "Supervisor Escalation",
    regional_risk_spike: "Regional Risk Spike",
    consent_expiring: "Consent Expiring",
  };

  function handleAcknowledge(id: number) {
    updateAlert({ id, status: "acknowledged" });
  }

  function handleResolve(id: number) {
    updateAlert({ id, status: "resolved" });
  }

  function handleDismiss(id: number) {
    updateAlert({ id, status: "dismissed" });
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-7">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Alert Management</h1>
        <p className="text-muted-foreground text-sm mt-1">Monitor and respond to system-generated alerts</p>
      </div>

      {/* Severity summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { key: "critical", label: "Critical", color: "text-red-600 bg-red-50 border-red-200" },
          { key: "high", label: "High", color: "text-orange-600 bg-orange-50 border-orange-200" },
          { key: "medium", label: "Medium", color: "text-amber-600 bg-amber-50 border-amber-200" },
          { key: "low", label: "Low", color: "text-blue-600 bg-blue-50 border-blue-200" },
          { key: "total", label: "Total Active", color: "text-gray-700 bg-gray-50 border-gray-200" },
        ].map(item => (
          <Card key={item.key} className={`border ${item.color}`}>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold">{counts?.[item.key] ?? 0}</p>
              <p className="text-xs font-medium mt-0.5">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] bg-background">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-background">
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="acknowledged">Acknowledged</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[160px] bg-background">
            <SelectValue placeholder="All Severities" />
          </SelectTrigger>
          <SelectContent className="bg-background">
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Alert list */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading alerts...</div>
      ) : !alertsList || alertsList.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
          <p>No {statusFilter} alerts found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(alertsList as any[]).map((alert: any) => {
            const config = severityConfig[alert.severity] || severityConfig.medium;
            const Icon = config.icon;

            return (
              <Card key={alert.id} className="overflow-hidden">
                <div className={`h-1 w-full ${
                  alert.severity === "critical" ? "bg-red-500" :
                  alert.severity === "high" ? "bg-orange-500" :
                  alert.severity === "medium" ? "bg-amber-500" : "bg-blue-500"
                }`} />
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start gap-3">
                    <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                      alert.severity === "critical" ? "text-red-500" :
                      alert.severity === "high" ? "text-orange-500" :
                      alert.severity === "medium" ? "text-amber-500" : "text-blue-500"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm">{alert.title}</h3>
                        <Badge className={config.color} variant="outline">{config.label}</Badge>
                        <Badge variant="outline" className="text-xs">{typeLabels[alert.type] || alert.type}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {alert.createdAt ? format(new Date(alert.createdAt), "PPp") : "Unknown"}
                        </span>
                        {alert.patientId && (
                          <button
                            className="text-primary hover:underline"
                            onClick={() => setLocation(`/patients/${alert.patientId}`)}
                          >
                            View Patient
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      {alert.status === "active" && (
                        <>
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleAcknowledge(alert.id)}>
                            Acknowledge
                          </Button>
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleResolve(alert.id)}>
                            Resolve
                          </Button>
                        </>
                      )}
                      {alert.status === "acknowledged" && (
                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleResolve(alert.id)}>
                          Resolve
                        </Button>
                      )}
                      {(alert.status === "active" || alert.status === "acknowledged") && (
                        <Button size="sm" variant="ghost" className="text-xs h-7 text-muted-foreground" onClick={() => handleDismiss(alert.id)}>
                          <XCircle className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

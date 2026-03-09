import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, FileText, Users, TrendingUp, BarChart3, Share2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from "recharts";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import type { DistrictReport } from "@shared/schema";

export default function ReportsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [report, setReport] = useState<DistrictReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fhirExporting, setFhirExporting] = useState<string | null>(null);

  const canExportFHIR = user && ["admin", "cdpo", "dwcweo", "higher_official"].includes(user.role);

  async function exportFHIR(type: "Patient" | "Observation" | "CarePlan" | "Bundle") {
    setFhirExporting(type);
    try {
      const res = await fetch(`/api/fhir/${type}`);
      if (!res.ok) throw new Error("Export failed");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/fhir+json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fhir-${type.toLowerCase()}-bundle-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Exported", description: `FHIR ${type} bundle downloaded successfully.` });
    } catch {
      toast({ title: "Export Failed", description: `Could not export FHIR ${type} data.`, variant: "destructive" });
    } finally {
      setFhirExporting(null);
    }
  }

  async function generateReport() {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const qs = params.toString();
      const url = qs ? `/api/reports/district?${qs}` : "/api/reports/district";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to generate report");
      setReport(await res.json());
    } catch (_err) {
      // Error handled via UI state — no sensitive data logged to console
    } finally {
      setIsLoading(false);
    }
  }

  function downloadCSV() {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const qs = params.toString();
    const url = qs ? `/api/reports/district/csv?${qs}` : "/api/reports/district/csv";
    window.open(url, "_blank");
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-7">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">District Reports</h1>
        <p className="text-muted-foreground text-sm mt-1">Generate and export program performance reports</p>
      </div>

      {/* Date range picker */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Report Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4 flex-wrap">
            <div className="space-y-1.5">
              <Label className="text-xs">From Date</Label>
              <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-[180px]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">To Date</Label>
              <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-[180px]" />
            </div>
            <Button onClick={generateReport} disabled={isLoading} className="gap-2">
              <FileText className="w-4 h-4" />
              {isLoading ? "Generating..." : "Generate Report"}
            </Button>
            {report && (
              <Button variant="outline" onClick={downloadCSV} className="gap-2">
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* FHIR Data Export */}
      {canExportFHIR && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              FHIR Data Export
            </CardTitle>
            <CardDescription>
              Export data in HL7 FHIR R4 format for integration with government health systems (NHM, ABDM) and external platforms.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button
                variant="outline"
                className="gap-2 h-auto py-3 flex-col"
                disabled={fhirExporting !== null}
                onClick={() => exportFHIR("Patient")}
              >
                <Users className="w-4 h-4" />
                <span className="text-xs">{fhirExporting === "Patient" ? "Exporting..." : "Patients"}</span>
              </Button>
              <Button
                variant="outline"
                className="gap-2 h-auto py-3 flex-col"
                disabled={fhirExporting !== null}
                onClick={() => exportFHIR("Observation")}
              >
                <FileText className="w-4 h-4" />
                <span className="text-xs">{fhirExporting === "Observation" ? "Exporting..." : "Screenings"}</span>
              </Button>
              <Button
                variant="outline"
                className="gap-2 h-auto py-3 flex-col"
                disabled={fhirExporting !== null}
                onClick={() => exportFHIR("CarePlan")}
              >
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs">{fhirExporting === "CarePlan" ? "Exporting..." : "Care Plans"}</span>
              </Button>
              <Button
                variant="outline"
                className="gap-2 h-auto py-3 flex-col border-primary/30 bg-primary/5"
                disabled={fhirExporting !== null}
                onClick={() => exportFHIR("Bundle")}
              >
                <Download className="w-4 h-4" />
                <span className="text-xs font-medium">{fhirExporting === "Bundle" ? "Exporting..." : "Export All"}</span>
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-3">
              Files are exported as FHIR R4 JSON Bundles. Compatible with ABDM, OpenMRS, DHIS2, and other FHIR-compliant systems.
            </p>
          </CardContent>
        </Card>
      )}

      {report && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-5 pb-4">
                <p className="text-xs text-muted-foreground uppercase font-medium">Total Patients</p>
                <p className="text-2xl font-bold mt-1">{report.summary.totalPatients}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <p className="text-xs text-muted-foreground uppercase font-medium">Screenings</p>
                <p className="text-2xl font-bold mt-1">{report.summary.totalScreenings}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <p className="text-xs text-muted-foreground uppercase font-medium">Follow-up Rate</p>
                <p className="text-2xl font-bold mt-1">{report.summary.followUpCompletionRate}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <p className="text-xs text-muted-foreground uppercase font-medium">Intervention Adherence</p>
                <p className="text-2xl font-bold mt-1">{report.summary.interventionAdherenceRate}%</p>
              </CardContent>
            </Card>
          </div>

          {/* Risk distribution */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Risk Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { label: "High Risk", value: report.summary.riskDistribution.high, color: "bg-red-500", total: report.summary.totalScreenings },
                    { label: "Medium Risk", value: report.summary.riskDistribution.medium, color: "bg-amber-500", total: report.summary.totalScreenings },
                    { label: "Low Risk", value: report.summary.riskDistribution.low, color: "bg-green-500", total: report.summary.totalScreenings },
                  ].map(item => (
                    <div key={item.label} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{item.label}</span>
                        <span className="font-mono">{item.value} ({item.total > 0 ? Math.round((item.value / item.total) * 100) : 0}%)</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={`${item.color} h-2 rounded-full transition-all`}
                          style={{ width: `${item.total > 0 ? (item.value / item.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Intervention Effectiveness
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/30 border text-center">
                    <p className="text-xl font-bold">{report.interventionEffectiveness.totalPlans}</p>
                    <p className="text-xs text-muted-foreground">Total Plans</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border text-center">
                    <p className="text-xl font-bold">{report.interventionEffectiveness.activePlans}</p>
                    <p className="text-xs text-muted-foreground">Active Plans</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border text-center">
                    <p className="text-xl font-bold">{report.interventionEffectiveness.completedPlans}</p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border text-center">
                    <p className={`text-xl font-bold ${report.interventionEffectiveness.avgImprovementIndex > 0 ? "text-green-600" : "text-gray-600"}`}>
                      {report.interventionEffectiveness.avgImprovementIndex > 0 ? "+" : ""}{report.interventionEffectiveness.avgImprovementIndex}%
                    </p>
                    <p className="text-xs text-muted-foreground">Avg Improvement</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Risk trends chart */}
          {report.riskTrends.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Monthly Risk Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={report.riskTrends}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Legend />
                    <Bar dataKey="high" name="High" fill="#ef4444" stackId="risk" />
                    <Bar dataKey="medium" name="Medium" fill="#f59e0b" stackId="risk" />
                    <Bar dataKey="low" name="Low" fill="#22c55e" stackId="risk" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Worker performance table */}
          {report.workerPerformance.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Worker Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 font-medium text-muted-foreground">Worker</th>
                        <th className="pb-2 font-medium text-muted-foreground text-center">Screenings</th>
                        <th className="pb-2 font-medium text-muted-foreground text-center">Patients</th>
                        <th className="pb-2 font-medium text-muted-foreground text-center">Avg Risk Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.workerPerformance.map((w: any) => (
                        <tr key={w.userId} className="border-b last:border-0">
                          <td className="py-2.5 font-medium">{w.userName}</td>
                          <td className="py-2.5 text-center font-mono">{w.screeningsCount}</td>
                          <td className="py-2.5 text-center font-mono">{w.patientsCount}</td>
                          <td className="py-2.5 text-center">
                            <Badge className={`${w.avgRiskScore >= 75 ? "bg-red-100 text-red-700" : w.avgRiskScore >= 41 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                              {w.avgRiskScore}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="text-xs text-muted-foreground text-center">
            Report period: {report.period.from} to {report.period.to}
          </div>
        </>
      )}
    </div>
  );
}

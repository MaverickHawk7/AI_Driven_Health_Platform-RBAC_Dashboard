import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, AlertTriangle, TrendingDown, Activity, ArrowRight, Grid3X3, ClipboardCheck, Filter } from "lucide-react";
import { useScopedStats, useAlertCounts, useAlerts, useClusterDomains, useDomainHeatmap, useCenters } from "@/hooks/use-resources";
import { Link } from "wouter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function heatmapColor(value: number): string {
  if (value > 10) return "bg-green-200 text-green-800";
  if (value > 0) return "bg-green-50 text-green-700";
  if (value === 0) return "bg-gray-50 text-gray-600";
  if (value > -10) return "bg-red-50 text-red-700";
  return "bg-red-200 text-red-800";
}

export default function CDPODashboard() {
  const { data: stats, isLoading: statsLoading } = useScopedStats(
    centerFilter ? { centerId: centerFilter } : undefined
  );
  const { data: alertCounts } = useAlertCounts();
  const { data: regressionAlerts } = useAlerts({ type: "no_improvement", status: "active" });
  const { data: clusterDomains } = useClusterDomains();
  const { data: domainHeatmap } = useDomainHeatmap();
  const { data: centersList } = useCenters();

  const [centerFilter, setCenterFilter] = useState<string>("");

  // Derive unique blocks from centers (for display)
  const currentBlock = centersList?.[0]?.block ?? "—";

  // Filter cluster/heatmap data by selected center
  const filteredClusterDomains = centerFilter
    ? clusterDomains?.filter((c) => c.centerId === Number(centerFilter))
    : clusterDomains;
  const filteredDomainHeatmap = centerFilter
    ? domainHeatmap?.filter((c) => c.centerId === Number(centerFilter))
    : domainHeatmap;

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading block dashboard...</div>
      </div>
    );
  }

  const totalAlerts = alertCounts ? Object.values(alertCounts).reduce((a: number, b: number) => a + (b as number), 0) : 0;

  // Compute intervention adherence from cluster domains data
  const adherenceData = filteredClusterDomains?.map((c) => ({
    centerId: c.centerId,
    centerName: c.centerName,
    screeningCount: c.screeningCount,
    avgRisk: Math.round((c.avgMotor + c.avgSocial + c.avgLanguage + c.avgNutrition + c.avgCognitive) / 5),
  }));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="w-6 h-6" />
          Block Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">CDPO — Block-level monitoring and oversight</p>
      </div>

      {/* Location Filters */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="w-4 h-4" />
              Filters
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Block:</span>
              <Badge variant="outline" className="text-xs font-medium">{currentBlock}</Badge>
            </div>

            <Select value={centerFilter || "all"} onValueChange={v => setCenterFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[200px] h-8 text-xs bg-background">
                <SelectValue placeholder="Center" />
              </SelectTrigger>
              <SelectContent className="bg-background">
                <SelectItem value="all">All Centers</SelectItem>
                {(centersList || []).map((c: any) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {centerFilter && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground"
                onClick={() => setCenterFilter("")}
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-white to-blue-50 border-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-900">Total Children Screened</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">{stats?.totalPatients ?? 0}</div>
            <p className="text-xs text-blue-600/80 mt-1">Across all centers in block</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-white to-rose-50 border-rose-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-rose-900">High Risk Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-rose-700">{stats?.highRiskPercentage ?? 0}%</div>
            <p className="text-xs text-rose-600/80 mt-1">Block-wide high risk percentage</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-white to-emerald-50 border-emerald-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-900">Recovery Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-700">{stats?.exitHighRiskPercentage ?? 0}%</div>
            <p className="text-xs text-emerald-600/80 mt-1">Exited high-risk status</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-white to-amber-50 border-amber-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-900">Active Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-700">{totalAlerts}</div>
            <p className="text-xs text-amber-600/80 mt-1">Requiring attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Regression Detection Alerts */}
      <Card className="border-red-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-500" />
            Regression Detection
          </CardTitle>
          <CardDescription>Patients whose latest screening shows higher risk than previous.</CardDescription>
        </CardHeader>
        <CardContent>
          {regressionAlerts && regressionAlerts.length > 0 ? (
            <div className="space-y-3">
              {regressionAlerts.map((alert: any) => (
                <div key={alert.id} className="flex items-center justify-between p-3 rounded-lg border border-red-200 bg-red-50">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{alert.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{alert.message}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive" className="text-xs">{alert.severity}</Badge>
                    {alert.patientId && (
                      <Link href={`/patients/${alert.patientId}`}>
                        <Button size="sm" variant="ghost" className="h-7">
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No regression alerts detected. All patients are progressing well.</p>
          )}
        </CardContent>
      </Card>

      {/* Intervention Adherence by Center */}
      {adherenceData && adherenceData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-blue-500" />
              Center Performance Overview
            </CardTitle>
            <CardDescription>Per-center screening volume and average risk scores.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Center</TableHead>
                  <TableHead className="text-center">Screenings</TableHead>
                  <TableHead className="text-center">Avg Risk Score</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adherenceData.map((c) => (
                  <TableRow key={c.centerId}>
                    <TableCell className="font-medium">{c.centerName}</TableCell>
                    <TableCell className="text-center font-mono">{c.screeningCount}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={`${c.avgRisk >= 75 ? "bg-red-100 text-red-700" : c.avgRisk >= 40 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                        {c.avgRisk}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={`text-xs ${c.avgRisk < 40 ? "text-green-700 border-green-200" : c.avgRisk < 75 ? "text-amber-700 border-amber-200" : "text-red-700 border-red-200"}`}>
                        {c.avgRisk < 40 ? "On Track" : c.avgRisk < 75 ? "Needs Attention" : "Critical"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Domain Improvement Heatmap */}
      {filteredDomainHeatmap && filteredDomainHeatmap.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Grid3X3 className="w-5 h-5 text-indigo-500" />
              Domain Improvement Heatmap
            </CardTitle>
            <CardDescription>
              Per-center domain improvement percentages. Green = improved, Red = regressed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left pb-2 font-medium text-muted-foreground">Center</th>
                    <th className="text-center pb-2 font-medium text-muted-foreground">Motor</th>
                    <th className="text-center pb-2 font-medium text-muted-foreground">Social</th>
                    <th className="text-center pb-2 font-medium text-muted-foreground">Language</th>
                    <th className="text-center pb-2 font-medium text-muted-foreground">Nutrition</th>
                    <th className="text-center pb-2 font-medium text-muted-foreground">Cognitive</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDomainHeatmap.map((row) => (
                    <tr key={row.centerId} className="border-b last:border-0">
                      <td className="py-2 font-medium">{row.centerName}</td>
                      {(["motor", "social", "language", "nutrition", "cognitive"] as const).map((domain) => {
                        const val = row[domain];
                        return (
                          <td key={domain} className="text-center py-2">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono ${heatmapColor(val)}`}>
                              {val > 0 ? "+" : ""}{val}%
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Grid3X3 className="w-4 h-4" />
              Domain Improvement Heatmap
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">Domain-level improvement heatmap will appear once sufficient screening data is available across centers.</p>
          </CardContent>
        </Card>
      )}

      {/* Risk Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Block Risk Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.patientsByRiskLevel ? (
            <div className="space-y-3">
              {stats.patientsByRiskLevel.map((item: any) => {
                const total = stats.patientsByRiskLevel.reduce((s: number, i: any) => s + i.value, 0) || 1;
                const pct = Math.round((item.value / total) * 100);
                const color = item.name === "High" ? "bg-red-500" : item.name === "Medium" ? "bg-amber-500" : "bg-green-500";
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{item.name} Risk</span>
                      <span>{item.value} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No screening data available.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

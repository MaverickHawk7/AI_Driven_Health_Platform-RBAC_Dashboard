import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, Brain, TrendingUp, Users, Filter } from "lucide-react";
import { useScopedStats, useAIPerformance, useDistrictComparison, useCenters } from "@/hooks/use-resources";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ScatterChart, Scatter, Cell, ZAxis } from "recharts";

export default function HODashboard() {
  const [districtFilter, setDistrictFilter] = useState<string>("");
  const [blockFilter, setBlockFilter] = useState<string>("");
  const [centerFilter, setCenterFilter] = useState<string>("");

  const { data: stats, isLoading: statsLoading } = useScopedStats(
    centerFilter ? { centerId: centerFilter } :
    blockFilter ? { block: blockFilter } :
    districtFilter ? { district: districtFilter } :
    undefined
  );
  const { data: aiPerf } = useAIPerformance();
  const { data: districtComp } = useDistrictComparison();
  const { data: centersList } = useCenters();

  // Derive unique districts from centers
  const uniqueDistricts = useMemo(() => {
    if (!centersList) return [];
    return Array.from(new Set(centersList.map((c: any) => c.district))).sort();
  }, [centersList]);

  // Blocks filtered by selected district
  const uniqueBlocks = useMemo(() => {
    if (!centersList) return [];
    const filtered = districtFilter
      ? centersList.filter((c: any) => c.district === districtFilter)
      : centersList;
    return Array.from(new Set(filtered.map((c: any) => c.block))).sort();
  }, [centersList, districtFilter]);

  // Centers filtered by selected block (and district)
  const filteredCenters = useMemo(() => {
    if (!centersList) return [];
    let filtered = centersList;
    if (districtFilter) filtered = filtered.filter((c: any) => c.district === districtFilter);
    if (blockFilter) filtered = filtered.filter((c: any) => c.block === blockFilter);
    return filtered;
  }, [centersList, districtFilter, blockFilter]);

  const handleDistrictChange = (v: string) => {
    setDistrictFilter(v === "all" ? "" : v);
    setBlockFilter("");
    setCenterFilter("");
  };

  const handleBlockChange = (v: string) => {
    setBlockFilter(v === "all" ? "" : v);
    setCenterFilter("");
  };

  // Filter district comparison data
  const filteredDistrictComp = districtFilter
    ? districtComp?.filter((d) => d.district === districtFilter)
    : districtComp;

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading state dashboard...</div>
      </div>
    );
  }

  // Scatter plot data: workers vs recovery rate
  const scatterData = filteredDistrictComp?.map((d) => ({
    district: d.district,
    workers: d.activeWorkers,
    recoveryRate: d.recoveryRate,
    totalPatients: d.totalPatients,
  })) || [];

  const scatterColors = ["#6366f1", "#f59e0b", "#22c55e", "#ef4444", "#06b6d4", "#8b5cf6", "#ec4899", "#14b8a6"];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Globe className="w-6 h-6" />
          State Governance Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">Higher Official — State-level program oversight and AI governance</p>
      </div>

      {/* Location Filters */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="w-4 h-4" />
              Filters
            </div>

            <Select value={districtFilter || "all"} onValueChange={handleDistrictChange}>
              <SelectTrigger className="w-[180px] h-8 text-xs bg-background">
                <SelectValue placeholder="District" />
              </SelectTrigger>
              <SelectContent className="bg-background">
                <SelectItem value="all">All Districts</SelectItem>
                {uniqueDistricts.map((d: string) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={blockFilter || "all"} onValueChange={handleBlockChange}>
              <SelectTrigger className="w-[180px] h-8 text-xs bg-background">
                <SelectValue placeholder="Block" />
              </SelectTrigger>
              <SelectContent className="bg-background">
                <SelectItem value="all">All Blocks</SelectItem>
                {uniqueBlocks.map((b: string) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={centerFilter || "all"} onValueChange={v => setCenterFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[200px] h-8 text-xs bg-background">
                <SelectValue placeholder="Center" />
              </SelectTrigger>
              <SelectContent className="bg-background">
                <SelectItem value="all">All Centers</SelectItem>
                {filteredCenters.map((c: any) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(districtFilter || blockFilter || centerFilter) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground"
                onClick={() => { setDistrictFilter(""); setBlockFilter(""); setCenterFilter(""); }}
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
            <CardTitle className="text-sm font-medium text-blue-900">Total Children (State)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">{stats?.totalPatients ?? 0}</div>
            <p className="text-xs text-blue-600/80 mt-1">System-wide</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-white to-rose-50 border-rose-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-rose-900">High Risk Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-rose-700">{stats?.highRiskPercentage ?? 0}%</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-white to-emerald-50 border-emerald-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-900">Recovery Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-700">{stats?.exitHighRiskPercentage ?? 0}%</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-white to-indigo-50 border-indigo-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-indigo-900">Avg Risk Reduction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-700">{stats?.avgReductionDelayMonths ?? 0}<span className="text-lg text-muted-foreground ml-1">mo</span></div>
          </CardContent>
        </Card>
      </div>

      {/* AI Model Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-500" />
            AI Model Performance
          </CardTitle>
          <CardDescription>Proxy metrics for AI model reliability and usage patterns.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg border bg-gradient-to-br from-white to-indigo-50">
              <p className="text-sm text-muted-foreground">AI Usage Rate</p>
              <p className="text-2xl font-bold mt-1 text-indigo-700">
                {aiPerf ? `${Math.round(aiPerf.aiUsageRate)}%` : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">% using LLM analysis</p>
            </div>
            <div className="p-4 rounded-lg border bg-gradient-to-br from-white to-amber-50">
              <p className="text-sm text-muted-foreground">Fallback Rate</p>
              <p className="text-2xl font-bold mt-1 text-amber-700">
                {aiPerf ? `${Math.round(aiPerf.fallbackRate)}%` : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">% using rule-based fallback</p>
            </div>
            <div className="p-4 rounded-lg border bg-gradient-to-br from-white to-green-50">
              <p className="text-sm text-muted-foreground">AI-Fallback Consistency</p>
              <p className="text-2xl font-bold mt-1 text-green-700">
                {aiPerf ? `${Math.round(aiPerf.consistencyScore)}%` : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Score agreement within ±15pts</p>
            </div>
            <div className="p-4 rounded-lg border bg-gradient-to-br from-white to-blue-50">
              <p className="text-sm text-muted-foreground">Total Screenings</p>
              <p className="text-2xl font-bold mt-1 text-blue-700">
                {aiPerf ? aiPerf.totalScreenings : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Screenings analyzed</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Policy Impact Comparison */}
      {filteredDistrictComp && filteredDistrictComp.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Policy Impact — District Comparison
            </CardTitle>
            <CardDescription>Compare screening coverage, high-risk rate, and intervention completion across districts.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={filteredDistrictComp} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="district" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="highRiskRate" name="High Risk %" fill="#ef4444" radius={[2, 2, 0, 0]} />
                <Bar dataKey="recoveryRate" name="Recovery %" fill="#22c55e" radius={[2, 2, 0, 0]} />
                <Bar dataKey="interventionCompletionRate" name="Intervention %" fill="#6366f1" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Fund Allocation Efficiency */}
      {scatterData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Resource Allocation vs Outcomes
            </CardTitle>
            <CardDescription>
              Each dot is a district. X-axis = active field workers (resource proxy). Y-axis = recovery rate (outcome).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="workers" name="Field Workers" tick={{ fontSize: 11 }} label={{ value: "Active Field Workers", position: "insideBottom", offset: -10, fontSize: 11 }} />
                <YAxis dataKey="recoveryRate" name="Recovery Rate" tick={{ fontSize: 11 }} unit="%" label={{ value: "Recovery Rate %", angle: -90, position: "insideLeft", fontSize: 11 }} />
                <ZAxis dataKey="totalPatients" range={[60, 400]} name="Total Patients" />
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  formatter={(value: any, name: string) => [name === "Total Patients" ? value : `${value}%`, name]}
                  labelFormatter={() => ""}
                  cursor={{ strokeDasharray: "3 3" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white border rounded-lg p-2 shadow text-xs">
                        <p className="font-bold">{d.district}</p>
                        <p>Workers: {d.workers}</p>
                        <p>Recovery: {d.recoveryRate}%</p>
                        <p>Patients: {d.totalPatients}</p>
                      </div>
                    );
                  }}
                />
                <Scatter data={scatterData}>
                  {scatterData.map((entry, i) => (
                    <Cell key={entry.district} fill={scatterColors[i % scatterColors.length]} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-3">
              {scatterData.map((d, i) => (
                <Badge key={d.district} variant="outline" className="text-xs gap-1">
                  <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: scatterColors[i % scatterColors.length] }} />
                  {d.district}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* State-Wide Risk Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>State-Wide Risk Distribution</CardTitle>
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

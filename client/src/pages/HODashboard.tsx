import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, Brain, TrendingUp, Users, Filter, MapPin, Building2, Apple, FileText } from "lucide-react";
import { useScopedStats, useAIPerformance, useDistrictComparison, useCenters, useNutritionStats, useReferralPipelineStats, useOutcomeStats, useEnvironmentStats } from "@/hooks/use-resources";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ScatterChart, Scatter, Cell, ZAxis } from "recharts";
import { DISTRICTS } from "@shared/constants";
import DWCWEODashboard from "./DWCWEODashboard";
import CDPODashboard from "./CDPODashboard";
import { T, useLanguage } from "@/hooks/use-language";

export default function HODashboard() {
  const { t } = useLanguage();
  const [view, setView] = useState<"state" | "district" | "block">("state");
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
  const { data: nutritionStats } = useNutritionStats();
  const { data: referralStats } = useReferralPipelineStats();
  const { data: outcomeStats } = useOutcomeStats();
  const { data: environmentStats } = useEnvironmentStats();

  const uniqueDistricts = DISTRICTS;

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
        <div className="text-muted-foreground"><T>Loading state dashboard...</T></div>
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

  const viewToggle = (
    <div className="flex rounded-lg border overflow-hidden">
      <button
        onClick={() => setView("state")}
        className={`px-4 py-2 text-sm font-medium flex items-center gap-1.5 ${view === "state" ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:bg-muted/50 transition-colors"}`}
      >
        <Globe className="w-3.5 h-3.5" />
        <T>State</T>
      </button>
      <button
        onClick={() => setView("district")}
        className={`px-4 py-2 text-sm font-medium flex items-center gap-1.5 ${view === "district" ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:bg-muted/50 transition-colors"}`}
      >
        <MapPin className="w-3.5 h-3.5" />
        <T>District</T>
      </button>
      <button
        onClick={() => setView("block")}
        className={`px-4 py-2 text-sm font-medium flex items-center gap-1.5 ${view === "block" ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:bg-muted/50 transition-colors"}`}
      >
        <Building2 className="w-3.5 h-3.5" />
        <T>Block</T>
      </button>
    </div>
  );

  if (view === "district") {
    return (
      <div>
        <div className="p-6 pb-0 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Globe className="w-6 h-6" />
                <T>State Governance Dashboard</T>
              </h1>
              <p className="text-muted-foreground mt-1"><T>Higher Official — State-level program oversight and AI governance</T></p>
            </div>
            {viewToggle}
          </div>
        </div>
        <DWCWEODashboard embedded />
      </div>
    );
  }

  if (view === "block") {
    return (
      <div>
        <div className="p-6 pb-0 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Globe className="w-6 h-6" />
                <T>State Governance Dashboard</T>
              </h1>
              <p className="text-muted-foreground mt-1"><T>Higher Official — State-level program oversight and AI governance</T></p>
            </div>
            {viewToggle}
          </div>
        </div>
        <CDPODashboard embedded />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-7 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="w-6 h-6" />
            <T>State Governance Dashboard</T>
          </h1>
          <p className="text-muted-foreground mt-1"><T>Higher Official — State-level program oversight and AI governance</T></p>
        </div>
        {viewToggle}
      </div>

      {/* Location Filters */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="w-4 h-4" />
              <T>Filters</T>
            </div>

            <Select value={districtFilter || "all"} onValueChange={handleDistrictChange}>
              <SelectTrigger className="w-[180px] h-8 text-xs bg-background">
                <SelectValue placeholder={t("District")} />
              </SelectTrigger>
              <SelectContent className="bg-background">
                <SelectItem value="all"><T>All Districts</T></SelectItem>
                {uniqueDistricts.map((d: string) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={blockFilter || "all"} onValueChange={handleBlockChange}>
              <SelectTrigger className="w-[180px] h-8 text-xs bg-background">
                <SelectValue placeholder={t("Block")} />
              </SelectTrigger>
              <SelectContent className="bg-background">
                <SelectItem value="all"><T>All Blocks</T></SelectItem>
                {uniqueBlocks.map((b: string) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={centerFilter || "all"} onValueChange={v => setCenterFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[200px] h-8 text-xs bg-background">
                <SelectValue placeholder={t("Center")} />
              </SelectTrigger>
              <SelectContent className="bg-background">
                <SelectItem value="all"><T>All Centers</T></SelectItem>
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
                <T>Clear</T>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <Card className="bg-gradient-to-br from-white to-blue-50 border-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-900"><T>Total Children (State)</T></CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">{stats?.totalPatients ?? 0}</div>
            <p className="text-xs text-blue-600/80 mt-1"><T>System-wide</T></p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-white to-rose-50 border-rose-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-rose-900"><T>High Risk Rate</T></CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-rose-700">{stats?.highRiskPercentage ?? 0}%</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-white to-emerald-50 border-emerald-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-900"><T>Recovery Rate</T></CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-700">{stats?.exitHighRiskPercentage ?? 0}%</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-white to-indigo-50 border-indigo-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-indigo-900"><T>Avg Risk Reduction</T></CardTitle>
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
            <T>AI Model Performance</T>
          </CardTitle>
          <CardDescription><T>Proxy metrics for AI model reliability and usage patterns.</T></CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="p-4 rounded-lg border bg-gradient-to-br from-white to-indigo-50">
              <p className="text-sm text-muted-foreground"><T>AI Usage Rate</T></p>
              <p className="text-2xl font-bold mt-1 text-indigo-700">
                {aiPerf ? `${Math.round(aiPerf.aiUsageRate)}%` : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1"><T>% using LLM analysis</T></p>
            </div>
            <div className="p-4 rounded-lg border bg-gradient-to-br from-white to-amber-50">
              <p className="text-sm text-muted-foreground"><T>Fallback Rate</T></p>
              <p className="text-2xl font-bold mt-1 text-amber-700">
                {aiPerf ? `${Math.round(aiPerf.fallbackRate)}%` : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1"><T>% using rule-based fallback</T></p>
            </div>
            <div className="p-4 rounded-lg border bg-gradient-to-br from-white to-green-50">
              <p className="text-sm text-muted-foreground"><T>AI-Fallback Consistency</T></p>
              <p className="text-2xl font-bold mt-1 text-green-700">
                {aiPerf ? `${Math.round(aiPerf.consistencyScore)}%` : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1"><T>Score agreement within ±15pts</T></p>
            </div>
            <div className="p-4 rounded-lg border bg-gradient-to-br from-white to-blue-50">
              <p className="text-sm text-muted-foreground"><T>Total Screenings</T></p>
              <p className="text-2xl font-bold mt-1 text-blue-700">
                {aiPerf ? aiPerf.totalScreenings : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1"><T>Screenings analyzed</T></p>
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
              <T>Policy Impact — District Comparison</T>
            </CardTitle>
            <CardDescription><T>Compare screening coverage, high-risk rate, and intervention completion across districts.</T></CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={filteredDistrictComp} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="district" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="highRiskRate" name={t("High Risk %")} fill="#ef4444" radius={[2, 2, 0, 0]} />
                <Bar dataKey="recoveryRate" name={t("Recovery %")} fill="#22c55e" radius={[2, 2, 0, 0]} />
                <Bar dataKey="interventionCompletionRate" name={t("Intervention %")} fill="#6366f1" radius={[2, 2, 0, 0]} />
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
              <T>Resource Allocation vs Outcomes</T>
            </CardTitle>
            <CardDescription>
              <T>Each dot is a district. X-axis = active field workers (resource proxy). Y-axis = recovery rate (outcome).</T>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="workers" name={t("Field Workers")} tick={{ fontSize: 11 }} label={{ value: t("Active Field Workers"), position: "insideBottom", offset: -10, fontSize: 11 }} />
                <YAxis dataKey="recoveryRate" name={t("Recovery Rate")} tick={{ fontSize: 11 }} unit="%" label={{ value: t("Recovery Rate %"), angle: -90, position: "insideLeft", fontSize: 11 }} />
                <ZAxis dataKey="totalPatients" range={[60, 400]} name={t("Total Patients")} />
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  formatter={(value: any, name: string) => [name === t("Total Patients") ? value : `${value}%`, name]}
                  labelFormatter={() => ""}
                  cursor={{ strokeDasharray: "3 3" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white border rounded-lg p-2 shadow text-xs">
                        <p className="font-bold">{d.district}</p>
                        <p>{t("Field Workers")}: {d.workers}</p>
                        <p>{t("Recovery Rate")}: {d.recoveryRate}%</p>
                        <p>{t("Patients")}: {d.totalPatients}</p>
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
          <CardTitle><T>State-Wide Risk Distribution</T></CardTitle>
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
                      <span className="font-medium">{item.name} <T>Risk</T></span>
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
            <p className="text-muted-foreground text-sm"><T>No screening data available.</T></p>
          )}
        </CardContent>
      </Card>

      {/* Phase 7: State-level Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {nutritionStats && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Apple className="w-4 h-4 text-green-600" /> <T>Nutrition</T></CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground"><T>Underweight</T></span><span className="font-bold text-red-600">{nutritionStats.underweightPct}%</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground"><T>Stunted</T></span><span className="font-bold">{nutritionStats.stuntingPct}%</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground"><T>Anemic</T></span><span className="font-bold">{nutritionStats.anemiaPct}%</span></div>
            </CardContent>
          </Card>
        )}
        {referralStats && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4 text-blue-600" /> <T>Referrals</T></CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground"><T>Total</T></span><span className="font-bold">{referralStats.total}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground"><T>Pending</T></span><span className="font-bold text-amber-600">{referralStats.pending}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground"><T>Completed</T></span><span className="font-bold text-green-600">{referralStats.completed}</span></div>
            </CardContent>
          </Card>
        )}
        {outcomeStats && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-green-600" /> <T>Outcomes</T></CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground"><T>Improved</T></span><span className="font-bold text-green-600">{outcomeStats.improvedPct}%</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground"><T>Exited High Risk</T></span><span className="font-bold">{outcomeStats.exitedHighRisk}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground"><T>Avg Delay Reduction</T></span><span className="font-bold">{outcomeStats.avgDelayReduction} mo</span></div>
            </CardContent>
          </Card>
        )}
        {environmentStats && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-blue-600" /> <T>Environment</T></CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground"><T>Avg Interaction</T></span><span className="font-bold">{environmentStats.avgInteraction}/10</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground"><T>No Safe Water</T></span><span className="font-bold text-red-600">{environmentStats.noSafeWaterPct}%</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground"><T>High Risk</T></span><span className="font-bold text-red-600">{environmentStats.highRiskPct}%</span></div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

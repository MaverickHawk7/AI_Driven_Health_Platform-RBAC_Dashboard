import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, TrendingUp, AlertTriangle, BarChart3, ArrowRight, Filter, Building2 } from "lucide-react";
import { useScopedStats, useAlerts, useAlertCounts, useBlockTrends, useCenters } from "@/hooks/use-resources";
import { Link } from "wouter";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from "recharts";
import CDPODashboard from "./CDPODashboard";

export default function DWCWEODashboard({ embedded }: { embedded?: boolean } = {}) {
  const [view, setView] = useState<"district" | "block">("district");
  const [blockFilter, setBlockFilter] = useState<string>("");
  const [centerFilter, setCenterFilter] = useState<string>("");

  const { data: stats, isLoading: statsLoading } = useScopedStats(
    centerFilter ? { centerId: centerFilter } :
    blockFilter ? { block: blockFilter } :
    undefined
  );
  const { data: alertCounts } = useAlertCounts();
  const { data: escalatedAlerts } = useAlerts({ type: "supervisor_escalation", status: "active" });
  const { data: blockTrends } = useBlockTrends();
  const { data: centersList } = useCenters();

  // Derive unique district (current) and blocks from centers
  const currentDistrict = centersList?.[0]?.district ?? "—";
  const uniqueBlocks = useMemo(() => {
    if (!centersList) return [];
    return Array.from(new Set(centersList.map((c: any) => c.block))).sort();
  }, [centersList]);

  // Centers filtered by selected block
  const centersInBlock = useMemo(() => {
    if (!centersList || !blockFilter) return centersList || [];
    return centersList.filter((c: any) => c.block === blockFilter);
  }, [centersList, blockFilter]);

  // Reset center filter when block changes
  const handleBlockChange = (v: string) => {
    setBlockFilter(v === "all" ? "" : v);
    setCenterFilter("");
  };

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading district dashboard...</div>
      </div>
    );
  }

  // Filter block trends by selected block
  const filteredBlockTrends = blockFilter
    ? blockTrends?.filter((t) => t.block === blockFilter)
    : blockTrends;

  // Transform block trends for the line chart (group by month, one line per block)
  const months = filteredBlockTrends ? Array.from(new Set(filteredBlockTrends.map((t) => t.month))) : [];
  const blocks = filteredBlockTrends ? Array.from(new Set(filteredBlockTrends.map((t) => t.block))) : [];
  const trendLineData = months.map((month) => {
    const entry: Record<string, any> = { month };
    for (const block of blocks) {
      const bt = filteredBlockTrends?.find((t) => t.month === month && t.block === block);
      entry[block] = bt ? Math.round((bt.high / (bt.total || 1)) * 100) : 0;
    }
    return entry;
  });

  // Delay distribution: per-block risk band totals
  const delayDistribution = blocks.map((block) => {
    const blockEntries = filteredBlockTrends?.filter((t) => t.block === block) || [];
    return {
      block,
      high: blockEntries.reduce((s, t) => s + t.high, 0),
      medium: blockEntries.reduce((s, t) => s + t.medium, 0),
      low: blockEntries.reduce((s, t) => s + t.low, 0),
    };
  });

  const lineColors = ["#6366f1", "#f59e0b", "#22c55e", "#ef4444", "#06b6d4", "#8b5cf6"];

  if (!embedded && view === "block") {
    return (
      <div>
        <div className="p-6 pb-0 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <MapPin className="w-6 h-6" />
                Overview
              </h1>
              <p className="text-muted-foreground mt-1">DWCWEO — District-level oversight and trend analysis</p>
            </div>
            <div className="flex rounded-lg border overflow-hidden">
              <button
                onClick={() => setView("district")}
                className="px-4 py-2 text-sm font-medium flex items-center gap-1.5 bg-muted/30 text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5" />
                District
              </button>
              <button
                onClick={() => setView("block")}
                className="px-4 py-2 text-sm font-medium flex items-center gap-1.5 bg-primary text-primary-foreground"
              >
                <Building2 className="w-3.5 h-3.5" />
                Block
              </button>
            </div>
          </div>
        </div>
        <CDPODashboard embedded />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {!embedded && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MapPin className="w-6 h-6" />
              Overview
            </h1>
            <p className="text-muted-foreground mt-1">DWCWEO — District-level oversight and trend analysis</p>
          </div>
          <div className="flex rounded-lg border overflow-hidden">
            <button
              onClick={() => setView("district")}
              className="px-4 py-2 text-sm font-medium flex items-center gap-1.5 bg-primary text-primary-foreground"
            >
              <MapPin className="w-3.5 h-3.5" />
              District
            </button>
            <button
              onClick={() => setView("block")}
              className="px-4 py-2 text-sm font-medium flex items-center gap-1.5 bg-muted/30 text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              <Building2 className="w-3.5 h-3.5" />
            Block
          </button>
        </div>
      </div>
      )}

      {/* Location Filters */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="w-4 h-4" />
              Filters
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">District:</span>
              <Badge variant="outline" className="text-xs font-medium">{currentDistrict}</Badge>
            </div>

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
                {centersInBlock.map((c: any) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(blockFilter || centerFilter) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground"
                onClick={() => { setBlockFilter(""); setCenterFilter(""); }}
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
            <CardTitle className="text-sm font-medium text-blue-900">Total Children</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">{stats?.totalPatients ?? 0}</div>
            <p className="text-xs text-blue-600/80 mt-1">District-wide</p>
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

      {/* Rising Trend Early Warning */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-500" />
            Rising Trend Early Warning
          </CardTitle>
          <CardDescription>Monthly high-risk percentage per block. Watch for blocks with 2+ months of increase.</CardDescription>
        </CardHeader>
        <CardContent>
          {trendLineData.length > 1 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendLineData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} unit="%" />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {blocks.map((block, i) => (
                  <Line
                    key={block}
                    type="monotone"
                    dataKey={block}
                    name={block}
                    stroke={lineColors[i % lineColors.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-sm py-8 text-center">
              Insufficient longitudinal data for trend analysis. At least 2 months of data needed.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Delay Distribution by Block */}
      {delayDistribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-500" />
              Delay Distribution by Block
            </CardTitle>
            <CardDescription>Number of children per risk band (Low/Medium/High) per block.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={delayDistribution}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="block" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="high" name="High Risk" fill="#ef4444" stackId="risk" radius={[0, 0, 0, 0]} />
                <Bar dataKey="medium" name="Medium Risk" fill="#f59e0b" stackId="risk" radius={[0, 0, 0, 0]} />
                <Bar dataKey="low" name="Low Risk" fill="#22c55e" stackId="risk" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Risk Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            District Risk Distribution
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

      {/* Cross-Department Escalation Tracking */}
      <Card className="border-red-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Cross-Department Escalation Tracking
          </CardTitle>
          <CardDescription>Alerts escalated beyond supervisor level requiring district intervention.</CardDescription>
        </CardHeader>
        <CardContent>
          {escalatedAlerts && escalatedAlerts.length > 0 ? (
            <div className="space-y-3">
              {escalatedAlerts.map((alert: any) => {
                const daysOpen = Math.floor((Date.now() - new Date(alert.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={alert.id} className={`flex items-center justify-between p-3 rounded-lg border ${
                    daysOpen > 14 ? "border-red-200 bg-red-50" : daysOpen > 7 ? "border-amber-200 bg-amber-50" : "border-green-200 bg-green-50"
                  }`}>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{alert.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{alert.message}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Badge className={`text-xs font-mono ${
                        daysOpen > 14 ? "bg-red-100 text-red-700" : daysOpen > 7 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                      }`}>
                        {daysOpen}d open
                      </Badge>
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
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No escalated cases at this time.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

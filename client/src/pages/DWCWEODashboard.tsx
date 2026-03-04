import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, TrendingUp, AlertTriangle, BarChart3, ArrowRight } from "lucide-react";
import { useScopedStats, useAlerts, useAlertCounts, useBlockTrends } from "@/hooks/use-resources";
import { Link } from "wouter";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from "recharts";

export default function DWCWEODashboard() {
  const { data: stats, isLoading: statsLoading } = useScopedStats();
  const { data: alertCounts } = useAlertCounts();
  const { data: escalatedAlerts } = useAlerts({ type: "supervisor_escalation", status: "active" });
  const { data: blockTrends } = useBlockTrends();

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading district dashboard...</div>
      </div>
    );
  }

  // Transform block trends for the line chart (group by month, one line per block)
  const months = blockTrends ? Array.from(new Set(blockTrends.map((t) => t.month))) : [];
  const blocks = blockTrends ? Array.from(new Set(blockTrends.map((t) => t.block))) : [];
  const trendLineData = months.map((month) => {
    const entry: Record<string, any> = { month };
    for (const block of blocks) {
      const bt = blockTrends?.find((t) => t.month === month && t.block === block);
      entry[block] = bt ? Math.round((bt.high / (bt.total || 1)) * 100) : 0;
    }
    return entry;
  });

  // Delay distribution: per-block risk band totals
  const delayDistribution = blocks.map((block) => {
    const blockEntries = blockTrends?.filter((t) => t.block === block) || [];
    return {
      block,
      high: blockEntries.reduce((s, t) => s + t.high, 0),
      medium: blockEntries.reduce((s, t) => s + t.medium, 0),
      low: blockEntries.reduce((s, t) => s + t.low, 0),
    };
  });

  const lineColors = ["#6366f1", "#f59e0b", "#22c55e", "#ef4444", "#06b6d4", "#8b5cf6"];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MapPin className="w-6 h-6" />
          District Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">DWCWEO — District-level oversight and trend analysis</p>
      </div>

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

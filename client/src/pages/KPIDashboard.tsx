import { useStats, useWorkerPerformance } from "@/hooks/use-resources";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, ClipboardList, CheckCircle2, BarChart3 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#94a3b8']; // Low, Medium, High, Other

export default function KPIDashboard() {
  const { data: stats, isLoading } = useStats();
  const { data: workerPerf } = useWorkerPerformance();

  // Fetch district report for intervention effectiveness + risk trends
  const { data: districtReport } = useQuery({
    queryKey: ["/api/reports/district"],
    queryFn: async () => {
      const res = await fetch("/api/reports/district");
      if (!res.ok) return null;
      return res.json();
    },
  });

  if (isLoading) return <div className="p-8">Loading analytics...</div>;
  if (!stats) return null;

  const intEff = districtReport?.interventionEffectiveness;
  const riskTrends = districtReport?.riskTrends || [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Program Analytics</h1>
        <p className="text-muted-foreground">Key Performance Indicators and program health metrics.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Population</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalPatients}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">High Risk %</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-rose-600">{stats.highRiskPercentage}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recovery Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">{stats.exitHighRiskPercentage}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Risk Reduction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.avgReductionDelayMonths} <span className="text-sm font-normal text-muted-foreground">months</span></div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1: Pie + Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="h-[400px]">
          <CardHeader>
            <CardTitle>Risk Distribution</CardTitle>
            <CardDescription>Current patient breakdown by risk level</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.patientsByRiskLevel}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.patientsByRiskLevel.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="h-[400px]">
          <CardHeader>
            <CardTitle>Monthly Screenings</CardTitle>
            <CardDescription>Screening activity over time</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.monthlyScreenings}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Intervention Effectiveness */}
      {intEff && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Intervention Effectiveness
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-5 pb-4 text-center">
                <ClipboardList className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                <p className="text-2xl font-bold">{intEff.totalPlans}</p>
                <p className="text-xs text-muted-foreground">Total Plans</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4 text-center">
                <BarChart3 className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                <p className="text-2xl font-bold">{intEff.activePlans}</p>
                <p className="text-xs text-muted-foreground">Active Plans</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4 text-center">
                <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-green-500" />
                <p className="text-2xl font-bold">{intEff.completedPlans}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4 text-center">
                <TrendingUp className="w-5 h-5 mx-auto mb-1 text-purple-500" />
                <p className={`text-2xl font-bold ${intEff.avgImprovementIndex > 0 ? "text-green-600" : "text-gray-600"}`}>
                  {intEff.avgImprovementIndex > 0 ? "+" : ""}{intEff.avgImprovementIndex}%
                </p>
                <p className="text-xs text-muted-foreground">Avg Improvement</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Monthly Risk Trends */}
      {riskTrends.length > 0 && (
        <Card className="h-[350px]">
          <CardHeader>
            <CardTitle>Monthly Risk Trends</CardTitle>
            <CardDescription>High, medium, and low risk counts over time</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={riskTrends}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend />
                <Line type="monotone" dataKey="high" name="High" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="medium" name="Medium" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="low" name="Low" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Worker Performance Table */}
      {workerPerf && (workerPerf as any[]).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Worker Performance</CardTitle>
            <CardDescription>Field worker screening activity and outcomes</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Worker Name</TableHead>
                  <TableHead className="text-center">Screenings</TableHead>
                  <TableHead className="text-center">Patients</TableHead>
                  <TableHead className="text-center">Avg Risk Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(workerPerf as any[]).map((w: any) => (
                  <TableRow key={w.userId}>
                    <TableCell className="font-medium">{w.userName}</TableCell>
                    <TableCell className="text-center font-mono">{w.screeningsCount}</TableCell>
                    <TableCell className="text-center font-mono">{w.patientsCount}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={`${w.avgRiskScore >= 75 ? "bg-red-100 text-red-700" : w.avgRiskScore >= 41 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                        {w.avgRiskScore}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

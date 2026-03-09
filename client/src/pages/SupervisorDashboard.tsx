import { useState } from "react";
import { useScopedStats, useAlerts, useAlertCounts, useUpdateAlert, useDataQuality, useClusterDomains, useCenters } from "@/hooks/use-resources";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RiskBadge } from "@/components/RiskBadge";
import { AlertCircle, AlertTriangle, ArrowRight, Activity, Users, Bell, Clock, Calendar, ShieldAlert, BarChart3, CheckSquare, Filter } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function SupervisorDashboard() {
  // Cohort segmentation filters
  const [ageGroupFilter, setAgeGroupFilter] = useState<string>("");
  const [riskFilter, setRiskFilter] = useState<string>("");
  const [centerFilter, setCenterFilter] = useState<string>("");

  const { data: stats } = useScopedStats(
    centerFilter ? { centerId: centerFilter } : undefined
  );
  const { data: activeAlerts } = useAlerts({ status: "active" });
  const { data: alertCounts } = useAlertCounts();
  const { mutate: updateAlert } = useUpdateAlert();
  const [, setLocation] = useLocation();

  const { data: dataQuality } = useDataQuality();
  const { data: clusterDomains } = useClusterDomains();
  const { data: centersList } = useCenters();

  // Single fetch for all patients and screenings
  const { data: allPatients, isLoading } = useQuery({
    queryKey: [api.patients.list.path],
    queryFn: async () => {
      const res = await fetch(api.patients.list.path);
      return res.json() as Promise<any[]>;
    },
  });
  const { data: allScreenings } = useQuery({
    queryKey: [api.screenings.list.path],
    queryFn: async () => {
      const res = await fetch(api.screenings.list.path);
      return res.json() as Promise<any[]>;
    },
  });

  // Fetch intervention plans to detect inaction
  const { data: allPlans } = useQuery({
    queryKey: ["/api/interventions"],
    queryFn: async () => {
      const res = await fetch("/api/interventions");
      return res.json() as Promise<any[]>;
    },
  });

  if (isLoading) return <div className="p-8">Loading dashboard...</div>;

  // Apply cohort segmentation filters
  const filteredPatients = (allPatients || []).filter((patient: any) => {
    // Age group filter
    if (ageGroupFilter) {
      const age = patient.ageMonths ?? 0;
      if (ageGroupFilter === "0-12" && age > 12) return false;
      if (ageGroupFilter === "13-24" && (age < 13 || age > 24)) return false;
      if (ageGroupFilter === "25-36" && (age < 25 || age > 36)) return false;
      if (ageGroupFilter === "37+" && age < 37) return false;
    }
    // Center filter
    if (centerFilter && patient.centerId !== Number(centerFilter)) return false;
    return true;
  });

  // Risk filter applied to patients with screening data (used in priority lists)
  const applyRiskFilter = (riskLevel: string) => {
    if (!riskFilter) return true;
    return riskLevel === riskFilter;
  };

  const filtersActive = !!(ageGroupFilter || riskFilter || centerFilter);

  // Build case prioritization data
  const casePriority = (filteredPatients).map((patient: any) => {
    const pScreenings = (allScreenings || [])
      .filter((s: any) => s.patientId === patient.id)
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latest = pScreenings[0];
    if (!latest) return null;
    const daysSince = latest.date ? Math.floor((Date.now() - new Date(latest.date).getTime()) / (1000 * 60 * 60 * 24)) : 999;
    return {
      ...patient,
      riskScore: latest.riskScore ?? 0,
      riskLevel: latest.riskLevel ?? "Low",
      daysSinceScreening: daysSince,
      screeningType: latest.screeningType ?? "baseline",
    };
  })
    .filter(Boolean)
    .filter((c: any) => applyRiskFilter(c.riskLevel))
    .sort((a: any, b: any) => b.riskScore - a.riskScore || a.daysSinceScreening - b.daysSinceScreening);

  // Build follow-up calendar: patients with non-Low risk and no reassessment
  const followUps = (filteredPatients).map((patient: any) => {
    const pScreenings = (allScreenings || [])
      .filter((s: any) => s.patientId === patient.id)
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const baseline = pScreenings.find((s: any) => s.screeningType === "baseline");
    if (!baseline || baseline.riskLevel === "Low") return null;
    const hasReassessment = pScreenings.some((s: any) => s.screeningType && s.screeningType !== "baseline");
    if (hasReassessment) return null;
    const baselineDate = new Date(baseline.date);
    const due3m = new Date(baselineDate.getTime() + 90 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const daysOverdue3m = Math.floor((now.getTime() - due3m.getTime()) / (1000 * 60 * 60 * 24));
    return {
      ...patient,
      baselineDate: baselineDate.toISOString().slice(0, 10),
      riskLevel: baseline.riskLevel,
      due3m: due3m.toISOString().slice(0, 10),
      daysOverdue: daysOverdue3m,
      dueType: daysOverdue3m > 90 ? "6-month" : "3-month",
    };
  }).filter(Boolean) as any[];

  // High-Risk Inaction Tracker: High-risk patients with no active plan or no recent screening
  const highRiskInaction = (filteredPatients).map((patient: any) => {
    const pScreenings = (allScreenings || [])
      .filter((s: any) => s.patientId === patient.id)
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latest = pScreenings[0];
    if (!latest || latest.riskLevel !== "High") return null;
    const daysSince = latest.date ? Math.floor((Date.now() - new Date(latest.date).getTime()) / (1000 * 60 * 60 * 24)) : 999;
    const hasActivePlan = (allPlans || []).some((p: any) => p.patientId === patient.id && (p.status === "active" || p.status === "recommended"));
    if (hasActivePlan && daysSince < 30) return null; // Has plan and recent screening — not inaction
    return {
      ...patient,
      riskScore: latest.riskScore ?? 0,
      daysSinceAction: daysSince,
      hasActivePlan,
      reason: !hasActivePlan ? "No intervention plan" : `No screening in ${daysSince} days`,
    };
  }).filter(Boolean) as any[];

  // Referral Aging: alerts sorted by age
  const referralAlerts = (activeAlerts as any[] || [])
    .map((alert: any) => ({
      ...alert,
      ageInDays: alert.createdAt ? Math.floor((Date.now() - new Date(alert.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0,
    }))
    .sort((a: any, b: any) => b.ageInDays - a.ageInDays);

  const topAlerts = (activeAlerts as any[] || []).slice(0, 5);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Supervisor Dashboard</h1>
          <p className="text-muted-foreground">Overview of high-risk cases and recent activities.</p>
        </div>
        <Link href="/patients">
          <Button variant="outline">View All Patients</Button>
        </Link>
      </div>

      {/* Cohort Segmentation Filters */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="w-4 h-4" />
              Cohort Filters
            </div>

            <Select value={ageGroupFilter || "all"} onValueChange={v => setAgeGroupFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[140px] h-8 text-xs bg-background">
                <SelectValue placeholder="Age Group" />
              </SelectTrigger>
              <SelectContent className="bg-background">
                <SelectItem value="all">All Ages</SelectItem>
                <SelectItem value="0-12">0–12 months</SelectItem>
                <SelectItem value="13-24">13–24 months</SelectItem>
                <SelectItem value="25-36">25–36 months</SelectItem>
                <SelectItem value="37+">37+ months</SelectItem>
              </SelectContent>
            </Select>

            <Select value={riskFilter || "all"} onValueChange={v => setRiskFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[140px] h-8 text-xs bg-background">
                <SelectValue placeholder="Risk Level" />
              </SelectTrigger>
              <SelectContent className="bg-background">
                <SelectItem value="all">All Risk</SelectItem>
                <SelectItem value="High">High Risk</SelectItem>
                <SelectItem value="Medium">Medium Risk</SelectItem>
                <SelectItem value="Low">Low Risk</SelectItem>
              </SelectContent>
            </Select>

            <Select value={centerFilter || "all"} onValueChange={v => setCenterFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[180px] h-8 text-xs bg-background">
                <SelectValue placeholder="Center" />
              </SelectTrigger>
              <SelectContent className="bg-background">
                <SelectItem value="all">All Centers</SelectItem>
                {(centersList as any[] || []).map((c: any) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {filtersActive && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground"
                onClick={() => { setAgeGroupFilter(""); setRiskFilter(""); setCenterFilter(""); }}
              >
                Clear Filters
              </Button>
            )}

            {filtersActive && (
              <Badge variant="outline" className="text-xs ml-auto">
                Showing {filteredPatients.length} of {(allPatients || []).length} patients
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-white to-blue-50 border-blue-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-900">Total Patients</CardTitle>
            <Users className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">{stats?.totalPatients || 0}</div>
            <p className="text-xs text-blue-600/80 mt-1">Active registrations</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white to-rose-50 border-rose-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-rose-900">High Risk Rate</CardTitle>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-rose-700">{stats?.highRiskPercentage || 0}%</div>
            <p className="text-xs text-rose-600/80 mt-1">Of total population</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white to-emerald-50 border-emerald-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-emerald-900">Recovery Rate</CardTitle>
            <Activity className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-700">{stats?.exitHighRiskPercentage || 0}%</div>
            <p className="text-xs text-emerald-600/80 mt-1">Exited high-risk status</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white to-amber-50 border-amber-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-amber-900">Active Alerts</CardTitle>
            <Bell className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-700">{alertCounts?.total ?? 0}</div>
            <p className="text-xs text-amber-600/80 mt-1">
              {alertCounts?.critical ?? 0} critical, {alertCounts?.high ?? 0} high
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts Panel */}
      {topAlerts.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-amber-950 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Active Alerts
              </CardTitle>
              <Link href="/alerts">
                <Button variant="outline" size="sm" className="text-xs">View All Alerts</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {topAlerts.map((alert: any) => (
              <div key={alert.id} className="flex items-center gap-3 p-2.5 rounded-lg border bg-muted/20">
                <Badge className={`text-xs ${
                  alert.severity === "critical" ? "bg-red-100 text-red-700" :
                  alert.severity === "high" ? "bg-orange-100 text-orange-700" :
                  alert.severity === "medium" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                }`} variant="outline">
                  {alert.severity}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{alert.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{alert.message}</p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateAlert({ id: alert.id, status: "acknowledged" })}>
                    Ack
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateAlert({ id: alert.id, status: "resolved" })}>
                    Resolve
                  </Button>
                  {alert.patientId && (
                    <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setLocation(`/patients/${alert.patientId}`)}>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* High-Risk Inaction Tracker */}
      {highRiskInaction.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-950 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-500" />
              High-Risk Inaction Tracker
            </CardTitle>
            <CardDescription>
              High-risk patients with no intervention plan or no recent screening activity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead className="text-center">Risk Score</TableHead>
                  <TableHead className="text-center">Days Since Action</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {highRiskInaction.map((p: any) => (
                  <TableRow key={p.id} className={`${p.daysSinceAction > 14 ? "bg-red-50/50" : ""}`}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-red-100 text-red-700">{p.riskScore}</Badge>
                    </TableCell>
                    <TableCell className="text-center font-mono text-sm">
                      <span className={p.daysSinceAction > 14 ? "text-red-600 font-bold" : ""}>
                        {p.daysSinceAction}d
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.reason}</TableCell>
                    <TableCell className="text-center">
                      <Link href={`/patients/${p.id}`}>
                        <Button size="sm" variant="ghost" className="hover:text-primary">
                          View <ArrowRight className="ml-1 w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Referral Aging Dashboard */}
      {referralAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              Referral Aging
            </CardTitle>
            <CardDescription>Active alerts sorted by age. Older referrals need urgent attention.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {referralAlerts.slice(0, 10).map((alert: any) => (
                <div key={alert.id} className={`flex items-center gap-3 p-2.5 rounded-lg border ${
                  alert.ageInDays > 14 ? "bg-red-50 border-red-200" :
                  alert.ageInDays > 7 ? "bg-amber-50 border-amber-200" :
                  "bg-green-50 border-green-200"
                }`}>
                  <Badge className={`text-xs font-mono ${
                    alert.ageInDays > 14 ? "bg-red-100 text-red-700" :
                    alert.ageInDays > 7 ? "bg-amber-100 text-amber-700" :
                    "bg-green-100 text-green-700"
                  }`}>
                    {alert.ageInDays}d
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{alert.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{alert.message}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">{alert.type || "alert"}</Badge>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateAlert({ id: alert.id, status: "resolved" })}>
                      Resolve
                    </Button>
                    {alert.patientId && (
                      <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setLocation(`/patients/${alert.patientId}`)}>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Case Prioritization */}
      <Card className="shadow-lg border-rose-100">
        <CardHeader>
          <CardTitle className="text-rose-950 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-500" />
            Case Prioritization
          </CardTitle>
          <CardDescription>Patients ranked by risk score and time since last screening.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient Name</TableHead>
                <TableHead className="text-center">Risk Score</TableHead>
                <TableHead className="text-center">Days Since Screening</TableHead>
                <TableHead className="text-center">Type</TableHead>
                <TableHead className="text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {casePriority.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No at-risk patients found. Good job!
                  </TableCell>
                </TableRow>
              )}
              {(casePriority as any[]).map((c) => (
                <TableRow key={c.id} className="hover:bg-rose-50/30 transition-colors">
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-center">
                    <Badge className={`${c.riskLevel === "High" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                      {c.riskScore}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm">
                    {c.daysSinceScreening}d
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-xs text-muted-foreground capitalize">{c.screeningType?.replace("_", " ")}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Link href={`/patients/${c.id}`}>
                      <Button size="sm" variant="ghost" className="hover:text-primary">
                        View <ArrowRight className="ml-1 w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* AWW Data Quality Scorecard */}
      {dataQuality && dataQuality.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-blue-500" />
              AWW Data Quality Scorecard
            </CardTitle>
            <CardDescription>Per-worker quality metrics for screening completeness and follow-up adherence.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Field Worker</TableHead>
                  <TableHead className="text-center">Completeness</TableHead>
                  <TableHead className="text-center">Consent</TableHead>
                  <TableHead className="text-center">Follow-up</TableHead>
                  <TableHead className="text-center">Photo Rate</TableHead>
                  <TableHead className="text-center">Quality Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dataQuality.map((dq) => (
                  <TableRow key={dq.userId}>
                    <TableCell className="font-medium">{dq.name}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={`text-xs ${dq.completeness >= 80 ? "text-green-700 border-green-200" : dq.completeness >= 50 ? "text-amber-700 border-amber-200" : "text-red-700 border-red-200"}`}>
                        {dq.completeness}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={`text-xs ${dq.consentCoverage >= 80 ? "text-green-700 border-green-200" : "text-amber-700 border-amber-200"}`}>
                        {dq.consentCoverage}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={`text-xs ${dq.followUpAdherence >= 80 ? "text-green-700 border-green-200" : "text-amber-700 border-amber-200"}`}>
                        {dq.followUpAdherence}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-sm font-mono">{dq.photoCaptureRate}%</TableCell>
                    <TableCell className="text-center">
                      <Badge className={`${dq.qualityScore >= 80 ? "bg-green-100 text-green-700" : dq.qualityScore >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                        {dq.qualityScore}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Domain-Level Cluster Performance */}
      {clusterDomains && clusterDomains.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-500" />
              Domain-Level Cluster Performance
            </CardTitle>
            <CardDescription>Average domain risk scores per center. Lower is better.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={clusterDomains} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="centerName" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="avgMotor" name="Motor" fill="#f97316" radius={[2, 2, 0, 0]} />
                <Bar dataKey="avgSocial" name="Social" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                <Bar dataKey="avgLanguage" name="Language" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
                <Bar dataKey="avgNutrition" name="Nutrition" fill="#22c55e" radius={[2, 2, 0, 0]} />
                <Bar dataKey="avgCognitive" name="Cognitive" fill="#06b6d4" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Follow-up Calendar */}
      {followUps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              Follow-up Reassessments Due
            </CardTitle>
            <CardDescription>Patients who need reassessment based on baseline screening date.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient Name</TableHead>
                  <TableHead className="text-center">Baseline Date</TableHead>
                  <TableHead className="text-center">Risk Level</TableHead>
                  <TableHead className="text-center">Due Type</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {followUps.map((f: any) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.name}</TableCell>
                    <TableCell className="text-center text-sm font-mono">{f.baselineDate}</TableCell>
                    <TableCell className="text-center">
                      <RiskBadge level={f.riskLevel} />
                    </TableCell>
                    <TableCell className="text-center text-sm">{f.dueType}</TableCell>
                    <TableCell className="text-center">
                      {f.daysOverdue > 0 ? (
                        <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          {f.daysOverdue}d overdue
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-xs">
                          Due in {Math.abs(f.daysOverdue)}d
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Link href={`/patients/${f.id}`}>
                        <Button size="sm" variant="ghost" className="hover:text-primary">
                          View <ArrowRight className="ml-1 w-3.5 h-3.5" />
                        </Button>
                      </Link>
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

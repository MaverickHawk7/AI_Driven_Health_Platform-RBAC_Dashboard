import { useRoute, useLocation } from "wouter";
import { usePatient, usePatientProgress, usePatientPrediction } from "@/hooks/use-resources";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, BarChart3, Activity, Target, Radar } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, ReferenceLine } from "recharts";
import DomainRadarChart from "@/components/DomainRadarChart";

export default function PatientProgress() {
  const [, params] = useRoute("/patients/:id/progress");
  const [, setLocation] = useLocation();
  const patientId = params ? Number.parseInt(params.id, 10) || 0 : 0;

  const { data: patient } = usePatient(patientId);
  const { data: progress, isLoading } = usePatientProgress(patientId);
  const { data: prediction } = usePatientPrediction(patientId);

  if (isLoading) return <div className="p-8">Loading progress data...</div>;

  if (!progress || progress.screenings.length === 0) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => setLocation(`/patients/${patientId}`)} className="gap-2 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Patient
        </Button>
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
          No screening data available for longitudinal tracking.
        </div>
      </div>
    );
  }

  const improvementIndex = progress.improvementIndex;
  const domainDeltas = progress.domainDeltas;
  const riskTrajectory = progress.riskTrajectory;
  const baseline = progress.baselineScreening;
  const latest = progress.screenings[progress.screenings.length - 1];

  const riskColors: Record<string, string> = {
    High: "#ef4444",
    Medium: "#f59e0b",
    Low: "#22c55e",
  };

  const domainLabels: Record<string, string> = {
    motor: "Motor Skills",
    social: "Social Response",
    language: "Language",
    nutrition: "Nutrition",
    cognitive: "Cognitive",
  };

  const domainDeltaData = domainDeltas
    ? Object.entries(domainDeltas).map(([domain, delta]) => ({
        domain: domainLabels[domain] || domain,
        delta: delta as number,
        fill: (delta as number) > 0 ? "#22c55e" : (delta as number) < 0 ? "#ef4444" : "#94a3b8",
      }))
    : [];

  const trajectoryWithPrediction = [...riskTrajectory];
  if (prediction && riskTrajectory.length >= 2) {
    trajectoryWithPrediction.push(
      { date: "+3mo", riskScore: prediction.predictedScore3m, riskLevel: prediction.predictedScore3m >= 75 ? "High" : prediction.predictedScore3m >= 40 ? "Medium" : "Low" },
      { date: "+6mo", riskScore: prediction.predictedScore6m, riskLevel: prediction.predictedScore6m >= 75 ? "High" : prediction.predictedScore6m >= 40 ? "Medium" : "Low" },
    );
  }

  const baselineDomainScores = baseline?.domainScores as Record<string, number> | null;
  const latestDomainScores = latest?.domainScores as Record<string, number> | null;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => setLocation(`/patients/${patientId}`)} className="gap-2 mb-2">
        <ArrowLeft className="w-4 h-4" />
        Back to Patient
      </Button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Longitudinal Progress {patient ? `— ${patient.name}` : ""}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {progress.screenings.length} screening(s) tracked over time
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground uppercase font-medium">Improvement Index</p>
            <div className="flex items-center gap-2 mt-1.5">
              {improvementIndex !== null ? (
                <>
                  {improvementIndex > 0 ? (
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  ) : improvementIndex < 0 ? (
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  ) : (
                    <Minus className="w-5 h-5 text-gray-500" />
                  )}
                  <span className={`text-2xl font-bold ${improvementIndex > 0 ? "text-green-600" : improvementIndex < 0 ? "text-red-600" : "text-gray-600"}`}>
                    {improvementIndex > 0 ? "+" : ""}{improvementIndex}%
                  </span>
                </>
              ) : (
                <span className="text-lg text-muted-foreground">N/A</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground uppercase font-medium">Baseline Risk</p>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge className={`${baseline?.riskLevel === "High" ? "bg-red-100 text-red-700" : baseline?.riskLevel === "Medium" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                {baseline?.riskLevel || "N/A"}
              </Badge>
              <span className="text-lg font-bold">{baseline?.riskScore ?? "—"}/100</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground uppercase font-medium">Current Risk</p>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge className={`${latest?.riskLevel === "High" ? "bg-red-100 text-red-700" : latest?.riskLevel === "Medium" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                {latest?.riskLevel || "N/A"}
              </Badge>
              <span className="text-lg font-bold">{latest?.riskScore ?? "—"}/100</span>
            </div>
          </CardContent>
        </Card>

        {prediction && (
          <Card className="border-indigo-200 bg-indigo-50/30">
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-muted-foreground uppercase font-medium">Predicted Trajectory</p>
              <div className="flex items-center gap-2 mt-1.5">
                {prediction.trajectory === "improving" ? (
                  <TrendingDown className="w-5 h-5 text-green-600" />
                ) : prediction.trajectory === "worsening" ? (
                  <TrendingUp className="w-5 h-5 text-red-600" />
                ) : (
                  <Minus className="w-5 h-5 text-gray-500" />
                )}
                <span className={`text-lg font-bold capitalize ${
                  prediction.trajectory === "improving" ? "text-green-600" :
                  prediction.trajectory === "worsening" ? "text-red-600" : "text-gray-600"
                }`}>
                  {prediction.trajectory}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {prediction.confidence}% confidence
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {prediction && prediction.earlyWarnings.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs font-semibold uppercase text-amber-700 mb-2">Early Warnings</p>
            <div className="flex flex-wrap gap-2">
              {prediction.earlyWarnings.map((w, i) => (
                <Badge key={i} variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                  {w}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Risk Score Trajectory
            {prediction && <Badge variant="outline" className="text-xs ml-2 font-normal">Includes predicted values</Badge>}
          </CardTitle>
          <CardDescription className="text-xs">Risk score over time across all screenings</CardDescription>
        </CardHeader>
        <CardContent>
          {trajectoryWithPrediction.length > 1 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trajectoryWithPrediction}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  formatter={(value: number) => [`${value}/100`, "Risk Score"]}
                  labelFormatter={(label) => `${label}`}
                />
                <ReferenceLine y={75} stroke="#ef4444" strokeDasharray="3 3" label={{ value: "High", fontSize: 10, fill: "#ef4444" }} />
                <ReferenceLine y={40} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: "Medium", fontSize: 10, fill: "#f59e0b" }} />
                <Line
                  type="monotone"
                  dataKey="riskScore"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={(props: any) => {
                    const { cx, cy, payload, index } = props;
                    const isPredicted = payload.date?.startsWith("+");
                    return (
                      <circle
                        key={`dot-${index}`}
                        cx={cx}
                        cy={cy}
                        r={5}
                        fill={isPredicted ? "white" : (riskColors[payload.riskLevel] || "#6366f1")}
                        stroke={isPredicted ? "#6366f1" : "white"}
                        strokeWidth={2}
                        strokeDasharray={isPredicted ? "3 3" : "none"}
                      />
                    );
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              At least 2 screenings are needed to show a trajectory chart.
            </p>
          )}
        </CardContent>
      </Card>

      {(baselineDomainScores || latestDomainScores) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4" />
              Domain Comparison — Baseline vs Latest
            </CardTitle>
            <CardDescription className="text-xs">
              Radar overlay of domain risk scores. Lower values indicate less risk.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DomainRadarChart baseline={baselineDomainScores} latest={latestDomainScores} />
          </CardContent>
        </Card>
      )}

      {domainDeltaData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Domain Improvement
            </CardTitle>
            <CardDescription className="text-xs">
              Change in domain risk scores from baseline. Positive = improvement (lower risk).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={domainDeltaData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="domain" tick={{ fontSize: 11 }} width={100} />
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  formatter={(value: number) => [`${value > 0 ? "+" : ""}${value} pts`, "Change"]}
                />
                <Bar dataKey="delta" radius={[0, 4, 4, 0]}>
                  {domainDeltaData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Screening History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium text-muted-foreground">Date</th>
                  <th className="pb-2 font-medium text-muted-foreground">Type</th>
                  <th className="pb-2 font-medium text-muted-foreground">Risk Score</th>
                  <th className="pb-2 font-medium text-muted-foreground">Level</th>
                </tr>
              </thead>
              <tbody>
                {progress.screenings.map((s: any) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="py-2">{s.date ? new Date(s.date).toLocaleDateString() : "—"}</td>
                    <td className="py-2">
                      <Badge variant="outline" className="text-xs capitalize">
                        {(s.screeningType || "baseline").replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="py-2 font-mono">{s.riskScore ?? "—"}/100</td>
                    <td className="py-2">
                      <Badge className={`${s.riskLevel === "High" ? "bg-red-100 text-red-700" : s.riskLevel === "Medium" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                        {s.riskLevel || "N/A"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

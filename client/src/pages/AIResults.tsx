import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Info, ArrowLeft, BrainCircuit, Calculator, ClipboardList, Camera, FileText, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Target } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { usePatientPrediction } from "@/hooks/use-resources";
import { CaregiverToggle, ReadAloudButton, useCaregiverMode } from "@/components/CaregiverMode";

interface PhotoAnalysis {
  status: "detected" | "not_detected" | "inconclusive";
  confidence: number;
  indicators: string[];
  explanation: string;
  source: "yolo" | "ai" | "fallback";
}

interface AIResultsProps {
  assessmentId?: string;
  onComplete?: () => void;
  riskScore?: number;
  riskLevel?: string;
  explanation?: string;
  answers?: Record<string, string>;
  source?: "yolo" | "ai" | "fallback";
  photoAnalysis?: PhotoAnalysis | null;
  patientId?: number;
  domainScores?: Record<string, number> | null;
}

const DOMAIN_MAP: Record<string, string> = {
  q1: "Motor Skills",
  q2: "Social Response",
  q3: "Nutrition",
  q4: "Eye Contact / Social",
  q5: "Language",
};

const SCORE_DOMAINS: { key: string; label: string; icon: string }[] = [
  { key: "motor", label: "Motor Skills", icon: "🏃" },
  { key: "social", label: "Social Response", icon: "👥" },
  { key: "language", label: "Language", icon: "🗣" },
  { key: "nutrition", label: "Nutrition", icon: "🍎" },
  { key: "cognitive", label: "Cognitive", icon: "🧠" },
];

const DOMAIN_INTERVENTIONS: Record<string, { atRisk: string; monitor: string; whyFlagged: string; simpleExplanation: string }> = {
  "Motor Skills": {
    atRisk:  "Refer to a physiotherapist. Practice weight-bearing activities and structured motor exercises daily.",
    monitor: "Encourage regular physical activity and movement exercises. Reassess motor function at next visit.",
    whyFlagged: "Motor skill responses suggest delayed gross or fine motor development for age. The child may not be reaching physical milestones such as sitting, crawling, or grasping objects at expected timeframes.",
    simpleExplanation: "Your child may need extra help with movement and physical activities. Try playing with blocks or balls every day.",
  },
  "Social Response": {
    atRisk:  "Refer to a specialist for evaluation. Practice name-call exercises, turn-taking, and structured social engagement routines every day.",
    monitor: "Increase interactive and group activities. Monitor social responsiveness over the next month.",
    whyFlagged: "Social response assessment indicates limited engagement with caregivers or peers. The child may not respond to name-calling, show limited eye contact, or avoid turn-taking interactions.",
    simpleExplanation: "Your child may need more practice with social activities. Try calling their name often and playing simple turn-taking games.",
  },
  "Nutrition": {
    atRisk:  "Refer to a nutritionist. Assess dietary intake and establish consistent, structured meal routines.",
    monitor: "Review dietary variety and nutritional balance. Track weight and eating patterns.",
    whyFlagged: "Nutritional screening indicates potential dietary deficiencies or irregular eating patterns that could impact growth and development.",
    simpleExplanation: "Your child may not be getting enough healthy food. Try giving different fruits, vegetables, and proteins at regular meal times.",
  },
  "Eye Contact / Social": {
    atRisk:  "Screen for underlying conditions. Facilitate face-to-face interaction, mirror exercises, and joint attention activities.",
    monitor: "Encourage interactive engagement and shared-attention activities. Flag for specialist screening if no improvement in 6 weeks.",
    whyFlagged: "Eye contact and joint attention patterns are below expected levels, which can indicate challenges in social-cognitive development or warrant further screening.",
    simpleExplanation: "Your child may need help with looking at faces and paying attention together. Try sitting face-to-face and playing peek-a-boo.",
  },
  "Language": {
    atRisk:  "Refer to a speech-language therapist immediately. Encourage verbal interaction through daily routines and structured communication exercises.",
    monitor: "Increase verbal interaction during daily activities. Use clear communication, pause for response, and practice regularly.",
    whyFlagged: "Language development responses suggest delayed verbal or receptive language skills. The child may have limited vocabulary, not respond to verbal cues, or not babble/vocalize at expected levels.",
    simpleExplanation: "Your child may need help with talking and understanding words. Speak to them often, name things around the house, and read simple books together.",
  },
};

function answerToStatus(answer: string): { status: string; icon: typeof Info } {
  if (answer === "no")        return { status: "At Risk", icon: AlertCircle };
  if (answer === "sometimes") return { status: "Monitor",  icon: Info };
  return                             { status: "Normal",   icon: CheckCircle2 };
}

function getInterventionSteps(
  flaggedDomains: Array<{ name: string; status: string }>,
  riskLevel: string
): Array<{ domain: string; priority: "urgent" | "moderate" | "routine"; action: string }> {
  const steps: Array<{ domain: string; priority: "urgent" | "moderate" | "routine"; action: string }> = [];

  for (const domain of flaggedDomains) {
    if (domain.status === "Normal") continue;
    const interventions = DOMAIN_INTERVENTIONS[domain.name];
    if (!interventions) continue;

    steps.push({
      domain: domain.name,
      priority: domain.status === "At Risk" ? (riskLevel === "High" ? "urgent" : "moderate") : "routine",
      action: domain.status === "At Risk" ? interventions.atRisk : interventions.monitor,
    });
  }

  return steps;
}

function getDomainScoreColor(score: number): string {
  if (score >= 75) return "bg-red-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-green-500";
}

function getDomainScoreBgColor(score: number): string {
  if (score >= 75) return "bg-red-100";
  if (score >= 40) return "bg-amber-100";
  return "bg-green-100";
}

function getDomainScoreLabel(score: number): string {
  if (score >= 75) return "High Risk";
  if (score >= 40) return "Moderate";
  return "Low Risk";
}

export default function AIResults({ assessmentId: propId, onComplete, riskScore, riskLevel, explanation, answers, source, photoAnalysis, patientId, domainScores }: AIResultsProps) {
  const [, setLocation] = useLocation();
  const params = useParams();
  const id = propId || params.id;
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const { isActive: caregiverMode, toggle: toggleCaregiver } = useCaregiverMode();

  const { data: prediction } = usePatientPrediction(patientId);

  const hasRealData = riskScore !== undefined && riskLevel !== undefined;

  const displayRiskLevel = riskLevel ?? "Medium";
  const displayRiskScore = riskScore ?? 65;

  const flaggedDomains = answers
    ? Object.entries(answers).map(([qId, answer]) => ({
        name: DOMAIN_MAP[qId] ?? qId,
        ...answerToStatus(answer),
      }))
    : [
        { name: "Communication",   status: "Monitor",  icon: Info         },
        { name: "Gross Motor",     status: "Normal",   icon: CheckCircle2 },
        { name: "Fine Motor",      status: "At Risk",  icon: AlertCircle  },
        { name: "Problem Solving", status: "Normal",   icon: CheckCircle2 },
        { name: "Personal-Social", status: "Normal",   icon: CheckCircle2 },
      ];

  const recommendation = explanation?.trim()
    || (displayRiskLevel === "High"
      ? "Multiple health concerns detected. Immediate referral to a specialist is recommended."
      : displayRiskLevel === "Medium"
      ? "Some health concerns noted. Follow-up screening in 3 months is advised."
      : "Health indicators appear on track. Continue routine monitoring.");

  const interventionSteps = getInterventionSteps(flaggedDomains, displayRiskLevel);

  const generalAction =
    displayRiskLevel === "High"
      ? "Schedule specialist referral within 2 weeks and enroll in an intervention program immediately."
      : displayRiskLevel === "Medium"
      ? "Schedule a follow-up screening in 3 months and begin targeted care activities."
      : "Continue routine health monitoring per local healthcare guidelines.";

  const getRiskColor = (level: string) => {
    switch (level) {
      case "High":   return "bg-red-100 text-red-700 border-red-200";
      case "Medium": return "bg-amber-100 text-amber-700 border-amber-200";
      default:       return "bg-green-100 text-green-700 border-green-200";
    }
  };

  const priorityStyles = {
    urgent:   { badge: "bg-red-100 text-red-700",    label: "Urgent"   },
    moderate: { badge: "bg-amber-100 text-amber-700", label: "Moderate" },
    routine:  { badge: "bg-blue-100 text-blue-700",   label: "Routine"  },
  };

  const showInterventionPlanButton = hasRealData && (displayRiskLevel === "High" || displayRiskLevel === "Medium") && patientId;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <Button variant="ghost" onClick={() => setLocation("/field-worker/home")} className="gap-2 mb-4">
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Screening Results</h1>
          <p className="text-muted-foreground">Patient Assessment ID: #{id?.substring(0, 8)}</p>
        </div>
        <div className="flex items-center gap-2">
          <CaregiverToggle isActive={caregiverMode} onToggle={toggleCaregiver} />
          <div className="flex flex-col items-end gap-2">
            {hasRealData && source === "yolo" && (
              <Badge className="gap-1.5 bg-green-100 text-green-700 border-green-200 font-medium">
                <BrainCircuit className="w-3.5 h-3.5" />
                Local YOLO model analysis
              </Badge>
            )}
            {hasRealData && source === "ai" && (
              <Badge className="gap-1.5 bg-blue-100 text-blue-700 border-blue-200 font-medium">
                <BrainCircuit className="w-3.5 h-3.5" />
                AI-powered analysis
              </Badge>
            )}
            {hasRealData && source === "fallback" && (
              <Badge variant="outline" className="gap-1.5 text-amber-700 border-amber-300 bg-amber-50 font-medium">
                <Calculator className="w-3.5 h-3.5" />
                Rule-based analysis (AI unavailable)
              </Badge>
            )}
            {!hasRealData && (
              <Badge variant="outline" className="text-xs font-normal">Illustrative data</Badge>
            )}
            <span className="text-xs text-muted-foreground">non-diagnostic</span>
          </div>
        </div>
      </div>

      {/* Risk score + domains */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 border-2">
          <CardHeader className="text-center">
            <CardTitle className={`${caregiverMode ? "text-xl" : "text-lg"}`}>
              {caregiverMode ? "How is your child?" : "Risk Assessment"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-6 space-y-4">
            <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center text-2xl font-bold ${getRiskColor(displayRiskLevel)}`}>
              {caregiverMode ? (displayRiskLevel === "High" ? "Needs Help" : displayRiskLevel === "Medium" ? "Watch" : "Good") : displayRiskLevel}
            </div>
            {!caregiverMode && (
              <div className="text-center">
                <p className="text-sm font-medium">Risk Score</p>
                <p className="text-2xl font-bold text-primary">{displayRiskScore}</p>
                <p className="text-xs text-muted-foreground mt-1">out of 100</p>
              </div>
            )}
            {caregiverMode && (
              <div className="text-center">
                <ReadAloudButton text={
                  displayRiskLevel === "High" ? "Your child needs extra help. Please talk to the health worker about next steps."
                  : displayRiskLevel === "Medium" ? "Some areas need attention. Keep doing the activities and come back for follow-up."
                  : "Your child is doing well! Keep up the good work."
                } />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border-2">
          <CardHeader>
            <CardTitle className={`${caregiverMode ? "text-xl" : "text-lg"}`}>
              {caregiverMode ? "Areas Checked" : "Health Domains"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              {flaggedDomains.map((domain) => {
                const isExpanded = expandedDomain === domain.name;
                const interventionInfo = DOMAIN_INTERVENTIONS[domain.name];
                return (
                  <div key={domain.name}>
                    <div
                      className={`flex items-center justify-between p-3 rounded-lg bg-muted/30 border ${domain.status !== "Normal" ? "cursor-pointer hover:bg-muted/50" : ""}`}
                      onClick={() => domain.status !== "Normal" && interventionInfo && setExpandedDomain(isExpanded ? null : domain.name)}
                    >
                      <div className="flex items-center gap-3">
                        <domain.icon className={`w-5 h-5 ${domain.status === 'At Risk' ? 'text-red-500' : domain.status === 'Monitor' ? 'text-amber-500' : 'text-green-500'}`} />
                        <span className={`font-medium ${caregiverMode ? "text-base" : ""}`}>{domain.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={domain.status === 'Normal' ? 'secondary' : 'default'} className={
                          domain.status === 'At Risk' ? 'bg-red-100 text-red-700' :
                          domain.status === 'Monitor' ? 'bg-amber-100 text-amber-700' : ''
                        }>
                          {caregiverMode ? (domain.status === "At Risk" ? "Needs Help" : domain.status === "Monitor" ? "Watch" : "OK") : domain.status}
                        </Badge>
                        {domain.status !== "Normal" && interventionInfo && (
                          isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    {isExpanded && interventionInfo && (
                      <div className={`mt-1 mx-2 p-3 rounded-lg border ${caregiverMode ? "bg-blue-50 border-blue-200" : "bg-amber-50 border-amber-200"}`}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-semibold uppercase text-muted-foreground">
                            {caregiverMode ? "What you can do" : "Why flagged?"}
                          </p>
                          {caregiverMode && <ReadAloudButton text={interventionInfo.simpleExplanation} />}
                        </div>
                        <p className={`text-sm leading-relaxed ${caregiverMode ? "text-blue-800" : "text-amber-800"}`}>
                          {caregiverMode ? interventionInfo.simpleExplanation : interventionInfo.whyFlagged}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Domain Score Bars (when domainScores available) */}
      {domainScores && (
        <Card className="border-2">
          <CardHeader>
            <CardTitle className={`${caregiverMode ? "text-xl" : "text-lg"} flex items-center gap-2`}>
              <Target className="w-5 h-5" />
              {caregiverMode ? "Scores for Each Area" : "Domain Risk Scores"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {SCORE_DOMAINS.map(({ key, label, icon }) => {
              const score = (domainScores as Record<string, number>)[key] ?? 0;
              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{caregiverMode ? `${icon} ${label}` : label}</span>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${getDomainScoreBgColor(score)} ${score >= 75 ? "text-red-700" : score >= 40 ? "text-amber-700" : "text-green-700"}`}>
                        {caregiverMode ? (score >= 75 ? "Needs Help" : score >= 40 ? "Watch" : "Good") : getDomainScoreLabel(score)}
                      </Badge>
                      {!caregiverMode && <span className="font-mono text-xs w-8 text-right">{score}</span>}
                    </div>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${getDomainScoreColor(score)}`}
                      style={{ width: `${Math.min(100, score)}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {!caregiverMode && (
              <p className="text-xs text-muted-foreground mt-2">
                Higher scores indicate greater risk. Green &lt;40 | Amber 40-74 | Red &ge;75
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Predicted Trajectory Card */}
      {prediction && (
        <Card className="border-2 border-indigo-200 bg-indigo-50/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-600" />
              {caregiverMode ? "What We Expect Next" : "Predicted Trajectory"}
              <Badge variant="outline" className="text-xs ml-auto font-normal">
                {prediction.source === "ai" ? "AI Prediction" : "Statistical Estimate"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">{caregiverMode ? "In 3 months" : "3-Month Forecast"}</p>
                <p className="text-2xl font-bold text-indigo-700">{prediction.predictedScore3m}</p>
                {!caregiverMode && <p className="text-xs text-muted-foreground">/100</p>}
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">{caregiverMode ? "In 6 months" : "6-Month Forecast"}</p>
                <p className="text-2xl font-bold text-indigo-700">{prediction.predictedScore6m}</p>
                {!caregiverMode && <p className="text-xs text-muted-foreground">/100</p>}
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">{caregiverMode ? "Direction" : "Trajectory"}</p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  {prediction.trajectory === "improving" ? (
                    <TrendingDown className="w-5 h-5 text-green-600" />
                  ) : prediction.trajectory === "worsening" ? (
                    <TrendingUp className="w-5 h-5 text-red-600" />
                  ) : (
                    <Minus className="w-5 h-5 text-gray-500" />
                  )}
                  <span className={`font-semibold capitalize ${
                    prediction.trajectory === "improving" ? "text-green-600" :
                    prediction.trajectory === "worsening" ? "text-red-600" : "text-gray-600"
                  }`}>
                    {caregiverMode ? (prediction.trajectory === "improving" ? "Getting Better" : prediction.trajectory === "worsening" ? "Needs Attention" : "Staying Same") : prediction.trajectory}
                  </span>
                </div>
              </div>
            </div>

            {prediction.earlyWarnings.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  {caregiverMode ? "Things to watch" : "Early Warnings"}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {prediction.earlyWarnings.map((w, i) => (
                    <Badge key={i} variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      {w}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {!caregiverMode && (
              <p className="text-xs text-muted-foreground">
                Confidence: {prediction.confidence}% — Based on {prediction.source === "ai" ? "AI analysis" : "statistical trend"} of screening history.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recommendation Summary */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" />
              {caregiverMode ? "What to Do Next" : "Recommendation Summary"}
            </CardTitle>
            {caregiverMode && <ReadAloudButton text={recommendation} />}
          </div>
        </CardHeader>
        <CardContent>
          <p className={`leading-relaxed ${caregiverMode ? "text-xl" : "text-lg"}`}>{recommendation}</p>
        </CardContent>
      </Card>

      {/* Photo Health Screening */}
      {photoAnalysis && (
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-1.5">
              <Camera className="w-4 h-4" />
              Photo Health Screening
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-medium">Assessment:</span>
              <Badge className={
                photoAnalysis.status === "detected"
                  ? "bg-red-100 text-red-700"
                  : photoAnalysis.status === "inconclusive"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-green-100 text-green-700"
              }>
                {photoAnalysis.status === "detected" ? "Indicators Detected"
                 : photoAnalysis.status === "inconclusive" ? "Inconclusive"
                 : "No Indicators Detected"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Confidence: {photoAnalysis.confidence}%
              </span>
            </div>

            {photoAnalysis.indicators.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1.5">Observed Indicators:</p>
                <div className="flex flex-wrap gap-1.5">
                  {photoAnalysis.indicators.map((indicator) => (
                    <Badge key={indicator} variant="outline">{indicator}</Badge>
                  ))}
                </div>
              </div>
            )}

            <p className="text-sm text-muted-foreground">{photoAnalysis.explanation}</p>

            {photoAnalysis.source === "yolo" && (
              <Badge variant="outline" className="text-xs text-green-700 border-green-300 bg-green-50">
                Local YOLO model analysis
              </Badge>
            )}
            {photoAnalysis.source === "ai" && (
              <Badge variant="outline" className="text-xs text-blue-700 border-blue-300 bg-blue-50">
                Cloud AI analysis
              </Badge>
            )}
            {photoAnalysis.source === "fallback" && (
              <Badge variant="outline" className="text-xs text-amber-700 border-amber-300 bg-amber-50">
                AI unavailable — fallback result
              </Badge>
            )}

            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-xs text-amber-700">
                This photo analysis is a <strong>non-diagnostic screening aid</strong> only. A definitive
                diagnosis requires genetic testing (karyotyping). Physical features alone
                are not sufficient for diagnosis. Refer to a specialist for confirmation.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Intervention Strategy */}
      {!caregiverMode && (
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Intervention Strategy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {interventionSteps.length === 0 ? (
              <p className="text-muted-foreground">No specific domain interventions required. {generalAction}</p>
            ) : (
              <>
                {interventionSteps.map((step) => {
                  const style = priorityStyles[step.priority];
                  return (
                    <div key={step.domain} className="flex gap-4 p-4 rounded-lg border bg-muted/20">
                      <div className="flex-shrink-0 mt-0.5">
                        <Badge className={style.badge}>{style.label}</Badge>
                      </div>
                      <div>
                        <p className="font-semibold text-sm mb-1">{step.domain}</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">{step.action}</p>
                      </div>
                    </div>
                  );
                })}
                <div className="flex gap-4 p-4 rounded-lg border bg-muted/20">
                  <div className="flex-shrink-0 mt-0.5">
                    <Badge className={priorityStyles[displayRiskLevel === "High" ? "urgent" : displayRiskLevel === "Medium" ? "moderate" : "routine"].badge}>
                      General
                    </Badge>
                  </div>
                  <div>
                    <p className="font-semibold text-sm mb-1">Overall Follow-up</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{generalAction}</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap justify-end gap-4">
        {showInterventionPlanButton && (
          <Button variant="outline" onClick={() => setLocation(`/intervention-plans/${patientId}`)} className="gap-2">
            <FileText className="w-4 h-4" />
            View Intervention Plans
          </Button>
        )}
        {patientId && (
          <Button variant="outline" onClick={() => setLocation(`/patients/${patientId}/progress`)} className="gap-2">
            <TrendingUp className="w-4 h-4" />
            View Progress
          </Button>
        )}
        <Button variant="outline" onClick={() => window.print()}>Download PDF Report</Button>
        <Button onClick={() => onComplete ? onComplete() : setLocation("/field-worker/home")}>
          {onComplete ? "Finish Registration" : "Complete Assessment"}
        </Button>
      </div>
    </div>
  );
}

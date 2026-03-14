import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Info, ArrowLeft, ArrowRight, BrainCircuit, Calculator, ClipboardList, Camera, FileText, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Target, ShieldAlert, Brain } from "lucide-react";
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

interface AIDomainAssessment {
  domain: string;
  status: string;
  insight: string;
}

interface ConditionIndicator {
  condition: string;
  confidence: number;
  ruleBasedConfidence: number;
  aiConfidence: number;
  referral: string;
  caregiverMessage: string;
}

interface NutritionData {
  underweight?: boolean;
  stunting?: boolean;
  wasting?: boolean;
  anemia?: boolean;
  nutritionScore?: number;
  nutritionRisk?: string;
  weightKg?: number;
  heightCm?: number;
  muacCm?: number;
  hemoglobin?: number;
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
  domainAssessments?: AIDomainAssessment[] | null;
  conditionIndicators?: ConditionIndicator[] | null;
  nutritionData?: NutritionData | null;
  formulaRiskScore?: number | null;
  formulaRiskCategory?: string | null;
  behaviourScore?: number | null;
  behaviourRiskLevel?: string | null;
  autismRisk?: string | null;
  adhdRisk?: string | null;
  developmentalStatus?: string | null;
}

// Legacy domain mapping (old q1-q5 screenings)
const LEGACY_DOMAIN_MAP: Record<string, string> = {
  q1: "Motor Skills",
  q2: "Social Response",
  q3: "Nutrition",
  q4: "Eye Contact / Social",
  q5: "Language",
};

// M-CHAT-R/F domain mapping (new t1/t2 screenings)
const MCHAT_DOMAIN_MAP: Record<string, string> = {
  t1_q1: "Communication", t1_q2: "Communication", t1_q3: "Communication",
  t1_q4: "Joint Attention", t1_q5: "Social Interaction", t1_q6: "Social Interaction",
  t1_q7: "Joint Attention", t1_q8: "Joint Attention", t1_q9: "Communication",
  t1_q10: "Play Behavior", t1_q11: "Social Interaction", t1_q12: "Joint Attention",
  t1_q13: "Repetitive Behavior", t1_q14: "Repetitive Behavior", t1_q15: "Sensory Sensitivity",
  t2_q1: "Repetitive Behavior", t2_q2: "Communication", t2_q3: "Social Interaction",
  t2_q4: "Social Interaction", t2_q5: "Social Interaction", t2_q6: "Repetitive Behavior",
  t2_q7: "Repetitive Behavior", t2_q8: "Sensory Sensitivity", t2_q9: "Sensory Sensitivity",
  t2_q10: "Emotional Regulation", t2_q11: "Emotional Regulation", t2_q12: "Repetitive Behavior",
};

// Reversed questions (where "yes" is concerning)
const REVERSED_QUESTIONS = new Set([
  "t1_q13", "t1_q14", "t1_q15",
  "t2_q1", "t2_q2", "t2_q3", "t2_q4", "t2_q5", "t2_q6",
  "t2_q7", "t2_q8", "t2_q9", "t2_q10", "t2_q11", "t2_q12",
]);

const DOMAIN_MAP: Record<string, string> = { ...LEGACY_DOMAIN_MAP, ...MCHAT_DOMAIN_MAP };

const LEGACY_SCORE_DOMAINS: { key: string; label: string; icon: string }[] = [
  { key: "motor", label: "Motor Skills", icon: "🏃" },
  { key: "social", label: "Social Response", icon: "👥" },
  { key: "language", label: "Language", icon: "🗣" },
  { key: "nutrition", label: "Nutrition", icon: "🍎" },
  { key: "cognitive", label: "Cognitive", icon: "🧠" },
];

const MCHAT_SCORE_DOMAINS: { key: string; label: string; icon: string }[] = [
  { key: "communication",       label: "Communication",        icon: "🗣" },
  { key: "socialInteraction",   label: "Social Interaction",   icon: "👥" },
  { key: "jointAttention",      label: "Joint Attention",      icon: "👀" },
  { key: "playBehavior",        label: "Play Behavior",        icon: "🧸" },
  { key: "repetitiveBehavior",  label: "Repetitive Behavior",  icon: "🔄" },
  { key: "sensorySensitivity",  label: "Sensory Sensitivity",  icon: "👂" },
  { key: "emotionalRegulation", label: "Emotional Regulation", icon: "💛" },
];

// Auto-detect which domain set to use based on domainScores keys
function getScoreDomains(domainScores: Record<string, number> | null | undefined) {
  if (!domainScores) return LEGACY_SCORE_DOMAINS;
  if ("communication" in domainScores || "jointAttention" in domainScores) return MCHAT_SCORE_DOMAINS;
  return LEGACY_SCORE_DOMAINS;
}

const DOMAIN_INTERVENTIONS: Record<string, { atRisk: string; monitor: string; whyFlagged: string; simpleExplanation: string }> = {
  // Legacy domains
  "Motor Skills": {
    atRisk:  "Refer to a physiotherapist. Practice weight-bearing activities and structured motor exercises daily.",
    monitor: "Encourage regular physical activity and movement exercises. Reassess motor function at next visit.",
    whyFlagged: "Motor skill responses suggest delayed gross or fine motor development for age.",
    simpleExplanation: "Your child may need extra help with movement and physical activities. Try playing with blocks or balls every day.",
  },
  "Social Response": {
    atRisk:  "Refer to a specialist for evaluation. Practice name-call exercises, turn-taking, and structured social engagement routines every day.",
    monitor: "Increase interactive and group activities. Monitor social responsiveness over the next month.",
    whyFlagged: "Social response assessment indicates limited engagement with caregivers or peers.",
    simpleExplanation: "Your child may need more practice with social activities. Try calling their name often and playing simple turn-taking games.",
  },
  "Nutrition": {
    atRisk:  "Refer to a nutritionist. Assess dietary intake and establish consistent, structured meal routines.",
    monitor: "Review dietary variety and nutritional balance. Track weight and eating patterns.",
    whyFlagged: "Nutritional screening indicates potential dietary deficiencies or irregular eating patterns.",
    simpleExplanation: "Your child may not be getting enough healthy food. Try giving different fruits, vegetables, and proteins at regular meal times.",
  },
  "Eye Contact / Social": {
    atRisk:  "Screen for underlying conditions. Facilitate face-to-face interaction, mirror exercises, and joint attention activities.",
    monitor: "Encourage interactive engagement and shared-attention activities. Flag for specialist screening if no improvement in 6 weeks.",
    whyFlagged: "Eye contact and joint attention patterns are below expected levels.",
    simpleExplanation: "Your child may need help with looking at faces and paying attention together. Try sitting face-to-face and playing peek-a-boo.",
  },
  "Language": {
    atRisk:  "Refer to a speech-language therapist immediately. Encourage verbal interaction through daily routines.",
    monitor: "Increase verbal interaction during daily activities. Use clear communication and pause for response.",
    whyFlagged: "Language development responses suggest delayed verbal or receptive language skills.",
    simpleExplanation: "Your child may need help with talking and understanding words. Speak to them often and read simple books together.",
  },
  // M-CHAT-R/F domains
  "Communication": {
    atRisk:  "Refer to a speech-language specialist. Practice daily verbal interaction, gesture encouragement, and structured communication exercises.",
    monitor: "Increase verbal interaction during daily activities. Encourage gestures, pointing, and simple word use.",
    whyFlagged: "Communication responses indicate limited verbal or gestural communication for age. The person may not use words, follow instructions, or use gestures to communicate.",
    simpleExplanation: "Your child may need help with talking and communicating. Try talking to them often, naming objects, and encouraging them to point at things.",
  },
  "Social Interaction": {
    atRisk:  "Refer to a developmental specialist for evaluation. Practice structured social engagement with caregivers and peers daily.",
    monitor: "Increase interactive play and social activities. Monitor social engagement over the next month.",
    whyFlagged: "Social interaction patterns show limited engagement with others. The person may avoid eye contact, not smile back, or prefer being alone.",
    simpleExplanation: "Your child may need more practice with social activities. Try playing together, smiling at them, and encouraging play with other children.",
  },
  "Joint Attention": {
    atRisk:  "Screen for underlying developmental conditions. Practice pointing games, shared attention activities, and 'look at this' exercises daily.",
    monitor: "Encourage shared-attention activities like reading together and pointing at objects. Reassess in 4 weeks.",
    whyFlagged: "Joint attention skills are below expected levels. The person may not respond to name, point to show interest, or follow another person's gaze.",
    simpleExplanation: "Your child may need help with paying attention together. Try calling their name, pointing at things, and saying 'look at this!' during play.",
  },
  "Play Behavior": {
    atRisk:  "Refer for developmental assessment. Introduce structured pretend play activities and model imaginative play daily.",
    monitor: "Encourage pretend play and creative activities. Provide toys that support imaginative play.",
    whyFlagged: "Play behavior indicates limited pretend or imaginative play for age. The person may not engage in make-believe activities.",
    simpleExplanation: "Your child may need help learning to play pretend. Try playing simple games like feeding a doll or pretending to cook together.",
  },
  "Repetitive Behavior": {
    atRisk:  "Refer for specialist evaluation. These behaviors may indicate developmental concerns that need professional assessment.",
    monitor: "Monitor frequency and intensity of repetitive behaviors. Document patterns and triggers for follow-up.",
    whyFlagged: "Screening identified repetitive behaviors such as hand flapping, spinning objects, lining up toys, or strong resistance to routine changes.",
    simpleExplanation: "Your child may repeat certain movements or actions a lot. Talk to the health worker about what you notice so they can help.",
  },
  "Sensory Sensitivity": {
    atRisk:  "Refer to an occupational therapist for sensory evaluation. Create a sensory-friendly environment and avoid known triggers.",
    monitor: "Track sensory reactions and triggers. Gradually introduce varied textures and sounds in a safe setting.",
    whyFlagged: "Screening indicates heightened sensitivity to sounds, textures, or other sensory input that may affect daily functioning.",
    simpleExplanation: "Your child may be very sensitive to sounds or textures. Try to keep things calm and slowly introduce new textures and sounds.",
  },
  "Emotional Regulation": {
    atRisk:  "Refer for behavioral assessment. Implement structured calming routines and predictable daily schedules.",
    monitor: "Practice calming techniques and establish consistent routines. Monitor frequency of intense emotional responses.",
    whyFlagged: "Screening shows difficulty with emotional regulation, including frequent intense tantrums or difficulty calming down.",
    simpleExplanation: "Your child may have big emotions that are hard to control. Try using a calm voice, keeping routines the same, and helping them take deep breaths.",
  },
};

function answerToStatus(answer: string, qId?: string): { status: string; icon: typeof Info } {
  const reversed = qId ? REVERSED_QUESTIONS.has(qId) : false;
  if (reversed) {
    // "yes" is concerning for reversed questions
    if (answer === "yes") return { status: "At Risk", icon: AlertCircle };
    return { status: "Normal", icon: CheckCircle2 };
  }
  // Standard: "no" is concerning
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

export default function AIResults({ assessmentId: propId, onComplete, riskScore, riskLevel, explanation, answers, source, photoAnalysis, patientId, domainScores, domainAssessments, conditionIndicators, nutritionData, formulaRiskScore, formulaRiskCategory, behaviourScore, behaviourRiskLevel, autismRisk, adhdRisk, developmentalStatus }: AIResultsProps) {
  const [, setLocation] = useLocation();
  const params = useParams();
  const id = propId || params.id;
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const { isActive: caregiverMode, toggle: toggleCaregiver } = useCaregiverMode();

  const { data: prediction } = usePatientPrediction(patientId);

  const hasRealData = riskScore !== undefined && riskLevel !== undefined;

  const displayRiskLevel = riskLevel ?? "Medium";
  const displayRiskScore = riskScore ?? 65;

  const flaggedDomains = domainAssessments && domainAssessments.length > 0
    ? // Use AI-provided combined domain assessments
      domainAssessments.map((d) => ({
        name: d.domain,
        status: d.status === "At Risk" || d.status === "Monitor" || d.status === "Normal" ? d.status : "Monitor",
        icon: d.status === "At Risk" ? AlertCircle : d.status === "Monitor" ? Info : CheckCircle2,
        insight: d.insight,
      }))
    : answers
    ? (() => {
        // Fallback: group answers by domain, compute combined status from ratio
        const domainAnswers = new Map<string, { total: number; concerning: number }>();
        for (const [qId, answer] of Object.entries(answers)) {
          const name = DOMAIN_MAP[qId] ?? qId;
          const { status } = answerToStatus(answer, qId);
          const entry = domainAnswers.get(name) || { total: 0, concerning: 0 };
          entry.total++;
          if (status === "At Risk") entry.concerning++;
          domainAnswers.set(name, entry);
        }
        return Array.from(domainAnswers.entries()).map(([name, { total, concerning }]) => {
          const ratio = concerning / total;
          const status = ratio > 0.5 ? "At Risk" : ratio > 0 ? "Monitor" : "Normal";
          const icon = status === "At Risk" ? AlertCircle : status === "Monitor" ? Info : CheckCircle2;
          return { name, status, icon, insight: "" };
        });
      })()
    : [
        { name: "Communication",   status: "Monitor",  icon: Info,         insight: "" },
        { name: "Social Interaction", status: "Normal", icon: CheckCircle2, insight: "" },
        { name: "Joint Attention", status: "At Risk",   icon: AlertCircle,  insight: "" },
        { name: "Play Behavior",   status: "Normal",   icon: CheckCircle2, insight: "" },
        { name: "Repetitive Behavior", status: "Normal", icon: CheckCircle2, insight: "" },
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
          <div className="flex items-center gap-2">
            {hasRealData && (source === "ai" || source === "yolo") && (
              <span className="w-2.5 h-2.5 rounded-full bg-green-400" title="AI available" />
            )}
            {hasRealData && source === "fallback" && (
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" title="AI unavailable — rule-based analysis" />
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
                        <domain.icon className={`w-5 h-5 shrink-0 ${domain.status === 'At Risk' ? 'text-red-500' : domain.status === 'Monitor' ? 'text-amber-500' : 'text-green-500'}`} />
                        <div>
                          <span className={`font-medium ${caregiverMode ? "text-base" : ""}`}>{domain.name}</span>
                          {(domain as any).insight && (
                            <p className="text-xs text-muted-foreground mt-0.5">{(domain as any).insight}</p>
                          )}
                        </div>
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

      {/* Formula Score + Behaviour + Status (Phase 4) */}
      {formulaRiskScore != null && (
        <Card className="border-2 border-indigo-200 bg-indigo-50/30 dark:bg-indigo-950/20 dark:border-indigo-800">
          <CardHeader>
            <CardTitle className={`${caregiverMode ? "text-xl" : "text-lg"} flex items-center gap-2`}>
              <Calculator className="w-5 h-5 text-indigo-600" />
              {caregiverMode ? "Detailed Check" : "Deterministic Formula Score"}
              <Badge variant="outline" className="text-xs ml-auto font-normal">
                Rule-Based
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-center p-3 rounded-lg bg-white dark:bg-background border">
                <p className="text-xs text-muted-foreground">Formula Score</p>
                <p className={`text-2xl font-bold ${formulaRiskCategory === "High" ? "text-red-600" : formulaRiskCategory === "Medium" ? "text-amber-600" : "text-green-600"}`}>
                  {formulaRiskScore}
                </p>
                <Badge className={`text-xs mt-1 ${formulaRiskCategory === "High" ? "bg-red-100 text-red-700" : formulaRiskCategory === "Medium" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                  {formulaRiskCategory}
                </Badge>
              </div>
              {behaviourScore != null && (
                <div className="text-center p-3 rounded-lg bg-white dark:bg-background border">
                  <p className="text-xs text-muted-foreground">Behaviour</p>
                  <p className={`text-2xl font-bold ${behaviourRiskLevel === "High" ? "text-red-600" : behaviourRiskLevel === "Medium" ? "text-amber-600" : "text-green-600"}`}>
                    {behaviourScore}
                  </p>
                  <Badge className={`text-xs mt-1 ${behaviourRiskLevel === "High" ? "bg-red-100 text-red-700" : behaviourRiskLevel === "Medium" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                    {behaviourRiskLevel}
                  </Badge>
                </div>
              )}
              {autismRisk && autismRisk !== "Low" && (
                <div className="text-center p-3 rounded-lg bg-white dark:bg-background border">
                  <p className="text-xs text-muted-foreground">Autism Risk</p>
                  <p className={`text-lg font-bold ${autismRisk === "High" ? "text-red-600" : "text-amber-600"}`}>
                    {autismRisk}
                  </p>
                </div>
              )}
              {adhdRisk && adhdRisk !== "Low" && (
                <div className="text-center p-3 rounded-lg bg-white dark:bg-background border">
                  <p className="text-xs text-muted-foreground">ADHD Risk</p>
                  <p className={`text-lg font-bold ${adhdRisk === "High" ? "text-red-600" : "text-amber-600"}`}>
                    {adhdRisk}
                  </p>
                </div>
              )}
            </div>

            {developmentalStatus && (
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className={developmentalStatus.includes("No delays") ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200"}>
                  {developmentalStatus}
                </Badge>
              </div>
            )}

            {!caregiverMode && (
              <p className="text-xs text-muted-foreground">
                Formula: domain delays(+5ea) + autism(+8/15) + ADHD(+4/8) + behaviour(+3/7) + nutrition(+3) + environment(+3). Thresholds: ≤10 Low | 11-25 Medium | &gt;25 High
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Auto-Referral Recommendations (Phase 5) */}
      {formulaRiskScore != null && (
        (() => {
          const recs: { type: string; reason: string; color: string }[] = [];
          if (formulaRiskCategory === "High") recs.push({ type: "RBSK", reason: "High composite risk score", color: "bg-red-100 text-red-700" });
          if (autismRisk === "High" || autismRisk === "Medium") recs.push({ type: "DEIC", reason: `Autism risk: ${autismRisk}`, color: "bg-indigo-100 text-indigo-700" });
          if (adhdRisk === "High" || adhdRisk === "Medium") recs.push({ type: "PHC", reason: `ADHD indicators: ${adhdRisk}`, color: "bg-purple-100 text-purple-700" });
          if (behaviourRiskLevel === "High") recs.push({ type: "PHC", reason: "High behaviour concern score", color: "bg-orange-100 text-orange-700" });
          if (recs.length === 0) return null;
          return (
            <Card className="border-2 border-amber-200 bg-amber-50/30 dark:bg-amber-950/20 dark:border-amber-800">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-600" />
                  {caregiverMode ? "Next Steps" : "Auto-Referral Recommendations"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {caregiverMode ? (
                  <p className="text-sm text-muted-foreground">Based on the assessment, your child may benefit from specialist visits. The health team will help arrange these.</p>
                ) : (
                  recs.map((r, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <Badge className={r.color}>{r.type}</Badge>
                      <span>{r.reason}</span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground ml-auto" />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })()
      )}

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
            {getScoreDomains(domainScores).map(({ key, label, icon }) => {
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

      {/* Nutrition Risk Card */}
      {nutritionData && (
        <Card className="border-2 border-green-200 bg-green-50/30">
          <CardHeader>
            <CardTitle className={`${caregiverMode ? "text-xl" : "text-lg"} flex items-center gap-2`}>
              <span className="text-lg">🍎</span>
              {caregiverMode ? "Nutrition Check" : "Nutrition Assessment"}
              <Badge className={`ml-auto text-xs ${
                nutritionData.nutritionRisk === "High" ? "bg-red-100 text-red-700" :
                nutritionData.nutritionRisk === "Medium" ? "bg-amber-100 text-amber-700" :
                "bg-green-100 text-green-700"
              }`}>
                {nutritionData.nutritionRisk || "Low"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {nutritionData.weightKg != null && (
                <div className="text-center p-2 rounded-lg bg-white border">
                  <p className="text-xs text-muted-foreground">Weight</p>
                  <p className="font-bold text-lg">{nutritionData.weightKg} <span className="text-xs font-normal">kg</span></p>
                </div>
              )}
              {nutritionData.heightCm != null && (
                <div className="text-center p-2 rounded-lg bg-white border">
                  <p className="text-xs text-muted-foreground">Height</p>
                  <p className="font-bold text-lg">{nutritionData.heightCm} <span className="text-xs font-normal">cm</span></p>
                </div>
              )}
              {nutritionData.muacCm != null && (
                <div className="text-center p-2 rounded-lg bg-white border">
                  <p className="text-xs text-muted-foreground">MUAC</p>
                  <p className="font-bold text-lg">{nutritionData.muacCm} <span className="text-xs font-normal">cm</span></p>
                </div>
              )}
              {nutritionData.hemoglobin != null && (
                <div className="text-center p-2 rounded-lg bg-white border">
                  <p className="text-xs text-muted-foreground">Hemoglobin</p>
                  <p className="font-bold text-lg">{nutritionData.hemoglobin} <span className="text-xs font-normal">g/dL</span></p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {nutritionData.underweight && (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Underweight</Badge>
              )}
              {nutritionData.stunting && (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Stunting</Badge>
              )}
              {nutritionData.wasting && (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Wasting</Badge>
              )}
              {nutritionData.anemia && (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Anemia</Badge>
              )}
              {!nutritionData.underweight && !nutritionData.stunting && !nutritionData.wasting && !nutritionData.anemia && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">No nutrition flags</Badge>
              )}
            </div>

            {!caregiverMode && nutritionData.nutritionScore != null && (
              <p className="text-xs text-muted-foreground">
                Nutrition Score: {nutritionData.nutritionScore}/7 (underweight=2, stunting=2, wasting=2, anemia=1)
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pattern Analysis — Combined Rule-Based + AI */}
      {conditionIndicators && conditionIndicators.length > 0 && (
        <Card className="border-2 border-purple-200 bg-purple-50/30 dark:bg-purple-950/20 dark:border-purple-800">
          <CardHeader>
            <CardTitle className={`${caregiverMode ? "text-xl" : "text-lg"} flex items-center gap-2`}>
              <ShieldAlert className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              {caregiverMode ? "What the Screening Found" : "Developmental Pattern Analysis"}
              <Badge variant="outline" className="text-xs ml-auto font-normal">
                Rule-Based + AI
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {conditionIndicators.map((indicator) => {
              const confidenceColor = indicator.confidence >= 60
                ? "bg-red-500" : indicator.confidence >= 40
                ? "bg-amber-500" : "bg-yellow-400";
              const confidenceBg = indicator.confidence >= 60
                ? "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800"
                : indicator.confidence >= 40
                ? "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800"
                : "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800";

              return (
                <div key={indicator.condition} className={`p-4 rounded-lg border ${confidenceBg}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">{indicator.condition}</span>
                    <span className="text-sm font-mono font-bold">
                      {indicator.confidence}%
                    </span>
                  </div>

                  {/* Confidence bar */}
                  <div className="w-full h-2.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full transition-all ${confidenceColor}`}
                      style={{ width: `${Math.min(100, indicator.confidence)}%` }}
                    />
                  </div>

                  {/* Source breakdown */}
                  {!caregiverMode && (
                    <div className="flex gap-4 text-xs text-muted-foreground mb-3">
                      <span>Rule-based: {indicator.ruleBasedConfidence}%</span>
                      <span>AI: {indicator.aiConfidence}%</span>
                    </div>
                  )}

                  {/* Referral / Caregiver message */}
                  {caregiverMode ? (
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm leading-relaxed">{indicator.caregiverMessage}</p>
                      <ReadAloudButton text={indicator.caregiverMessage} />
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Suggested Referral</p>
                      <p className="text-sm leading-relaxed">{indicator.referral}</p>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Guardrail disclaimer */}
            <div className="p-3 rounded-lg bg-purple-100/60 border border-purple-200 dark:bg-purple-900/30 dark:border-purple-700">
              <p className="text-xs text-purple-800 dark:text-purple-300">
                <strong>Important:</strong> This is a <strong>screening indicator</strong>, not a diagnosis.
                Confidence scores reflect pattern matching from questionnaire responses only.
                A qualified specialist must evaluate the child before any clinical determination is made.
              </p>
            </div>
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

            <div className="flex items-center gap-1.5">
              {(photoAnalysis.source === "ai" || photoAnalysis.source === "yolo") && (
                <span className="w-2 h-2 rounded-full bg-green-400" title="AI available" />
              )}
              {photoAnalysis.source === "fallback" && (
                <span className="w-2 h-2 rounded-full bg-amber-400" title="AI unavailable" />
              )}
            </div>

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

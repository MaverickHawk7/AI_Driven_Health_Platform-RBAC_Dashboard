import AIResults from "./AIResults";
import PhotoCapture, { type PhotoAnalysisResult } from "@/components/PhotoCapture";
import ConsentCapture from "./ConsentCapture";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertScreeningSchema } from "@shared/schema";
import { useCreateScreening, useConsentCheck, useGenerateInterventionPlan } from "@/hooks/use-resources";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertTriangle, AlertCircle, Camera, ClipboardList, FileCheck, ShieldAlert, ArrowRight } from "lucide-react";
import { T, useLanguage } from "@/hooks/use-language";

// --- Two-Tier M-CHAT-R/F Inspired Questions ---

interface ScreeningQuestion {
  id: string;
  text: string;
  domain: string;
  reversed: boolean; // true = "yes" is concerning, false = "no" is concerning
}

const TIER1_QUESTIONS: ScreeningQuestion[] = [
  { id: "t1_q1",  text: "Did the person start walking by 18 months?",                              domain: "Communication",      reversed: false },
  { id: "t1_q2",  text: "Is the person able to speak at least a few meaningful words?",             domain: "Communication",      reversed: false },
  { id: "t1_q3",  text: "Can the person follow simple instructions (for example \"give the ball\")?", domain: "Communication",      reversed: false },
  { id: "t1_q4",  text: "Does the person respond when their name is called?",                      domain: "Joint Attention",    reversed: false },
  { id: "t1_q5",  text: "Does the person look at people's faces during interaction?",               domain: "Social Interaction", reversed: false },
  { id: "t1_q6",  text: "Does the person smile back when someone smiles at them?",                  domain: "Social Interaction", reversed: false },
  { id: "t1_q7",  text: "Does the person point to ask for something?",                              domain: "Joint Attention",    reversed: false },
  { id: "t1_q8",  text: "Does the person point to show something interesting?",                     domain: "Joint Attention",    reversed: false },
  { id: "t1_q9",  text: "Does the person use gestures such as waving or nodding?",                  domain: "Communication",      reversed: false },
  { id: "t1_q10", text: "Does the person play pretend games (for example feeding a doll or toy cooking)?", domain: "Play Behavior", reversed: false },
  { id: "t1_q11", text: "Does the person play with other children?",                                domain: "Social Interaction", reversed: false },
  { id: "t1_q12", text: "Does the person bring toys or objects to show adults?",                     domain: "Joint Attention",    reversed: false },
  { id: "t1_q13", text: "Does the person repeat movements such as hand flapping or spinning?",      domain: "Repetitive Behavior", reversed: true },
  { id: "t1_q14", text: "Does the person become very upset if routines change?",                     domain: "Repetitive Behavior", reversed: true },
  { id: "t1_q15", text: "Is the person very sensitive to loud sounds or certain textures?",          domain: "Sensory Sensitivity", reversed: true },
];

const TIER2_QUESTIONS: ScreeningQuestion[] = [
  { id: "t2_q1",  text: "Does the person repeat the same words or phrases frequently?",             domain: "Repetitive Behavior",  reversed: true },
  { id: "t2_q2",  text: "Does the person pull an adult's hand instead of speaking or gesturing?",   domain: "Communication",        reversed: true },
  { id: "t2_q3",  text: "Does the person prefer playing alone most of the time?",                   domain: "Social Interaction",   reversed: true },
  { id: "t2_q4",  text: "Does the person avoid eye contact frequently?",                            domain: "Social Interaction",   reversed: true },
  { id: "t2_q5",  text: "Does the person show little interest in other children?",                  domain: "Social Interaction",   reversed: true },
  { id: "t2_q6",  text: "Does the person line up toys or objects repeatedly?",                       domain: "Repetitive Behavior",  reversed: true },
  { id: "t2_q7",  text: "Does the person spin objects repeatedly?",                                  domain: "Repetitive Behavior",  reversed: true },
  { id: "t2_q8",  text: "Does the person cover their ears in response to normal sounds?",            domain: "Sensory Sensitivity",  reversed: true },
  { id: "t2_q9",  text: "Does the person avoid certain food or clothing textures?",                  domain: "Sensory Sensitivity",  reversed: true },
  { id: "t2_q10", text: "Does the person have frequent intense tantrums?",                           domain: "Emotional Regulation", reversed: true },
  { id: "t2_q11", text: "Does the person struggle to calm down once upset?",                         domain: "Emotional Regulation", reversed: true },
  { id: "t2_q12", text: "Does the person focus intensely on a single object for long periods?",      domain: "Repetitive Behavior",  reversed: true },
];

const ALL_DOMAINS = [
  "Communication",
  "Social Interaction",
  "Joint Attention",
  "Play Behavior",
  "Repetitive Behavior",
  "Sensory Sensitivity",
  "Emotional Regulation",
];

const DOMAIN_COLORS: Record<string, string> = {
  "Communication":       "bg-blue-100 text-blue-700",
  "Social Interaction":  "bg-purple-100 text-purple-700",
  "Joint Attention":     "bg-indigo-100 text-indigo-700",
  "Play Behavior":       "bg-cyan-100 text-cyan-700",
  "Repetitive Behavior": "bg-amber-100 text-amber-700",
  "Sensory Sensitivity": "bg-rose-100 text-rose-700",
  "Emotional Regulation":"bg-orange-100 text-orange-700",
};

function isConcerning(answer: string, reversed: boolean): boolean {
  if (reversed) return answer === "yes";
  return answer === "no";
}

// --- Step Indicator ---

const STEPS = [
  { label: "Patient & Consent", icon: FileCheck },
  { label: "Tier 1 Screening", icon: ClipboardList },
  { label: "Follow-up", icon: ShieldAlert },
  { label: "Photo", icon: Camera },
  { label: "Results", icon: CheckCircle2 },
];

function StepIndicator({ currentStep }: { currentStep: number }) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center justify-center gap-1 mb-6">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const isActive = i === currentStep;
        const isDone = i < currentStep;
        return (
          <div key={step.label} className="flex items-center">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              isActive ? "bg-primary text-primary-foreground" :
              isDone ? "bg-primary/15 text-primary" :
              "bg-muted text-muted-foreground"
            }`}>
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t(step.label)}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-6 h-0.5 mx-1 ${isDone ? "bg-primary/40" : "bg-muted"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// --- Tier 1 Results Card ---

function Tier1ResultCard({ score, total, onProceedToTier2, onSubmitLowRisk, isPending }: {
  score: number;
  total: number;
  onProceedToTier2: () => void;
  onSubmitLowRisk: () => void;
  isPending: boolean;
}) {
  const { t } = useLanguage();
  const needsTier2 = score >= 3;
  return (
    <Card className={`border-2 ${needsTier2 ? "border-amber-300 bg-amber-50/50" : "border-green-300 bg-green-50/50"}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {needsTier2 ? <AlertTriangle className="w-5 h-5 text-amber-600" /> : <CheckCircle2 className="w-5 h-5 text-green-600" />}
          <T>Tier 1 Screening Result</T>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold ${needsTier2 ? "bg-amber-200 text-amber-800" : "bg-green-200 text-green-800"}`}>
            {score}/{total}
          </div>
          <div>
            <p className="font-medium text-lg">
              {needsTier2 ? t("Follow-up assessment recommended") : t("Low risk indicated")}
            </p>
            <p className="text-sm text-muted-foreground">
              {needsTier2
                ? t("Score of 3 or more warrants detailed follow-up questions to better understand areas of concern.")
                : t("Screening indicates low developmental risk. Continue routine monitoring.")}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          {needsTier2 ? (
            <Button onClick={onProceedToTier2} className="gap-2">
              <T>Proceed to Follow-up Assessment</T>
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={onSubmitLowRisk} disabled={isPending} className="gap-2">
              {isPending ? t("Submitting...") : t("Submit & View Results")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// --- Main Component ---

const formSchema = insertScreeningSchema.extend({
  patientId: z.coerce.number(),
});

type FormValues = z.infer<typeof formSchema>;

interface ConductScreeningProps {
  patientId?: number;
}

export default function ConductScreening({ patientId: propPatientId }: ConductScreeningProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { mutate, isPending } = useCreateScreening();
  const { mutate: generatePlans } = useGenerateInterventionPlan();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [result, setResult] = useState<{ riskLevel: string; riskScore: number; answers: Record<string, string>; source: "yolo" | "ai" | "fallback"; explanation: string; domainScores?: Record<string, number> | null } | null>(null);
  const [showPhotoStep, setShowPhotoStep] = useState(false);
  const [photoResult, setPhotoResult] = useState<PhotoAnalysisResult | null>(null);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);

  const [selectedPatientId, setSelectedPatientId] = useState<number | undefined>(propPatientId);
  const [showConsent, setShowConsent] = useState(false);
  const [consentCompleted, setConsentCompleted] = useState(false);

  // Two-tier state
  const [currentTier, setCurrentTier] = useState<1 | 2>(1);
  const [tier1Score, setTier1Score] = useState<number | null>(null);
  const [showTier1Result, setShowTier1Result] = useState(false);

  const { data: patients } = useQuery({
    queryKey: [api.patients.list.path],
    queryFn: async () => {
      const res = await fetch(api.patients.list.path);
      return api.patients.list.responses[200].parse(await res.json());
    }
  });

  const { data: consentStatus, refetch: refetchConsent } = useConsentCheck(selectedPatientId || 0, "screening");
  const { data: photoConsentStatus } = useConsentCheck(selectedPatientId || 0, "photo_analysis");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      patientId: propPatientId || undefined,
      answers: {},
      conductedByUserId: user?.id,
      screeningType: "baseline",
    },
  });

  // Compute tier 1 score from form values
  function computeTier1Score(): number {
    const allValues = form.getValues() as unknown as Record<string, string>;
    let concerning = 0;
    for (const q of TIER1_QUESTIONS) {
      const answer = allValues[`question_${q.id}`];
      if (answer && isConcerning(answer, q.reversed)) {
        concerning++;
      }
    }
    return concerning;
  }

  // Check if all tier questions are answered
  function allTierAnswered(tier: 1 | 2): boolean {
    const allValues = form.getValues() as unknown as Record<string, string>;
    const questions = tier === 1 ? TIER1_QUESTIONS : TIER2_QUESTIONS;
    return questions.every(q => {
      const val = allValues[`question_${q.id}`];
      return val === "yes" || val === "no";
    });
  }

  function handleTier1Complete() {
    if (!allTierAnswered(1)) {
      toast({
        title: t("Incomplete"),
        description: t("Please answer all Tier 1 questions before proceeding."),
        variant: "destructive",
      });
      return;
    }
    const score = computeTier1Score();
    setTier1Score(score);
    setShowTier1Result(true);
  }

  function handleProceedToTier2() {
    setShowTier1Result(false);
    setCurrentTier(2);
  }

  function submitScreening() {
    const allValues = form.getValues() as unknown as Record<string, string>;
    const answersMap: Record<string, string> = {};

    TIER1_QUESTIONS.forEach(q => {
      answersMap[q.id] = allValues[`question_${q.id}`];
    });
    if (currentTier === 2) {
      TIER2_QUESTIONS.forEach(q => {
        answersMap[q.id] = allValues[`question_${q.id}`];
      });
    }

    mutate({
      patientId: form.getValues().patientId,
      answers: answersMap,
      conductedByUserId: user?.id,
      screeningType: form.getValues().screeningType,
    }, {
      onSuccess: (data) => {
        setResult({
          riskLevel: data.riskLevel || "Low",
          riskScore: data.riskScore || 0,
          answers: answersMap,
          source: data.source ?? "fallback",
          explanation: data.explanation ?? "",
          domainScores: data.domainScores as Record<string, number> | null,
        });
        setAssessmentId(data.id.toString());

        const hasPhotoConsent = photoConsentStatus?.hasConsent;
        if (hasPhotoConsent) {
          setShowPhotoStep(true);
        } else {
          setShowPhotoStep(false);
          if (selectedPatientId) {
            toast({
              title: t("Photo analysis skipped"),
              description: t("No photo analysis consent on record. Photo step has been skipped."),
            });
          }
        }

        if (data.riskLevel === "High" || data.riskLevel === "Medium") {
          const patient = patients?.find(p => p.id === form.getValues().patientId);
          generatePlans({
            patientId: form.getValues().patientId,
            screeningId: data.id,
            ageMonths: patient?.ageMonths || 12,
            riskLevel: data.riskLevel || "Medium",
            answers: answersMap,
            domainScores: (data as any).domainScores,
          });
        }
      },
      onError: (error: any) => {
        if (error?.code === "CONSENT_REQUIRED" || error?.message?.includes("consent")) {
          toast({
            title: t("Consent required"),
            description: t("Active consent is required before screening. Please record consent first."),
            variant: "destructive",
          });
        } else {
          toast({
            title: t("Screening failed"),
            description: error?.message || t("An unexpected error occurred."),
            variant: "destructive",
          });
        }
      },
    });
  }

  function handleTier2Submit() {
    if (!allTierAnswered(2)) {
      toast({
        title: t("Incomplete"),
        description: t("Please answer all follow-up questions before submitting."),
        variant: "destructive",
      });
      return;
    }
    submitScreening();
  }

  function handleLowRiskSubmit() {
    submitScreening();
  }

  // Domain summary for Tier 2
  const domainSummary = useMemo(() => {
    if (currentTier !== 2) return [];
    const allValues = form.getValues() as unknown as Record<string, string>;
    const allQuestions = [...TIER1_QUESTIONS, ...TIER2_QUESTIONS];
    const domainCounts: Record<string, { total: number; concerning: number }> = {};
    for (const domain of ALL_DOMAINS) {
      domainCounts[domain] = { total: 0, concerning: 0 };
    }
    for (const q of allQuestions) {
      domainCounts[q.domain].total++;
      const answer = allValues[`question_${q.id}`];
      if (answer && isConcerning(answer, q.reversed)) {
        domainCounts[q.domain].concerning++;
      }
    }
    return ALL_DOMAINS.map(domain => ({
      domain,
      ...domainCounts[domain],
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTier, form.watch()]);

  const hasConsent = consentStatus?.hasConsent || consentCompleted;
  const currentStep = result && !showPhotoStep ? 4 : result && showPhotoStep ? 3 : currentTier === 2 ? 2 : showConsent ? 0 : 1;

  // --- Consent Step ---
  if (showConsent && selectedPatientId) {
    const patientName = patients?.find(p => p.id === selectedPatientId)?.name || "Patient";
    return (
      <ConsentCapture
        patientId={selectedPatientId}
        patientName={patientName}
        onComplete={() => {
          setConsentCompleted(true);
          setShowConsent(false);
          refetchConsent();
        }}
        onBack={() => setShowConsent(false)}
      />
    );
  }

  // --- Photo Step ---
  if (result && showPhotoStep) {
    return (
      <div className="max-w-2xl mx-auto py-6 px-4">
        <StepIndicator currentStep={3} />
        <PhotoCapture
          screeningId={Number.parseInt(assessmentId || "0", 10) || 0}
          patientId={selectedPatientId}
          onAnalysisComplete={(photoData) => {
            setPhotoResult(photoData);
            setShowPhotoStep(false);
          }}
          onSkip={() => {
            setPhotoResult(null);
            setShowPhotoStep(false);
          }}
        />
      </div>
    );
  }

  // --- Results Step ---
  if (result && !showPhotoStep) {
    return (
      <div className="max-w-2xl mx-auto py-6 px-4">
        <StepIndicator currentStep={4} />
        <AIResults
          assessmentId={assessmentId || undefined}
          onComplete={() => setLocation("/field-worker/home")}
          riskScore={result.riskScore}
          riskLevel={result.riskLevel}
          answers={result.answers}
          source={result.source}
          explanation={result.explanation}
          photoAnalysis={photoResult}
          patientId={selectedPatientId}
          domainScores={result.domainScores}
        />
      </div>
    );
  }

  // --- Tier 1 Result Display ---
  if (showTier1Result && tier1Score !== null) {
    return (
      <div className="max-w-2xl mx-auto py-6 px-4">
        <StepIndicator currentStep={1} />
        <Tier1ResultCard
          score={tier1Score}
          total={15}
          onProceedToTier2={handleProceedToTier2}
          onSubmitLowRisk={handleLowRiskSubmit}
          isPending={isPending}
        />
      </div>
    );
  }

  // --- Question Rendering Helper ---
  function renderQuestions(questions: ScreeningQuestion[]) {
    return questions.map((question, index) => (
      <div key={question.id}>
        {index > 0 && <Separator className="my-3" />}
        <FormField
          control={form.control}
          // @ts-ignore - dynamic field names
          name={`question_${question.id}`}
          rules={{ required: "This answer is required" }}
          render={({ field }) => (
            <FormItem className="space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <FormLabel className="text-base font-medium leading-snug flex-1">
                  <span className="text-muted-foreground text-sm mr-2">{index + 1}.</span>
                  {t(question.text)}
                </FormLabel>
                <Badge className={`text-[10px] shrink-0 ${DOMAIN_COLORS[question.domain] || "bg-gray-100 text-gray-700"}`}>
                  {t(question.domain)}
                </Badge>
              </div>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex gap-4"
                >
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="yes" />
                    </FormControl>
                    <FormLabel className="font-normal">{t("Yes")}</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="no" />
                    </FormControl>
                    <FormLabel className="font-normal">{t("No")}</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    ));
  }

  // --- Main Form ---
  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <StepIndicator currentStep={currentTier === 2 ? 2 : (selectedPatientId && hasConsent ? 1 : 0)} />
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground"><T>Developmental Screening</T></h1>
        <p className="text-muted-foreground mt-2">
          <T>Two-tier behavioral screening for early detection of developmental concerns.</T>
        </p>
        <div className="mt-2 p-2.5 rounded-lg bg-blue-50 border border-blue-200">
          <p className="text-xs text-blue-700">
            <T>This tool is for early risk screening only, not diagnosis. It identifies possible early signs of developmental delay and flags persons who should be referred to a pediatric specialist.</T>
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          {/* Patient Selection (only show in Tier 1) */}
          {currentTier === 1 && (
            <Card>
              <CardHeader>
                <CardTitle><T>Select Patient</T></CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="patientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel><T>Patient Name</T></FormLabel>
                      <Select
                        onValueChange={(val) => {
                          field.onChange(val);
                          setSelectedPatientId(Number(val));
                          setConsentCompleted(false);
                        }}
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder={t("Select a patient...")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background">
                          {patients?.map((patient) => (
                            <SelectItem key={patient.id} value={patient.id.toString()}>
                              {patient.name} (Age: {patient.ageMonths}m)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedPatientId && (
                  <div className={`flex items-center gap-2 p-3 rounded-lg border text-sm ${hasConsent ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-300 text-red-700"}`}>
                    {hasConsent ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span><T>Consent on file</T></span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium"><T>Consent required</T></p>
                          <p className="text-xs mt-0.5 text-red-600"><T>Consent must be recorded before screening can proceed.</T></p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          className="ml-auto text-xs h-8"
                          onClick={() => setShowConsent(true)}
                        >
                          <T>Record Consent</T>
                        </Button>
                      </>
                    )}
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="screeningType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel><T>Screening Type</T></FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value || "baseline"}>
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background">
                          <SelectItem value="baseline"><T>Baseline Assessment</T></SelectItem>
                          <SelectItem value="reassessment_3m"><T>3-Month Reassessment</T></SelectItem>
                          <SelectItem value="reassessment_6m"><T>6-Month Reassessment</T></SelectItem>
                          <SelectItem value="ad_hoc"><T>Ad-hoc Screening</T></SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Tier 1: Rapid Screening */}
          {currentTier === 1 && selectedPatientId && hasConsent && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-primary" />
                    <T>Tier 1: Rapid Screening</T>
                  </CardTitle>
                  <CardDescription>
                    <T>15 questions covering key behavioral domains. Estimated time: under 10 minutes.</T>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {renderQuestions(TIER1_QUESTIONS)}
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button type="button" onClick={handleTier1Complete} disabled={!hasConsent} className="min-w-[180px]">
                  <T>Score Tier 1</T>
                </Button>
              </div>
            </>
          )}

          {/* Tier 2: Follow-up Assessment */}
          {currentTier === 2 && (
            <>
              <Card className="border-amber-200 bg-amber-50/30">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span className="font-medium text-amber-800">
                      <T>Tier 1 score:</T> {tier1Score}/15 — <T>Follow-up assessment triggered</T>
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-amber-600" />
                    <T>Tier 2: Follow-up Assessment</T>
                  </CardTitle>
                  <CardDescription>
                    <T>12 detailed follow-up questions to better characterize areas of concern.</T>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {renderQuestions(TIER2_QUESTIONS)}
                </CardContent>
              </Card>

              {/* Domain Indicators Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base"><T>Domain Indicators</T></CardTitle>
                  <CardDescription><T>Concern levels across behavioral domains based on all responses.</T></CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2.5">
                    {domainSummary.map(({ domain, total, concerning }) => {
                      const pct = total > 0 ? Math.round((concerning / total) * 100) : 0;
                      return (
                        <div key={domain} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{t(domain)}</span>
                            <span className="text-muted-foreground">{concerning}/{total} flagged</span>
                          </div>
                          <Progress value={pct} className={`h-2 ${pct >= 60 ? "[&>div]:bg-red-500" : pct >= 30 ? "[&>div]:bg-amber-500" : "[&>div]:bg-green-500"}`} />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => { setCurrentTier(1); setShowTier1Result(false); setTier1Score(null); }}>
                  <T>Back to Tier 1</T>
                </Button>
                <Button type="button" onClick={handleTier2Submit} disabled={isPending} className="min-w-[180px]">
                  {isPending ? t("Analyzing...") : t("Submit Assessment")}
                </Button>
              </div>
            </>
          )}
        </form>
      </Form>
    </div>
  );
}

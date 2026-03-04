import AIResults from "./AIResults";
import PhotoCapture, { type PhotoAnalysisResult } from "@/components/PhotoCapture";
import ConsentCapture from "./ConsentCapture";
import { useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, AlertTriangle, AlertCircle, Camera, ClipboardList, FileCheck } from "lucide-react";

const STEPS = [
  { label: "Patient & Consent", icon: FileCheck },
  { label: "Questions", icon: ClipboardList },
  { label: "Photo", icon: Camera },
  { label: "Results", icon: CheckCircle2 },
];

function StepIndicator({ currentStep }: { currentStep: number }) {
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
              <span className="hidden sm:inline">{step.label}</span>
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

const QUESTIONS = [
  { id: "q1", text: "Can the patient walk or move unassisted?", category: "Motor" },
  { id: "q2", text: "Does the patient respond to their name?", category: "Social" },
  { id: "q3", text: "Is the patient maintaining adequate nutrition?", category: "Nutrition" },
  { id: "q4", text: "Does the patient maintain eye contact during interaction?", category: "Social" },
  { id: "q5", text: "Can the patient communicate basic needs verbally?", category: "Language" },
];

const formSchema = insertScreeningSchema.extend({
  patientId: z.coerce.number(),
});

type FormValues = z.infer<typeof formSchema>;

interface ConductScreeningProps {
  patientId?: number;
}

export default function ConductScreening({ patientId: propPatientId }: ConductScreeningProps) {
  const { user } = useAuth();
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

  function onSubmit(values: FormValues) {
    const allValues = form.getValues() as unknown as Record<string, string>;
    const answersMap: Record<string, string> = {};
    QUESTIONS.forEach(q => {
      answersMap[q.id] = allValues[`question_${q.id}`];
    });

    mutate({
      patientId: values.patientId,
      answers: answersMap,
      conductedByUserId: user?.id,
      screeningType: values.screeningType,
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
              title: "Photo analysis skipped",
              description: "No photo analysis consent on record. Photo step has been skipped.",
            });
          }
        }

        if (data.riskLevel === "High" || data.riskLevel === "Medium") {
          const patient = patients?.find(p => p.id === values.patientId);
          generatePlans({
            patientId: values.patientId,
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
            title: "Consent required",
            description: "Active consent is required before screening. Please record consent first.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Screening failed",
            description: error?.message || "An unexpected error occurred.",
            variant: "destructive",
          });
        }
      },
    });
  }

  const currentStep = result && !showPhotoStep ? 3 : result && showPhotoStep ? 2 : showConsent ? 0 : 1;

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

  if (result && showPhotoStep) {
    return (
      <div className="max-w-2xl mx-auto py-6 px-4">
        <StepIndicator currentStep={2} />
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

  if (result && !showPhotoStep) {
    return (
      <div className="max-w-2xl mx-auto py-6 px-4">
        <StepIndicator currentStep={3} />
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

  const hasConsent = consentStatus?.hasConsent || consentCompleted;

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <StepIndicator currentStep={selectedPatientId && hasConsent ? 1 : 0} />
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Health Screening</h1>
        <p className="text-muted-foreground mt-2">
          Assessment for early detection of health conditions and risk factors.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Select Patient</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="patientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Patient Name</FormLabel>
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
                          <SelectValue placeholder="Select a patient..." />
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
                      <span>Consent on file</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium">Consent required</p>
                        <p className="text-xs mt-0.5 text-red-600">Consent must be recorded before screening can proceed.</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        className="ml-auto text-xs h-8"
                        onClick={() => setShowConsent(true)}
                      >
                        Record Consent
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
                    <FormLabel>Screening Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || "baseline"}>
                      <FormControl>
                        <SelectTrigger className="bg-background">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-background">
                        <SelectItem value="baseline">Baseline Assessment</SelectItem>
                        <SelectItem value="reassessment_3m">3-Month Reassessment</SelectItem>
                        <SelectItem value="reassessment_6m">6-Month Reassessment</SelectItem>
                        <SelectItem value="ad_hoc">Ad-hoc Screening</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assessment Questions</CardTitle>
              <CardDescription>Answer all questions based on observation and patient or caregiver report.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {QUESTIONS.map((question, index) => (
                <div key={question.id}>
                  {index > 0 && <Separator className="my-3" />}
                  <FormField
                    control={form.control}
                    // @ts-ignore - dynamic field names
                    name={`question_${question.id}`}
                    rules={{ required: "This answer is required" }}
                    render={({ field }) => (
                      <FormItem className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <FormLabel className="text-base font-medium">{question.text}</FormLabel>
                          <span className="text-xs font-semibold px-1.5 py-0.5 bg-muted rounded text-muted-foreground uppercase">{question.category}</span>
                        </div>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-0.5"
                          >
                            <FormItem className="flex items-center space-x-2.5 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="yes" />
                              </FormControl>
                              <FormLabel className="font-normal">Yes, consistently</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2.5 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="sometimes" />
                              </FormControl>
                              <FormLabel className="font-normal">Sometimes / With help</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2.5 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="no" />
                              </FormControl>
                              <FormLabel className="font-normal">No, not yet</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button size="default" type="submit" disabled={isPending || !hasConsent} className="min-w-[180px]">
              {isPending ? "Analyzing..." : "Submit Assessment"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

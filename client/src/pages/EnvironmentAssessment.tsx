import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { usePatient, useCreateEnvironmentAssessment } from "@/hooks/use-resources";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Home, CheckCircle2 } from "lucide-react";
import { T, useLanguage } from "@/hooks/use-language";

export default function EnvironmentAssessment() {
  const [, params] = useRoute("/patients/:id/environment");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();
  const patientId = params ? Number.parseInt(params.id, 10) || 0 : 0;
  const { data: patient, isLoading } = usePatient(patientId);
  const { mutate, isPending } = useCreateEnvironmentAssessment();

  const [parentChildInteraction, setParentChildInteraction] = useState<string>("5");
  const [parentMentalHealth, setParentMentalHealth] = useState<string>("3");
  const [homeStimulation, setHomeStimulation] = useState<string>("5");
  const [playMaterials, setPlayMaterials] = useState(true);
  const [caregiverEngagement, setCaregiverEngagement] = useState<string>("");
  const [languageExposure, setLanguageExposure] = useState<string>("");
  const [safeWater, setSafeWater] = useState(true);
  const [toiletFacility, setToiletFacility] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  if (isLoading) return <div className="p-8">Loading...</div>;
  if (!patient) return <div className="p-8">Patient not found</div>;

  if (submitted) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center space-y-6 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold"><T>Home Visit Recorded</T></h2>
          <p className="text-muted-foreground"><T>Environment assessment saved for</T> {patient.name}</p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => setLocation(`/patients/${patientId}`)}>
            <T>Back to Profile</T>
          </Button>
          <Button onClick={() => setLocation("/field-worker/home")}>
            <T>Back to Home</T>
          </Button>
        </div>
      </div>
    );
  }

  function handleSubmit() {
    mutate({
      patientId,
      parentChildInteraction: parentChildInteraction ? parseInt(parentChildInteraction) : undefined,
      parentMentalHealth: parentMentalHealth ? parseInt(parentMentalHealth) : undefined,
      homeStimulation: homeStimulation ? parseInt(homeStimulation) : undefined,
      playMaterials,
      caregiverEngagement: caregiverEngagement || undefined,
      languageExposure: languageExposure || undefined,
      safeWater,
      toiletFacility,
      assessedByUserId: user?.id,
    }, {
      onSuccess: () => setSubmitted(true),
    });
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <Button variant="ghost" onClick={() => setLocation(`/patients/${patientId}`)} className="gap-2 mb-4">
        <ArrowLeft className="w-4 h-4" />
        <T>Back to Profile</T>
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground"><T>Home Visit Assessment</T></h1>
        <p className="text-muted-foreground mt-2">
          <T>Record environment and caregiving factors for</T> <strong>{patient.name}</strong>
        </p>
      </div>

      <div className="space-y-6">
        {/* Interaction & Stimulation Scores */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Home className="w-5 h-5 text-blue-500" />
              <CardTitle><T>Home Environment</T></CardTitle>
            </div>
            <CardDescription>
              <T>Rate each factor on a scale of 0 (very poor) to 10 (excellent).</T>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label><T>Parent-Child Interaction</T> ({parentChildInteraction}/10)</Label>
              <Input
                type="range"
                min="0"
                max="10"
                value={parentChildInteraction}
                onChange={(e) => setParentChildInteraction(e.target.value)}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span><T>Poor</T></span><span><T>Excellent</T></span>
              </div>
            </div>

            <div className="space-y-2">
              <Label><T>Parent Mental Health Concerns</T> ({parentMentalHealth}/10)</Label>
              <Input
                type="range"
                min="0"
                max="10"
                value={parentMentalHealth}
                onChange={(e) => setParentMentalHealth(e.target.value)}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span><T>No concerns</T></span><span><T>Severe concerns</T></span>
              </div>
            </div>

            <div className="space-y-2">
              <Label><T>Home Stimulation</T> ({homeStimulation}/10)</Label>
              <Input
                type="range"
                min="0"
                max="10"
                value={homeStimulation}
                onChange={(e) => setHomeStimulation(e.target.value)}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span><T>Unstimulating</T></span><span><T>Highly stimulating</T></span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Caregiving */}
        <Card>
          <CardHeader>
            <CardTitle><T>Caregiving & Resources</T></CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label><T>Caregiver Engagement</T></Label>
                <Select onValueChange={setCaregiverEngagement} value={caregiverEngagement}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("Select level")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High"><T>High</T></SelectItem>
                    <SelectItem value="Medium"><T>Medium</T></SelectItem>
                    <SelectItem value="Low"><T>Low</T></SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label><T>Language Exposure</T></Label>
                <Select onValueChange={setLanguageExposure} value={languageExposure}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("Select")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Adequate"><T>Adequate</T></SelectItem>
                    <SelectItem value="Inadequate"><T>Inadequate</T></SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="play-materials"><T>Play Materials Available</T></Label>
                <Switch id="play-materials" checked={playMaterials} onCheckedChange={setPlayMaterials} />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="safe-water"><T>Safe Drinking Water</T></Label>
                <Switch id="safe-water" checked={safeWater} onCheckedChange={setSafeWater} />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="toilet"><T>Toilet Facility</T></Label>
                <Switch id="toilet" checked={toiletFacility} onCheckedChange={setToiletFacility} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => setLocation(`/patients/${patientId}`)}>
            <T>Cancel</T>
          </Button>
          <Button onClick={handleSubmit} disabled={isPending} className="min-w-[150px]">
            {isPending ? t("Saving...") : t("Save Assessment")}
          </Button>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useCreateNutritionAssessment } from "@/hooks/use-resources";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Apple, ArrowRight, SkipForward } from "lucide-react";
import { T, useLanguage } from "@/hooks/use-language";

interface NutritionAssessmentFormProps {
  patientId: number;
  screeningId?: number;
  onComplete: (data: any) => void;
  onSkip: () => void;
}

function getNutritionPreview(weight: number | null, height: number | null, hb: number | null) {
  const flags: string[] = [];
  if (weight != null && weight < 8) flags.push("Possible underweight");
  if (height != null && height < 70) flags.push("Possible stunting");
  if (weight != null && height != null && height > 0) {
    const bmi = weight / ((height / 100) ** 2);
    if (bmi < 14) flags.push("Possible wasting");
  }
  if (hb != null && hb < 11) flags.push("Possible anemia");
  return flags;
}

export default function NutritionAssessmentForm({ patientId, screeningId, onComplete, onSkip }: NutritionAssessmentFormProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { mutate, isPending } = useCreateNutritionAssessment();

  const [weightKg, setWeightKg] = useState<string>("");
  const [heightCm, setHeightCm] = useState<string>("");
  const [muacCm, setMuacCm] = useState<string>("");
  const [hemoglobin, setHemoglobin] = useState<string>("");

  const wVal = weightKg ? parseFloat(weightKg) : null;
  const hVal = heightCm ? parseFloat(heightCm) : null;
  const hbVal = hemoglobin ? parseFloat(hemoglobin) : null;
  const previewFlags = getNutritionPreview(wVal, hVal, hbVal);
  const hasAnyValue = wVal != null || hVal != null || hbVal != null;

  function handleSubmit() {
    if (!hasAnyValue) return;
    mutate({
      patientId,
      screeningId,
      weightKg: wVal ?? undefined,
      heightCm: hVal ?? undefined,
      muacCm: muacCm ? parseFloat(muacCm) : undefined,
      hemoglobin: hbVal ?? undefined,
      assessedByUserId: user?.id,
    }, {
      onSuccess: (data) => onComplete(data),
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Apple className="w-5 h-5 text-green-600" />
          <CardTitle><T>Nutrition Assessment</T></CardTitle>
        </div>
        <CardDescription>
          <T>Record anthropometric measurements. All fields optional — enter what's available.</T>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="weight"><T>Weight</T> (kg)</Label>
            <Input
              id="weight"
              type="number"
              step="0.1"
              min="0"
              max="50"
              placeholder="e.g. 12.5"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="height"><T>Height</T> (cm)</Label>
            <Input
              id="height"
              type="number"
              step="0.1"
              min="0"
              max="150"
              placeholder="e.g. 85.0"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="muac"><T>MUAC</T> (cm)</Label>
            <Input
              id="muac"
              type="number"
              step="0.1"
              min="0"
              max="30"
              placeholder="e.g. 13.5"
              value={muacCm}
              onChange={(e) => setMuacCm(e.target.value)}
            />
            <p className="text-xs text-muted-foreground"><T>Mid-upper arm circumference</T></p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hemoglobin"><T>Hemoglobin</T> (g/dL)</Label>
            <Input
              id="hemoglobin"
              type="number"
              step="0.1"
              min="0"
              max="20"
              placeholder="e.g. 11.2"
              value={hemoglobin}
              onChange={(e) => setHemoglobin(e.target.value)}
            />
          </div>
        </div>

        {/* Live preview of flags */}
        {hasAnyValue && (
          <div className={`p-3 rounded-lg border ${previewFlags.length > 0 ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"}`}>
            <p className="text-xs font-medium text-muted-foreground mb-1.5"><T>Quick Preview</T></p>
            {previewFlags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {previewFlags.map(f => (
                  <Badge key={f} variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 text-xs">
                    {t(f)}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-green-700"><T>No immediate flags detected</T></p>
            )}
            <p className="text-xs text-muted-foreground mt-1.5"><T>Final calculation uses WHO standards on the server</T></p>
          </div>
        )}

        <div className="flex justify-between gap-4 pt-2">
          <Button type="button" variant="ghost" onClick={onSkip}>
            <SkipForward className="w-4 h-4 mr-2" />
            <T>Skip</T>
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !hasAnyValue} className="min-w-[150px]">
            {isPending ? t("Saving...") : t("Save & Continue")}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

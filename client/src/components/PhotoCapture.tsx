import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera, Upload, Loader2, AlertTriangle, SkipForward, Send } from "lucide-react";

export interface PhotoAnalysisResult {
  status: "detected" | "not_detected" | "inconclusive";
  confidence: number;
  indicators: string[];
  explanation: string;
  source: "yolo" | "ai" | "fallback";
  model?: string;
}

interface PhotoCaptureProps {
  screeningId: number;
  patientId?: number;
  onAnalysisComplete: (result: PhotoAnalysisResult) => void;
  onSkip: () => void;
}

export default function PhotoCapture({ screeningId, patientId, onAnalysisComplete, onSkip }: PhotoCaptureProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleImageSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5MB.");
      return;
    }

    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
      setImageBase64(dataUrl);
    };
    reader.readAsDataURL(file);

    event.target.value = "";
  }

  async function handleAnalyze() {
    if (!imageBase64) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const res = await fetch("/api/analyze-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imageBase64,
          screeningId,
          patientId,
        }),
      });

      if (res.status === 403) {
        setError("Photo analysis consent not on record. Please record consent for photo analysis before proceeding.");
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Photo analysis failed" }));
        throw new Error(err.message);
      }

      const result: PhotoAnalysisResult = await res.json();
      onAnalysisComplete(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Photo analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto py-6 px-4 space-y-5">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Photo Health Screening
        </h1>
        <p className="text-muted-foreground mt-2">
          Optional: Capture or upload a photo of the patient's face for AI-assisted analysis.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-1.5">
            <Camera className="w-4 h-4" />
            Photo Capture
          </CardTitle>
          <CardDescription>
            Take a photo using the camera or upload an existing image for analysis.
            The photo should clearly show the patient's face.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleImageSelect}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-16 flex-col gap-1.5"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isAnalyzing}
            >
              <Camera className="w-5 h-5" />
              <span>Take Photo</span>
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-16 flex-col gap-1.5"
              onClick={() => fileInputRef.current?.click()}
              disabled={isAnalyzing}
            >
              <Upload className="w-5 h-5" />
              <span>Upload Image</span>
            </Button>
          </div>

          {imagePreview && (
            <div className="flex flex-col items-center gap-3">
              <div className="relative w-full max-w-xs aspect-square rounded-lg overflow-hidden border-2 border-muted bg-muted/30">
                <img
                  src={imagePreview}
                  alt="Captured photo preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <Badge variant="secondary" className="text-xs">
                Photo ready for analysis
              </Badge>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
            <p className="text-xs text-amber-700">
              This photo analysis is a <strong>non-diagnostic screening aid</strong> only.
              A definitive diagnosis requires genetic testing (karyotyping).
              Physical features alone are not sufficient for diagnosis.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onSkip}
          disabled={isAnalyzing}
          className="gap-1.5"
        >
          <SkipForward className="w-3.5 h-3.5" />
          Skip This Step
        </Button>

        <Button
          size="sm"
          onClick={handleAnalyze}
          disabled={!imageBase64 || isAnalyzing}
          className="gap-1.5 min-w-[160px]"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              Analyze Photo
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

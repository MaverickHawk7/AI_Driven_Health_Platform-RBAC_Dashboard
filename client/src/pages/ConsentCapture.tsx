import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCreateConsent, useConsentRecords } from "@/hooks/use-resources";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, ShieldCheck, AlertTriangle, ArrowLeft } from "lucide-react";

interface ConsentCaptureProps {
  patientId: number;
  patientName: string;
  onComplete: () => void;
  onBack?: () => void;
}

const CONSENT_TYPES = [
  { type: "screening", label: "Health Screening", description: "Permission to conduct health screening assessments on the patient." },
  { type: "photo_analysis", label: "Photo Analysis", description: "Permission to take and analyze photographs of the patient for AI-assisted screening." },
  { type: "data_sharing", label: "Data Sharing", description: "Permission to share anonymized assessment data with health authorities for program improvement." },
] as const;

export default function ConsentCapture({ patientId, patientName, onComplete, onBack }: ConsentCaptureProps) {
  const { user } = useAuth();
  const { mutate: createConsent, isPending } = useCreateConsent();
  const { data: existingConsents } = useConsentRecords(patientId);

  const [guardianName, setGuardianName] = useState("");
  const [relationship, setRelationship] = useState<string>("mother");
  const [consentMethod, setConsentMethod] = useState<string>("verbal_witnessed");
  const [consentDecisions, setConsentDecisions] = useState<Record<string, boolean>>({
    screening: true,
    photo_analysis: true,
    data_sharing: false,
  });
  const [submitted, setSubmitted] = useState(false);

  const activeConsents = (existingConsents || []).filter((c: any) => c.consentGiven && !c.revokedAt);

  function handleSubmit() {
    if (!guardianName.trim()) return;

    const consentsToCreate = CONSENT_TYPES.map(ct => ({
      patientId,
      guardianName: guardianName.trim(),
      guardianRelationship: relationship,
      consentType: ct.type,
      consentGiven: consentDecisions[ct.type] ?? false,
      consentMethod: consentMethod,
      witnessUserId: user?.id ?? null,
    }));

    let completed = 0;
    for (const consent of consentsToCreate) {
      createConsent(consent, {
        onSuccess: () => {
          completed++;
          if (completed === consentsToCreate.length) {
            setSubmitted(true);
          }
        },
      });
    }
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto py-8 px-4 space-y-6">
        <Card className="border-2 border-green-200 bg-green-50/50">
          <CardContent className="flex flex-col items-center py-8 space-y-4">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
            <h2 className="text-xl font-bold text-green-800">Consent Recorded</h2>
            <p className="text-sm text-green-700 text-center">
              Consent for {patientName} has been successfully recorded.
            </p>
            <Button onClick={onComplete} className="mt-4">
              Continue to Screening
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-6 px-4 space-y-5">
      {onBack && (
        <Button variant="ghost" onClick={onBack} className="gap-2 mb-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      )}

      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-primary" />
          Patient Consent
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Record consent for <strong>{patientName}</strong> before proceeding with screening.
        </p>
      </div>

      {activeConsents.length > 0 && (
        <Card className="border-green-200 bg-green-50/30">
          <CardContent className="py-3">
            <p className="text-sm text-green-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {activeConsents.length} active consent(s) already on file.
            </p>
            <Button variant="outline" size="sm" className="mt-2" onClick={onComplete}>
              Skip — use existing consent
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Consent Provider Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="guardianName">Full Name (Patient or Guardian)</Label>
            <Input
              id="guardianName"
              placeholder="Enter full name"
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Relationship to Patient</Label>
            <RadioGroup value={relationship} onValueChange={setRelationship} className="flex flex-wrap gap-3">
              {["mother", "father", "legal_guardian", "other"].map(rel => (
                <div key={rel} className="flex items-center space-x-2">
                  <RadioGroupItem value={rel} id={`rel-${rel}`} />
                  <Label htmlFor={`rel-${rel}`} className="font-normal capitalize">{rel.replace("_", " ")}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-1.5">
            <Label>Consent Method</Label>
            <RadioGroup value={consentMethod} onValueChange={setConsentMethod} className="flex flex-wrap gap-3">
              {[
                { value: "verbal_witnessed", label: "Verbal (Witnessed)" },
                { value: "digital_signature", label: "Digital Signature" },
                { value: "paper_scanned", label: "Paper (Scanned)" },
              ].map(m => (
                <div key={m.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={m.value} id={`method-${m.value}`} />
                  <Label htmlFor={`method-${m.value}`} className="font-normal">{m.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Consent Permissions</CardTitle>
          <CardDescription className="text-xs">Select which types of assessments are consented to.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {CONSENT_TYPES.map((ct, idx) => (
            <div key={ct.type}>
              {idx > 0 && <Separator className="my-3" />}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium">{ct.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{ct.description}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={consentDecisions[ct.type] ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setConsentDecisions(prev => ({ ...prev, [ct.type]: true }))}
                  >
                    Consent
                  </Button>
                  <Button
                    variant={!consentDecisions[ct.type] ? "destructive" : "outline"}
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setConsentDecisions(prev => ({ ...prev, [ct.type]: false }))}
                  >
                    Decline
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
        <p className="text-xs text-amber-700 flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          All data is handled in accordance with local data protection regulations.
          Consent can be revoked at any time through the patient profile.
        </p>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={!guardianName.trim() || isPending}
          className="min-w-[160px]"
        >
          {isPending ? "Recording..." : "Record Consent"}
        </Button>
      </div>
    </div>
  );
}

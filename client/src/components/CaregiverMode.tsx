import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Volume2, VolumeX, Eye } from "lucide-react";

interface CaregiverModeProps {
  children: React.ReactNode;
  caregiverContent?: React.ReactNode;
}

export function useCaregiverMode() {
  const [isActive, setIsActive] = useState(false);
  const toggle = useCallback(() => setIsActive((v) => !v), []);
  return { isActive, toggle };
}

export function CaregiverToggle({ isActive, onToggle }: { isActive: boolean; onToggle: () => void }) {
  return (
    <Button
      variant={isActive ? "default" : "outline"}
      size="sm"
      className="gap-1.5"
      onClick={onToggle}
    >
      <Eye className="w-3.5 h-3.5" />
      {isActive ? "Professional View" : "Caregiver View"}
    </Button>
  );
}

export function ReadAloudButton({ text }: { text: string }) {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSpeak = useCallback(() => {
    if (!("speechSynthesis" in window)) return;

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }, [text, speaking]);

  if (!("speechSynthesis" in window)) return null;

  return (
    <Button variant="ghost" size="sm" className="gap-1 text-xs h-7" onClick={handleSpeak}>
      {speaking ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
      {speaking ? "Stop" : "Read Aloud"}
    </Button>
  );
}

export function CaregiverCard({ title, simpleText, detailText, isCaregiver }: {
  title: string;
  simpleText: string;
  detailText: string;
  isCaregiver: boolean;
}) {
  return (
    <div className={`p-3 rounded-lg border ${isCaregiver ? "bg-blue-50 border-blue-200" : "bg-muted/30"}`}>
      <div className="flex items-center justify-between mb-1">
        <p className={`font-medium ${isCaregiver ? "text-lg" : "text-sm"}`}>{title}</p>
        {isCaregiver && <ReadAloudButton text={`${title}. ${simpleText}`} />}
      </div>
      <p className={`${isCaregiver ? "text-base text-blue-800 leading-relaxed" : "text-sm text-muted-foreground"}`}>
        {isCaregiver ? simpleText : detailText}
      </p>
    </div>
  );
}

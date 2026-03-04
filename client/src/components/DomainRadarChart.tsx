import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from "recharts";

interface DomainRadarProps {
  baseline: Record<string, number> | null;
  latest: Record<string, number> | null;
}

const DOMAIN_LABELS: Record<string, string> = {
  motor: "Motor",
  social: "Social",
  language: "Language",
  nutrition: "Nutrition",
  cognitive: "Cognitive",
};

export default function DomainRadarChart({ baseline, latest }: DomainRadarProps) {
  if (!baseline && !latest) return null;

  const domains = ["motor", "social", "language", "nutrition", "cognitive"];
  const data = domains.map((d) => ({
    domain: DOMAIN_LABELS[d] || d,
    baseline: baseline?.[d] ?? 0,
    latest: latest?.[d] ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid strokeDasharray="3 3" />
        <PolarAngleAxis dataKey="domain" tick={{ fontSize: 12 }} />
        <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
        {baseline && (
          <Radar
            name="Baseline"
            dataKey="baseline"
            stroke="#94a3b8"
            fill="#94a3b8"
            fillOpacity={0.15}
            strokeDasharray="5 5"
            strokeWidth={2}
          />
        )}
        {latest && (
          <Radar
            name="Latest"
            dataKey="latest"
            stroke="#6366f1"
            fill="#6366f1"
            fillOpacity={0.25}
            strokeWidth={2}
          />
        )}
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

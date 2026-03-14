/**
 * Simplified WHO growth standard calculations for nutrition assessment.
 * Uses threshold-based approach (not full interpolation) for field-level screening.
 *
 * References:
 * - WHO Child Growth Standards (0-5 years)
 * - WHO Growth Reference (5-19 years)
 * - Anemia thresholds: WHO Haemoglobin concentrations
 */

interface NutritionFlags {
  underweight: boolean;
  stunting: boolean;
  wasting: boolean;
  anemia: boolean;
  nutritionScore: number;
  nutritionRisk: "Low" | "Medium" | "High";
}

// Simplified weight-for-age -2SD thresholds (median - 2SD) by age in months
// Source: WHO Child Growth Standards, simplified for field use
const WEIGHT_FOR_AGE_MINUS2SD: Record<string, { male: number; female: number }> = {
  "0":  { male: 2.5, female: 2.4 },
  "3":  { male: 5.0, female: 4.5 },
  "6":  { male: 6.4, female: 5.8 },
  "9":  { male: 7.2, female: 6.5 },
  "12": { male: 7.8, female: 7.0 },
  "18": { male: 8.8, female: 8.1 },
  "24": { male: 9.7, female: 9.0 },
  "30": { male: 10.5, female: 9.7 },
  "36": { male: 11.3, female: 10.4 },
  "42": { male: 11.8, female: 10.9 },
  "48": { male: 12.3, female: 11.3 },
  "54": { male: 12.8, female: 11.8 },
  "60": { male: 13.3, female: 12.3 },
  "66": { male: 13.9, female: 12.8 },
  "72": { male: 14.4, female: 13.3 },
};

// Simplified height-for-age -2SD thresholds (cm) by age in months
const HEIGHT_FOR_AGE_MINUS2SD: Record<string, { male: number; female: number }> = {
  "0":  { male: 46.1, female: 45.4 },
  "3":  { male: 57.3, female: 55.6 },
  "6":  { male: 63.3, female: 61.2 },
  "9":  { male: 67.5, female: 65.3 },
  "12": { male: 71.0, female: 68.9 },
  "18": { male: 76.9, female: 74.9 },
  "24": { male: 81.7, female: 80.0 },
  "30": { male: 85.1, female: 83.6 },
  "36": { male: 88.7, female: 87.4 },
  "42": { male: 91.9, female: 90.5 },
  "48": { male: 94.9, female: 93.6 },
  "54": { male: 97.8, female: 96.6 },
  "60": { male: 100.7, female: 99.5 },
  "66": { male: 103.3, female: 102.1 },
  "72": { male: 105.9, female: 104.8 },
};

// Simplified weight-for-height -2SD thresholds (kg for given height range in cm)
// Uses midpoint heights for lookup
const WEIGHT_FOR_HEIGHT_MINUS2SD: Array<{ minH: number; maxH: number; male: number; female: number }> = [
  { minH: 45, maxH: 55, male: 2.4, female: 2.3 },
  { minH: 55, maxH: 65, male: 5.0, female: 4.7 },
  { minH: 65, maxH: 75, male: 6.7, female: 6.3 },
  { minH: 75, maxH: 85, male: 8.4, female: 8.0 },
  { minH: 85, maxH: 95, male: 10.1, female: 9.7 },
  { minH: 95, maxH: 105, male: 12.1, female: 11.7 },
  { minH: 105, maxH: 120, male: 14.1, female: 13.7 },
];

function getClosestKey(ageMonths: number, table: Record<string, any>): string {
  const keys = Object.keys(table).map(Number).sort((a, b) => a - b);
  let closest = keys[0];
  for (const k of keys) {
    if (Math.abs(k - ageMonths) < Math.abs(closest - ageMonths)) {
      closest = k;
    }
  }
  return closest.toString();
}

export function computeNutritionFlags(
  ageMonths: number,
  gender: "male" | "female" | null,
  weightKg: number | null,
  heightCm: number | null,
  hemoglobin: number | null,
): NutritionFlags {
  const sex = gender || "male"; // default to male if unknown
  let underweight = false;
  let stunting = false;
  let wasting = false;
  let anemia = false;

  // Underweight: weight-for-age < -2SD
  if (weightKg != null && ageMonths <= 72) {
    const key = getClosestKey(ageMonths, WEIGHT_FOR_AGE_MINUS2SD);
    const threshold = WEIGHT_FOR_AGE_MINUS2SD[key]?.[sex];
    if (threshold && weightKg < threshold) {
      underweight = true;
    }
  }

  // Stunting: height-for-age < -2SD
  if (heightCm != null && ageMonths <= 72) {
    const key = getClosestKey(ageMonths, HEIGHT_FOR_AGE_MINUS2SD);
    const threshold = HEIGHT_FOR_AGE_MINUS2SD[key]?.[sex];
    if (threshold && heightCm < threshold) {
      stunting = true;
    }
  }

  // Wasting: weight-for-height < -2SD
  if (weightKg != null && heightCm != null) {
    const row = WEIGHT_FOR_HEIGHT_MINUS2SD.find(r => heightCm >= r.minH && heightCm < r.maxH);
    if (row && weightKg < row[sex]) {
      wasting = true;
    }
  }

  // Anemia: hemoglobin below threshold
  if (hemoglobin != null) {
    // WHO thresholds: <11 g/dL for 6-59 months, <11.5 for 5-11 years
    if (ageMonths < 60) {
      anemia = hemoglobin < 11.0;
    } else {
      anemia = hemoglobin < 11.5;
    }
  }

  // Composite score: underweight=2, stunting=2, wasting=2, anemia=1 → max 7
  const nutritionScore =
    (underweight ? 2 : 0) +
    (stunting ? 2 : 0) +
    (wasting ? 2 : 0) +
    (anemia ? 1 : 0);

  const nutritionRisk: "Low" | "Medium" | "High" =
    nutritionScore >= 4 ? "High" : nutritionScore >= 2 ? "Medium" : "Low";

  return { underweight, stunting, wasting, anemia, nutritionScore, nutritionRisk };
}

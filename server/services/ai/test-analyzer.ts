

import { analyzeScreening, type ScreeningAnswers } from "./riskAnalyzer.js";

const DIVIDER = "─".repeat(55);

async function runTest(label: string, answers: ScreeningAnswers) {
  console.log(`\n${DIVIDER}`);
  console.log(`TEST: ${label}`);
  console.log("Answers:", JSON.stringify(answers, null, 2));

  const result = await analyzeScreening(answers);

  console.log("\nResult:");
  console.log(`  riskScore  : ${result.riskScore}`);
  console.log(`  riskLevel  : ${result.riskLevel}`);
  console.log(`  explanation: ${result.explanation}`);

  // Basic assertions
  if (result.riskScore < 0 || result.riskScore > 100) {
    throw new Error(`riskScore out of range: ${result.riskScore}`);
  }
  if (!["Low", "Medium", "High"].includes(result.riskLevel)) {
    throw new Error(`Invalid riskLevel: ${result.riskLevel}`);
  }
  if (!result.explanation || result.explanation.length === 0) {
    throw new Error("explanation is empty");
  }

  console.log("  ✓ All assertions passed");
  return result;
}

(async () => {
  console.log(`\n${"═".repeat(55)}`);
  console.log("ECD Risk Analyzer — Service Test");
  console.log(
    `API key: ${process.env.OPENROUTER_API_KEY ? "SET (LLM mode)" : "NOT SET (fallback mode)"}`
  );
  console.log(`${"═".repeat(55)}`);

  
  const lowRiskResult = await runTest("All answers YES → expect Low risk", {
    q1: "yes",
    q2: "yes",
    q3: "yes",
    q4: "yes",
    q5: "yes",
  });

 
  const highRiskResult = await runTest("All answers NO → expect High risk", {
    q1: "no",
    q2: "no",
    q3: "no",
    q4: "no",
    q5: "no",
  });

m
  await runTest("Mixed (Motor OK, Social/Language partial) → expect Medium", {
    q1: "yes",       // Motor
    q2: "sometimes", // Social
    q3: "yes",       // Nutrition
    q4: "sometimes", // Social
    q5: "no",        // Language
  });


  if (lowRiskResult.riskScore >= highRiskResult.riskScore) {
    throw new Error(
      `Ordering violation: Low score (${lowRiskResult.riskScore}) ` +
      `should be < High score (${highRiskResult.riskScore})`
    );
  }

  console.log(`\n${DIVIDER}`);
  console.log("All tests passed ✓");
  console.log(DIVIDER);
})().catch((err) => {
  console.error("\n✗ Test failed:", err.message);
  process.exit(1);
});

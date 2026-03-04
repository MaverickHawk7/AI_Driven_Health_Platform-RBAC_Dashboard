/**
 * interventionRecommender.ts
 * Generates domain-specific intervention plans with age-appropriate activities.
 * Falls back to a static catalog when the AI is unavailable.
 */

import { callLLM } from "./openRouterClient";

export interface ActivityItem {
  title: string;
  description: string;
  frequency: string;
  duration: string;
}

export interface InterventionPlanResult {
  domain: string;
  activities: ActivityItem[];
  caregiverVersion: string;
  professionalVersion: string;
}

interface GenerateInput {
  patientAgeMonths: number;
  riskLevel: string;
  domain: string;
  domainScore: number;
  answers: Record<string, string>;
}

// Domain mapping from question IDs
const QUESTION_DOMAIN_MAP: Record<string, string> = {
  q1: "motor",
  q2: "social",
  q3: "nutrition",
  q4: "social",
  q5: "speech",
};

// Age groups for fallback catalog
type AgeGroup = "0-12" | "12-24" | "24-36" | "36-60";

function getAgeGroup(months: number): AgeGroup {
  if (months <= 12) return "0-12";
  if (months <= 24) return "12-24";
  if (months <= 36) return "24-36";
  return "36-60";
}

// Static fallback catalog
const FALLBACK_ACTIVITIES: Record<string, Record<AgeGroup, ActivityItem[]>> = {
  speech: {
    "0-12": [
      { title: "Narrate Daily Routines", description: "Talk to the patient during feeding, bathing, and dressing using simple words.", frequency: "Daily", duration: "Throughout the day" },
      { title: "Sing Simple Songs", description: "Sing lullabies and nursery rhymes with repetitive sounds.", frequency: "3x daily", duration: "5 minutes" },
      { title: "Respond to Babbling", description: "When the patient makes sounds, repeat them back and add words.", frequency: "Every interaction", duration: "Ongoing" },
    ],
    "12-24": [
      { title: "Label Objects", description: "Point to and name objects during daily activities. Wait for patient to attempt the word.", frequency: "Daily", duration: "Throughout the day" },
      { title: "Read Picture Books", description: "Read simple picture books aloud, pointing to images and naming them.", frequency: "2x daily", duration: "10 minutes" },
      { title: "Simple Choices", description: "Offer two items and name them — 'Do you want milk or water?'", frequency: "At meals", duration: "5 minutes" },
    ],
    "24-36": [
      { title: "Expand Sentences", description: "When patient says one word, expand it into a short sentence. 'Ball!' → 'Yes, the red ball!'", frequency: "Every interaction", duration: "Ongoing" },
      { title: "Storytelling with Pictures", description: "Use picture books to ask 'What is happening?' and encourage descriptions.", frequency: "Daily", duration: "15 minutes" },
      { title: "Action Songs", description: "Sing songs with actions (Head Shoulders Knees and Toes) to build vocabulary.", frequency: "2x daily", duration: "5 minutes" },
    ],
    "36-60": [
      { title: "Conversation Practice", description: "Have back-and-forth conversations about the patient's day using open-ended questions.", frequency: "Daily", duration: "15 minutes" },
      { title: "Rhyming Games", description: "Play games finding words that rhyme — 'What rhymes with cat?'", frequency: "Daily", duration: "10 minutes" },
      { title: "Story Retelling", description: "After reading a story, ask the patient to tell it back in their own words.", frequency: "Daily", duration: "10 minutes" },
    ],
  },
  social: {
    "0-12": [
      { title: "Face-to-Face Play", description: "Hold the patient close and make exaggerated facial expressions. Play peek-a-boo.", frequency: "4x daily", duration: "5 minutes" },
      { title: "Mirror Games", description: "Hold a mirror so the patient can see their face. Point to eyes, nose, mouth.", frequency: "Daily", duration: "5 minutes" },
      { title: "Responsive Caregiving", description: "Respond promptly to cries and coos. Smile back when the patient smiles.", frequency: "Every interaction", duration: "Ongoing" },
    ],
    "12-24": [
      { title: "Turn-Taking Games", description: "Roll a ball back and forth. Take turns stacking blocks.", frequency: "2x daily", duration: "10 minutes" },
      { title: "Name-Call Response", description: "Call the patient's name from nearby and reward eye contact with a smile or clap.", frequency: "5x daily", duration: "1 minute each" },
      { title: "Parallel Play", description: "Sit beside another person and engage with similar activities. Narrate what each person does.", frequency: "Daily", duration: "15 minutes" },
    ],
    "24-36": [
      { title: "Pretend Play", description: "Play house, tea party, or doctor. Model social phrases like 'please' and 'thank you'.", frequency: "Daily", duration: "15 minutes" },
      { title: "Emotion Naming", description: "Name emotions when the patient experiences them: 'You look happy!' 'I see you're frustrated.'", frequency: "Every interaction", duration: "Ongoing" },
      { title: "Group Activities", description: "Join playgroups or community gatherings where the patient can interact with peers.", frequency: "2-3x weekly", duration: "30 minutes" },
    ],
    "36-60": [
      { title: "Cooperative Games", description: "Play simple board games or team activities that require taking turns and sharing.", frequency: "Daily", duration: "15 minutes" },
      { title: "Role-Playing", description: "Act out social scenarios — greeting someone, asking for help, sharing toys.", frequency: "2x weekly", duration: "15 minutes" },
      { title: "Friendship Skills", description: "Practice approaching other children, asking to play, and handling disagreements.", frequency: "Daily", duration: "Ongoing" },
    ],
  },
  motor: {
    "0-12": [
      { title: "Tummy Time", description: "Place the patient on their tummy on a firm surface to strengthen neck and arm muscles.", frequency: "3-5x daily", duration: "3-5 minutes" },
      { title: "Reaching Games", description: "Hold colorful toys just out of reach to encourage stretching and grasping.", frequency: "3x daily", duration: "5 minutes" },
      { title: "Supported Standing", description: "Hold the patient upright with feet touching the floor to build leg strength.", frequency: "2x daily", duration: "2-3 minutes" },
    ],
    "12-24": [
      { title: "Walking Practice", description: "Hold the patient's hands while they practice walking. Use push toys for support.", frequency: "4x daily", duration: "10 minutes" },
      { title: "Climbing Activities", description: "Provide safe surfaces to climb — cushions, low steps, playground equipment.", frequency: "Daily", duration: "15 minutes" },
      { title: "Ball Play", description: "Roll, throw, and kick soft balls to develop coordination.", frequency: "2x daily", duration: "10 minutes" },
    ],
    "24-36": [
      { title: "Obstacle Courses", description: "Create simple courses with pillows, boxes, and chairs to crawl through, over, and under.", frequency: "Daily", duration: "15 minutes" },
      { title: "Drawing and Stacking", description: "Provide crayons for scribbling and blocks for stacking to develop fine motor skills.", frequency: "2x daily", duration: "10 minutes" },
      { title: "Outdoor Play", description: "Running, jumping, and playing on age-appropriate playground equipment.", frequency: "Daily", duration: "30 minutes" },
    ],
    "36-60": [
      { title: "Balance Activities", description: "Walk on a line, stand on one foot, or use balance boards.", frequency: "Daily", duration: "10 minutes" },
      { title: "Cutting and Threading", description: "Use safety scissors and large beads with string for fine motor development.", frequency: "Daily", duration: "10 minutes" },
      { title: "Active Games", description: "Hopping, skipping, catching and throwing balls at varying distances.", frequency: "Daily", duration: "20 minutes" },
    ],
  },
  cognitive: {
    "0-12": [
      { title: "Object Permanence", description: "Play peek-a-boo and hide toys under a cloth for the patient to find.", frequency: "3x daily", duration: "5 minutes" },
      { title: "Sensory Exploration", description: "Provide safe objects with different textures, sounds, and colors to explore.", frequency: "Daily", duration: "15 minutes" },
      { title: "Cause and Effect", description: "Show how pressing a button makes a sound or how dropping a ball makes it bounce.", frequency: "2x daily", duration: "5 minutes" },
    ],
    "12-24": [
      { title: "Shape Sorting", description: "Use shape sorters to practice matching shapes to holes.", frequency: "Daily", duration: "10 minutes" },
      { title: "Simple Puzzles", description: "Provide 2-4 piece puzzles with knobs for easy grasping.", frequency: "Daily", duration: "10 minutes" },
      { title: "Container Play", description: "Let the patient fill and empty containers with objects. Count items together.", frequency: "Daily", duration: "10 minutes" },
    ],
    "24-36": [
      { title: "Color and Size Sorting", description: "Sort objects by color, size, or shape. Name categories while sorting.", frequency: "Daily", duration: "10 minutes" },
      { title: "Counting Activities", description: "Count everyday objects — steps, fingers, toys during daily routines.", frequency: "Daily", duration: "Throughout the day" },
      { title: "Memory Games", description: "Show 2-3 objects, cover them, remove one, and ask what's missing.", frequency: "Daily", duration: "5 minutes" },
    ],
    "36-60": [
      { title: "Pattern Recognition", description: "Create simple patterns with blocks or beads and ask the patient to continue them.", frequency: "Daily", duration: "10 minutes" },
      { title: "Problem Solving", description: "Present simple challenges — 'How can we get the ball from under the couch?'", frequency: "Daily", duration: "Ongoing" },
      { title: "Categorization", description: "Group objects by use (things we eat with, things we wear) and discuss why.", frequency: "Daily", duration: "10 minutes" },
    ],
  },
  nutrition: {
    "0-12": [
      { title: "Responsive Feeding", description: "Watch for hunger and fullness cues. Never force-feed. Hold during bottle feeding.", frequency: "Every meal", duration: "Ongoing" },
      { title: "Introduce Textures", description: "Gradually introduce mashed, then soft finger foods alongside milk/formula.", frequency: "1-2x daily", duration: "15 minutes" },
      { title: "Family Mealtime", description: "Include the patient at family mealtimes in a highchair to observe eating behaviors.", frequency: "Daily", duration: "20 minutes" },
    ],
    "12-24": [
      { title: "Self-Feeding Practice", description: "Provide finger foods and a small spoon. Allow messy exploration of food.", frequency: "Every meal", duration: "20 minutes" },
      { title: "Food Variety", description: "Offer at least 4 food groups daily. Introduce new foods alongside familiar ones.", frequency: "Daily", duration: "At meals" },
      { title: "Cup Drinking", description: "Practice drinking from an open cup with small amounts of liquid.", frequency: "At meals", duration: "During meals" },
    ],
    "24-36": [
      { title: "Food Exploration", description: "Let the patient help wash vegetables, stir ingredients, and choose between healthy options.", frequency: "Daily", duration: "10 minutes" },
      { title: "Structured Mealtimes", description: "Eat at regular times with the family. Limit distractions (no screens).", frequency: "3 meals + 2 snacks", duration: "20 minutes each" },
      { title: "Name Nutrients", description: "Talk about what foods do: 'Milk makes bones strong. Oranges help fight germs.'", frequency: "At meals", duration: "During meals" },
    ],
    "36-60": [
      { title: "Meal Preparation", description: "Involve the patient in age-appropriate cooking tasks — washing, mixing, serving.", frequency: "Daily", duration: "15 minutes" },
      { title: "Healthy Choices", description: "Teach the patient to choose between healthy options. Avoid using food as reward.", frequency: "At meals", duration: "Ongoing" },
      { title: "Growth Monitoring", description: "Track weight and height monthly. Discuss growth with the patient in positive terms.", frequency: "Monthly", duration: "15 minutes" },
    ],
  },
};

const SYSTEM_PROMPT = `\
You are a JSON API for a patient health care and detection program.
You output ONLY raw JSON — never explain, never use markdown.

Your task: generate 3-5 age-appropriate intervention activities for a specific developmental domain.

RESPOND WITH EXACTLY THIS JSON FORMAT:
{
  "activities": [
    {"title": "Short Title", "description": "Clear description of the activity", "frequency": "How often", "duration": "How long"},
  ],
  "caregiverVersion": "Simple-language summary for the caregiver (max 200 chars)",
  "professionalVersion": "Clinical-language summary for health workers (max 300 chars)"
}

Guidelines:
- Activities must be culturally sensitive and feasible in low-resource settings
- Use simple, actionable language for caregiverVersion
- Use clinical terminology for professionalVersion
- Tailor activities to the patient's age group
- Consider the severity of the risk when recommending intensity`;

function buildUserMessage(input: GenerateInput): string {
  return `Generate intervention activities for:
- Domain: ${input.domain}
- Patient age: ${input.patientAgeMonths} months
- Risk level: ${input.riskLevel}
- Domain risk score: ${input.domainScore}/100 (higher = more risk)

Screening answers: ${JSON.stringify(input.answers)}`;
}

function getFallbackPlan(domain: string, ageMonths: number, riskLevel: string): InterventionPlanResult {
  const ageGroup = getAgeGroup(ageMonths);
  const domainKey = domain.toLowerCase();
  const activities = FALLBACK_ACTIVITIES[domainKey]?.[ageGroup] || FALLBACK_ACTIVITIES.cognitive[ageGroup];

  const severityWord = riskLevel === "High" ? "urgently" : "regularly";

  return {
    domain,
    activities,
    caregiverVersion: `The patient needs ${severityWord} support in ${domain}. Follow the activities listed to help improve outcomes. Perform them every day as part of the routine.`,
    professionalVersion: `${riskLevel}-risk ${domain} concern identified in ${ageMonths}-month patient. ${activities.length} structured activities prescribed. ${riskLevel === "High" ? "Specialist referral recommended alongside care activities." : "Reassess at next scheduled visit."}`,
  };
}

export async function generateInterventionPlan(input: GenerateInput): Promise<InterventionPlanResult> {
  try {
    const userMessage = buildUserMessage(input);
    const { content } = await callLLM(SYSTEM_PROMPT, userMessage);

    const cleaned = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(cleaned);

    if (!parsed.activities || !Array.isArray(parsed.activities) || parsed.activities.length === 0) {
      throw new Error("Invalid AI response: missing activities array");
    }

    return {
      domain: input.domain,
      activities: parsed.activities.slice(0, 5).map((a: any) => ({
        title: String(a.title || "Activity"),
        description: String(a.description || ""),
        frequency: String(a.frequency || "Daily"),
        duration: String(a.duration || "10 minutes"),
      })),
      caregiverVersion: String(parsed.caregiverVersion || "").slice(0, 200),
      professionalVersion: String(parsed.professionalVersion || "").slice(0, 300),
    };
  } catch (err) {
    console.error(`[interventionRecommender] AI call failed for domain=${input.domain}, using fallback:`, err);
    return getFallbackPlan(input.domain, input.patientAgeMonths, input.riskLevel);
  }
}

/**
 * Generate intervention plans for all flagged domains in a screening.
 * Returns one plan per domain that scored above the threshold.
 */
export async function generateAllInterventionPlans(
  patientAgeMonths: number,
  riskLevel: string,
  answers: Record<string, string>,
  domainScores?: Record<string, number>,
): Promise<InterventionPlanResult[]> {
  // Determine which domains need intervention
  const flaggedDomains: Array<{ domain: string; score: number }> = [];

  if (domainScores) {
    for (const [domain, score] of Object.entries(domainScores)) {
      if (domain === "cognitive") continue; // cognitive is computed average
      if (score >= 40) { // score >= 40 means "sometimes" or worse
        flaggedDomains.push({ domain, score });
      }
    }
  } else {
    // Derive from answers directly
    const domainAnswers: Record<string, string[]> = {};
    for (const [qId, answer] of Object.entries(answers)) {
      const domain = QUESTION_DOMAIN_MAP[qId];
      if (domain) {
        if (!domainAnswers[domain]) domainAnswers[domain] = [];
        domainAnswers[domain].push(answer);
      }
    }
    for (const [domain, answerList] of Object.entries(domainAnswers)) {
      const hasRisk = answerList.some(a => a === "no" || a === "sometimes");
      if (hasRisk) {
        const score = answerList.reduce((sum, a) => sum + (a === "no" ? 100 : a === "sometimes" ? 40 : 0), 0) / answerList.length;
        flaggedDomains.push({ domain, score });
      }
    }
  }

  if (flaggedDomains.length === 0) return [];

  // Generate plans in parallel
  const plans = await Promise.all(
    flaggedDomains.map(({ domain, score }) =>
      generateInterventionPlan({
        patientAgeMonths,
        riskLevel,
        domain,
        domainScore: score,
        answers,
      })
    )
  );

  return plans;
}

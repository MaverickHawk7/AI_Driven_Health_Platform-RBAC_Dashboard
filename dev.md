# ICDS ECD Platform — Phase Implementation Plan

> 7-phase sequential implementation to integrate the full ECD dataset model.
> Each phase builds on the previous. No phase should be started until the prior is complete and tested.

---

## Status Tracker

| Phase | Name | Status | Commit |
|-------|------|--------|--------|
| 1 | Schema & Registration Foundation | Complete | — |
| 2 | Nutrition Module | Complete | — |
| 3 | Environment & Caregiving | Complete | — |
| 4 | Enhanced Screening & Risk Scoring | Complete | — |
| 5 | Referral System | Complete | — |
| 6 | Outcome Tracking | Complete | — |
| 7 | Dashboard Enhancements, ML & Cleanup | Complete | — |

## Dataset Profile (1000 records, 14 sheets)

- **Registration:** M:518 F:482 | 4 districts (Chittoor, Guntur, Eluru, Visakhapatnam) | Age 1-71mo
- **Assessment cycles:** 580 Baseline, 317 Follow-up, 103 Re-screen
- **Delays:** LC most common (182/1000), GM (146), SE (137), FM (115), COG (100)
- **Autism:** 742 Low, 212 Moderate, 46 High
- **ADHD:** 798 Low, 161 Moderate, 41 High
- **Nutrition risk:** 453 Low, 465 Medium, 82 High | Anemia most prevalent (268)
- **Behaviour concerns:** Sleep (95), ADHD (95), Feeding (76), Aggression (44)
- **Baseline risk:** 713 Low, 279 Medium, 8 High
- **Outcomes:** 472 Improved, 430 Same, 98 Worsened | 146 exited high risk
- **Referral types:** PHC (194), RBSK (173), NRC/Parent (165 each), DEIC (162), AWW (141)
- **ML viability:** Balanced classes, sufficient volume for Random Forest/XGBoost

---

## Phase 1: Schema & Registration Foundation

**Goal:** Extend patient data model to match dataset. All subsequent phases depend on these fields existing.

**Database Changes:**
- `patients` table additions:
  - `dob` (date, nullable — backfill ageMonths for existing patients)
  - `gender` (enum: male | female, nullable for existing data)
  - `modeDelivery` (enum: vaginal | c_section, nullable)
  - `modeConception` (enum: natural | art, nullable)
  - `birthStatus` (enum: term | preterm | post_term, nullable)
  - `consanguinity` (boolean, default false)
- Auto-calculate `ageMonths` from `dob` when dob is present (utility function)
- Keep `ageMonths` as stored field for backward compat (updated on read or via trigger)

**Frontend Changes:**
- `RegisterPatient.tsx` — Add to Step 2:
  - Date of Birth picker (auto-fills age)
  - Gender selector (Male / Female)
- `RegisterPatient.tsx` — Add Step 3: "Birth History"
  - Mode of delivery, conception, birth status, consanguinity
  - All optional (AWW may not know)
- `PatientProfile.tsx` — Display new fields in demographics section

**Key Rules:**
- All new fields are NULLABLE (existing patients won't have them)
- Gender and DOB should be encouraged but not forced
- Birth history is entirely optional
- DO NOT touch screening, AI, or intervention code in this phase

**Cleanup:**
- Remove `LEGACY_QUESTIONS` (q1-q5) from `riskAnalyzer.ts`
- Remove `legacyFallbackRisk()` function
- Remove `LEGACY_DOMAIN_MAP` and `LEGACY_SCORE_DOMAINS` from `AIResults.tsx`
- Remove legacy domain handling from `routes.ts` domain score computation
- (Only if no screenings in DB use q1-q5 format — check first)

**Validation Checklist:**
- [x] Existing patients still load correctly (nullable fields)
- [x] New patient registration captures DOB, gender, birth history
- [x] Age auto-calculates from DOB
- [x] Patient profile displays new fields
- [ ] No regressions in screening flow (verify after deploy)
- [ ] Legacy q1-q5 cleanup deferred to Phase 7 (need DB verification)

---

## Phase 2: Nutrition Module

**Goal:** Add anthropometric data capture and WHO growth standard calculations.

**Depends on:** Phase 1 (needs gender and DOB for WHO z-score calculations)

**Database Changes:**
- NEW TABLE `nutritionAssessments`:
  - `id` serial PK
  - `patientId` FK → patients
  - `screeningId` FK → screenings (nullable, can be standalone)
  - `weightKg` decimal (e.g., 12.5)
  - `heightCm` decimal (e.g., 85.0)
  - `muacCm` decimal (nullable, mid-upper arm circumference)
  - `hemoglobin` decimal (nullable, g/dL)
  - `underweight` boolean (calculated: weight-for-age z-score < -2)
  - `stunting` boolean (calculated: height-for-age z-score < -2)
  - `wasting` boolean (calculated: weight-for-height z-score < -2)
  - `anemia` boolean (calculated: Hb below age/gender threshold)
  - `nutritionScore` integer (composite: underweight=2, stunting=2, wasting=2, anemia=1 → 0-7)
  - `nutritionRisk` enum: Low (0-1) | Medium (2-3) | High (4+)
  - `assessedByUserId` FK → users
  - `assessedAt` timestamp
  - `createdAt` timestamp

**Backend Changes:**
- New API routes:
  - `POST /api/nutrition-assessments` — create assessment
  - `GET /api/nutrition-assessments?patientId=X` — list for patient
- WHO z-score calculation utility:
  - Uses age (from DOB), gender, weight, height
  - Simplified lookup tables (not full WHO dataset — use thresholds)
  - Weight-for-age, Height-for-age, Weight-for-height
  - Anemia thresholds: <11 g/dL (6-59mo), <11.5 (5-11yr)
- Auto-calculate flags on create (server-side, not client)

**Frontend Changes:**
- NEW component: `NutritionAssessmentForm.tsx`
  - Weight (kg), Height (cm), MUAC (cm), Hemoglobin (g/dL)
  - Real-time calculation preview (shows flags as you type)
  - Submit creates assessment
- Embed in `ConductScreening.tsx` as new step between Patient/Consent and Tier 1
  - Step flow: Patient → **Nutrition** → T1 → T2 → Behaviour → Photo → Results
  - Optional — can skip if data not available
- Add to `AIResults.tsx`: Nutrition Risk Card
  - Shows underweight/stunting/wasting/anemia flags
  - Nutrition score and risk level
  - Color-coded (green/amber/red)
- Add to `PatientProfile.tsx`: Nutrition History tab
  - Table of all nutrition assessments over time
  - Weight/height trend chart (simple line chart)

**Key Rules:**
- Nutrition assessment is OPTIONAL in screening flow (can skip)
- Can also be done standalone (not tied to screening)
- z-score calculation is simplified (threshold-based, not interpolation)
- Server calculates all flags — client only sends raw measurements
- DO NOT modify AI analysis or risk scoring in this phase

**Validation Checklist:**
- [x] Nutrition form captures weight/height/MUAC/Hb
- [x] Server correctly calculates underweight/stunting/wasting/anemia
- [x] Nutrition card appears in AI Results when data present
- [x] Patient profile shows nutrition history tab
- [x] Screening flow works with and without nutrition step
- [ ] Existing screenings (no nutrition) still display correctly (verify after deploy)

---

## Phase 3: Environment & Caregiving Assessment

**Goal:** Capture home environment factors that affect child development.

**Depends on:** Phase 1 (patient schema)

**Database Changes:**
- NEW TABLE `environmentAssessments`:
  - `id` serial PK
  - `patientId` FK → patients
  - `parentChildInteraction` integer (0-10 scale)
  - `parentMentalHealth` integer (0-10 scale, higher = more concerns)
  - `homeStimulation` integer (0-10 scale)
  - `playMaterials` boolean
  - `caregiverEngagement` enum: Low | Medium | High
  - `languageExposure` enum: Adequate | Inadequate
  - `safeWater` boolean
  - `toiletFacility` boolean
  - `assessedByUserId` FK → users
  - `assessedAt` timestamp
  - `createdAt` timestamp

**Backend Changes:**
- New API routes:
  - `POST /api/environment-assessments` — create
  - `GET /api/environment-assessments?patientId=X` — list for patient
- Environment risk calculation:
  - Composite score from all factors
  - Flag high-risk environments (mental health > 7, no safe water, low stimulation)

**Frontend Changes:**
- NEW component: `EnvironmentAssessmentForm.tsx`
  - Slider/number inputs for scores (0-10)
  - Toggle switches for boolean fields
  - Dropdown for engagement/language exposure
  - Designed for home visit context (field worker at patient's home)
- NOT embedded in screening flow (separate workflow)
  - Accessible from Patient Profile → "Record Home Visit"
  - Or from Field Worker dashboard → "Home Visits"
- Add to `PatientProfile.tsx`: Environment tab
  - Latest assessment summary
  - History of assessments
  - Visual: simple radar chart of environment factors
- Add to `AIResults.tsx`: Environment context card (if assessment exists)
  - "Home environment: 3 risk factors identified"
  - Links to full environment assessment

**Key Rules:**
- Environment assessment is a SEPARATE workflow from screening
- Done during home visits, not at AWC
- Can be done without a screening (standalone)
- Frequency: once per quarter recommended
- DO NOT feed into AI risk scoring yet (that's Phase 4)

**Validation Checklist:**
- [x] Environment form captures all fields
- [x] Accessible from patient profile
- [x] History displays correctly
- [x] Works independently from screening
- [ ] No impact on existing screening flow (verify after deploy)

---

## Phase 4: Enhanced Screening & Risk Scoring

**Goal:** Add behaviour checklist, ADHD detection, DQ scores, and deterministic risk formula.

**Depends on:** Phase 1 (gender, DOB), Phase 2 (nutrition data), Phase 3 (environment data)

**Database Changes:**
- `screenings` table additions:
  - `behaviourConcerns` text (nullable — "sleep", "aggression", "feeding", etc.)
  - `behaviourScore` integer (nullable, 0-20)
  - `behaviourRiskLevel` enum: Low | Medium | High (nullable)
  - `autismRisk` enum: Low | Moderate | High (nullable)
  - `adhdRisk` enum: Low | Moderate | High (nullable)
  - `developmentalStatus` text (nullable — "No Delay", "1 delay", "2 delays", etc.)
  - `formulaRiskScore` integer (nullable — deterministic formula score)
  - `formulaRiskCategory` enum: Low | Medium | High (nullable)
  - `gmDQ` decimal (nullable — Gross Motor developmental quotient)
  - `fmDQ` decimal (nullable — Fine Motor DQ)
  - `lcDQ` decimal (nullable — Language/Communication DQ)
  - `cogDQ` decimal (nullable — Cognitive DQ)
  - `seDQ` decimal (nullable — Social-Emotional DQ)
  - `compositeDQ` decimal (nullable)

**Backend Changes:**
- New in `riskAnalyzer.ts`:
  - `computeFormulaScore()` — deterministic scoring:
    - Each domain delay: +5
    - Autism High: +15, Moderate: +8
    - ADHD High: +8, Moderate: +4
    - Behaviour High: +7
    - Result: ≤10 Low | 11-25 Medium | >25 High
  - ADHD detection in `ruleBasedPatternDetection()`:
    - Based on: attention/emotional regulation + behaviour score
  - Update `CONDITION_PROMPT` to include ADHD evaluation
  - Feed nutrition risk + environment risk into AI context (if available)
- Behaviour scoring logic:
  - Sleep issues: +3, Aggression: +4, Feeding: +2, Other: +2
  - Behaviour risk: ≤5 Low | 6-10 Moderate | >10 High
- DQ calculation (if clinical data available):
  - DQ = (developmental_age / chronological_age) × 100
  - This is OPTIONAL — only if professional assessment data entered
  - For AWW-level: use delay flags (0/1) instead of DQ scores

**Frontend Changes:**
- `ConductScreening.tsx` — Add behaviour checklist step:
  - Step flow: Patient → Nutrition → T1 → T2 → **Behaviour** → Photo → Results
  - Checkboxes: Sleep issues, Aggression, Feeding difficulties, Tantrums, Other
  - Auto-calculates behaviour score
- `AIResults.tsx` modifications:
  - Show BOTH scores: "AI Score: 65" AND "Formula Score: 23 (Medium)"
  - Add ADHD to pattern analysis card
  - Add behaviour risk indicator
  - Show developmental status ("2 delays identified")
- Update `conditionIndicators` display to include ADHD

**Key Rules:**
- Formula score is ALWAYS calculated (deterministic, no AI needed)
- AI score continues as-is (provides insights, explanations)
- Both scores displayed side-by-side for transparency
- DQ scores are OPTIONAL (professional assessment level)
- Behaviour checklist is quick (< 1 minute) — don't make screening too long
- ADHD detection uses same combine-rule-based-and-AI pattern as autism

**Validation Checklist:**
- [x] Behaviour checklist captures concerns and calculates score
- [x] Formula risk score calculates correctly
- [x] Both AI and formula scores display in results
- [x] ADHD appears in pattern analysis when detected
- [ ] Existing screenings (no behaviour data) still work (verify after deploy)
- [x] Nutrition + environment context fed to AI when available

---

## Phase 5: Referral System

**Goal:** Structured referral tracking with auto-trigger logic.

**Depends on:** Phase 4 (risk scores, condition indicators needed for auto-referral logic)

**Database Changes:**
- NEW TABLE `referrals`:
  - `id` serial PK
  - `patientId` FK → patients
  - `screeningId` FK → screenings (nullable)
  - `referralTriggered` boolean (auto vs manual)
  - `referralType` enum: PHC | NRC | DEIC | RBSK | AWW_Intervention | Parent_Intervention
  - `referralReason` enum: GDD | Autism | ADHD | Behaviour | Environment | Domain_Delay | Nutrition
  - `referralStatus` enum: Pending | Under_Treatment | Completed
  - `referredByUserId` FK → users
  - `referredAt` timestamp
  - `completedAt` timestamp (nullable)
  - `notes` text (nullable)
  - `createdAt` timestamp

**Backend Changes:**
- New API routes:
  - `POST /api/referrals` — create referral
  - `GET /api/referrals?patientId=X` — list for patient
  - `GET /api/referrals?status=Pending` — list by status (supervisor view)
  - `PATCH /api/referrals/:id` — update status
- Auto-referral logic (runs after screening):
  - High Risk (any trend) → auto-create referral to RBSK/DEIC
  - Autism indicators ≥ 40% → auto-create referral to DEIC
  - Nutrition High Risk → auto-create referral to NRC
  - Behaviour High → auto-create referral to PHC
  - Medium Risk + no improvement after 2 screenings → escalate to PHC
- Referral replaces current auto-intervention creation for High Risk
  - Current: `if (riskLevel === "High") → createIntervention()`
  - New: `if (riskLevel === "High") → createReferral() + createIntervention()`

**Frontend Changes:**
- NEW page: `ReferralManagement.tsx`
  - Table: patient name, referral type, reason, status, date
  - Filter by: type, status, center
  - Status update buttons: Pending → Under Treatment → Completed
  - Accessible to: supervisor, cdpo, admin
- Add to sidebar:
  - Supervisor: "Referrals" menu item
  - CDPO: "Referrals" menu item
- `PatientProfile.tsx` — Add Referrals tab:
  - List all referrals for this patient
  - Status badges (color-coded)
  - Field worker can view but not modify
- `AIResults.tsx` — Add Referral Recommendation card:
  - "Based on screening results, referral to DEIC is recommended"
  - Auto-referral indicator if triggered
  - Links to referral management
- Add to `Sidebar.tsx` navigation for supervisor/cdpo roles

**Key Rules:**
- Auto-referrals are SUGGESTIONS — supervisor can override
- Field workers can VIEW referrals but not create/modify (supervisor+ only)
- Multiple referrals per patient allowed (different reasons)
- Referral status changes generate audit log entries
- Referral completion links to outcome tracking (Phase 6)
- DO NOT remove existing intervention auto-creation — referral is IN ADDITION

**Validation Checklist:**
- [x] Auto-referral triggers on high risk screening
- [x] Referral management page lists and filters correctly
- [x] Status updates work (Pending → Under Treatment → Completed)
- [x] Patient profile shows referral history
- [x] AI Results shows referral recommendation
- [x] Existing intervention flow unaffected
- [x] Audit logging for referral changes

---

## Phase 6: Outcome Tracking

**Goal:** Close the feedback loop — measure intervention effectiveness.

**Depends on:** Phase 5 (referral completion), Phase 4 (risk scores for comparison)

**Database Changes:**
- NEW TABLE `outcomeTracking`:
  - `id` serial PK
  - `patientId` FK → patients
  - `baselineScreeningId` FK → screenings
  - `followupScreeningId` FK → screenings
  - `reductionInDelayMonths` integer (0+)
  - `domainImprovement` boolean
  - `autismRiskChange` enum: Improved | Same | Worsened
  - `exitHighRisk` boolean
  - `improvementStatus` enum: Improved | Same | Worsened
  - `homeActivitiesAssigned` integer (count)
  - `followupConducted` boolean
  - `assessedByUserId` FK → users
  - `assessedAt` timestamp
  - `createdAt` timestamp

**Backend Changes:**
- New API routes:
  - `POST /api/outcomes` — record outcome
  - `GET /api/outcomes?patientId=X` — list for patient
  - `GET /api/outcomes/summary` — aggregate stats (for dashboards)
- Auto-populate some fields:
  - Compare baseline vs follow-up screening scores
  - `exitHighRisk` = baseline was High AND latest is not High
  - `domainImprovement` = any domain score improved
  - `improvementStatus` = overall risk trend
- Outcome recording triggered when:
  - Follow-up screening completed (auto-calculate from score delta)
  - Manual entry by supervisor (for clinical assessment data)

**Frontend Changes:**
- NEW component: `OutcomeRecordForm.tsx`
  - Auto-filled fields (from screening comparison)
  - Manual override fields (delay reduction months, clinical notes)
  - Supervisor-only access
- `PatientProfile.tsx` — Add Outcomes tab:
  - Timeline: baseline → interventions → follow-ups → outcomes
  - Visual: improvement trajectory
  - Key metrics: delay reduction, risk change, exit high risk
- `PatientProgress.tsx` — Enhance with outcome data:
  - Add outcome milestones to progress chart
  - Show intervention effectiveness metrics

**Key Rules:**
- Auto-calculation from screening deltas where possible
- Manual entry for clinical data (delay reduction months)
- Supervisor+ access only for recording outcomes
- Outcome is tied to baseline-followup PAIR (not standalone)
- `reductionInDelayMonths` requires professional assessment — default to 0 if unknown
- This data feeds the predictive analyzer (future improvement)

**Validation Checklist:**
- [x] Outcome auto-calculates from screening comparison
- [x] Manual outcome recording works
- [x] Patient profile shows outcome history
- [x] Progress page shows outcome milestones
- [x] Only supervisor+ can record outcomes
- [x] Existing progress tracking still works

---

## Phase 7: Dashboard Enhancements & Cleanup

**Goal:** Surface all new data in dashboards. Final cleanup.

**Depends on:** All previous phases (aggregates data from phases 1-6)

**No new tables.** This phase is pure frontend + API aggregation.

**Backend Changes:**
- New aggregation endpoints:
  - `GET /api/stats/nutrition` — % underweight, stunted, wasted, anemic by center/block
  - `GET /api/stats/referrals` — referral pipeline counts by status/type
  - `GET /api/stats/outcomes` — % improved, % exited high risk, avg delay reduction
  - `GET /api/stats/environment` — average environment scores by center
- Enhance existing stats endpoints with new data

**Frontend Changes:**
- `SupervisorDashboard.tsx`:
  - ➕ Nutrition overview card (% underweight/stunted in cohort)
  - ➕ Referral pipeline card (pending/in-treatment/completed counts)
  - ➕ Outcome metrics card (% improved, avg delay reduction)
  - ➕ Environment risk summary
- `CDPODashboard.tsx`:
  - ➕ Block-level nutrition comparison
  - ➕ Referral completion rates by center
  - ➕ Program effectiveness (outcome aggregates)
- `DWCWEODashboard.tsx`:
  - ➕ District nutrition heatmap
  - ➕ Cross-block comparisons
- `HODashboard.tsx`:
  - ➕ State-level nutrition/outcome statistics
  - ➕ District-level comparison tables
- `AnalyticsPage.tsx`:
  - ➕ Intervention effectiveness charts
  - ➕ Outcome trends over time
  - ➕ Nutrition trend analysis

**Cleanup Tasks:**
- Remove any dead code from legacy screening
- Verify all new fields display in caregiver mode (simplified language)
- Verify i18n coverage for new UI text (English + Telugu)
- Verify offline/PWA behavior with new forms
- Performance check: ensure new dashboard queries are cached (Redis)
- Update seed data to include sample nutrition/environment/referral/outcome records

**Validation Checklist:**
- [x] All dashboard cards show real data
- [ ] Caching works for new aggregation endpoints (verify after deploy)
- [ ] Caregiver mode labels correct for new features (verify after deploy)
- [ ] Telugu translations added for new strings (deferred — add as needed)
- [ ] Seed data includes representative samples (deferred)
- [ ] No broken pages or missing data edge cases (verify after deploy)
- [x] Full end-to-end flow: register → screen → nutrition → environment → referral → outcome

---

## Cross-Phase Rules

1. **Nullable everything new** — existing data must never break
2. **One commit per sub-feature** — not one giant commit per phase
3. **Test backward compat** — old screenings, old patients must still work
4. **No AI prompt changes until Phase 4** — keep AI stable while building data layer
5. **No dashboard changes until Phase 7** — build data first, visualize last
6. **Caregiver mode** — every new UI element needs a simplified version
7. **i18n** — add translation keys for every new user-facing string
8. **Audit logging** — every new create/update/delete action must be logged

---

## Architecture Notes

**Current data flow:**
```
Register → Screen (M-CHAT) → AI Analysis → Intervention Plan → Activity Log
```

**Target data flow after all phases:**
```
Register (+ DOB, gender, birth history)
  → Screen (M-CHAT + Behaviour checklist)
  → Nutrition Assessment (anthropometrics)
  → AI Analysis (+ formula score + ADHD + nutrition context)
  → Pattern Detection (autism + ADHD + speech + sensory + behavioural)
  → Auto-Referral (based on risk + condition indicators)
  → Intervention Plan (informed by all data)
  → Activity Log (home activities tracking)
  → Follow-up Screening (reassessment)
  → Outcome Tracking (delay reduction, risk change)
  → Dashboard (program effectiveness metrics)

Parallel workflow:
  → Environment Assessment (home visits, quarterly)
```

**Tables after all phases:**
```
EXISTING (modified):     NEW:
- patients (+ 6 fields)  - nutritionAssessments
- screenings (+ 12 fields) - environmentAssessments
- users (no change)       - referrals
- centers (no change)     - outcomeTracking
- interventions (no change)
- interventionPlans (no change)
- activityLogs (no change)
- consentRecords (no change)
- auditLogs (no change)
- alerts (no change)
- messages (no change)
```

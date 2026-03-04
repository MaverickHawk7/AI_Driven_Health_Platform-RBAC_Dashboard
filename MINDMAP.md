# ECD Dashboard - Platform Mind Map

```
                                    ECD DASHBOARD
                     Early Childhood Development Screening Platform
                 Community health tool for developmental delay detection
                           in children aged 0-60 months
                                        |
          ______________________________|______________________________
         |                              |                              |
    WHAT IT IS                   WHAT'S BUILT                  WHAT'S MISSING
         |                              |                     (for deployment)
         |                              |                              |
   [See Section 1]              [See Section 2]               [See Section 3]
```

---

## Section 1: WHAT THE PLATFORM IS

```
                              THE PLATFORM
                                  |
        __________________________|__________________________
       |                |                |                   |
   PURPOSE          USERS           TECH STACK          DATA FLOW
       |                |                |                   |
  Screen children   4 Roles:        Frontend:           Register Patient
  for developmental  - Field Worker   React 18              |
  delays using       - Supervisor     Tailwind CSS      Record Consent
  AI-assisted        - Program Owner  shadcn/ui              |
  questionnaires     - Admin          Recharts          Conduct Screening
  + photo analysis       |            Wouter                 |
       |                 |                |             AI Risk Analysis
  Generate           Field Workers:  Backend:           (LLM or Rule-based)
  intervention       conduct          Express 5              |
  plans for          screenings,      Passport.js       Generate Intervention
  caregivers and     register         Drizzle ORM       Plans (5 domains)
  professionals      patients         Redis (optional)       |
       |                 |                |             Track Progress
  Track child        Supervisors:    Database:          Over Time
  progress over      oversee cases,   PostgreSQL             |
  time across        manage alerts,   (or in-memory)    Alerts + Reports
  5 developmental    review workers       |
  domains                |            AI Layer:
       |             Program Owners:  OpenRouter LLM
  Alert system       view KPIs,       (free model rotation)
  for at-risk        district reports  Gemma/Mistral/
  children               |            Deepseek/Nemotron
                     Admins:
                     manage users,
                     audit logs,
                     system config
```

---

## Section 2: WHAT'S BEEN BUILT (Feature Map)

```
                              BUILT FEATURES
                                    |
     _______________________________|_________________________________
    |            |            |            |            |              |
 AUTH &       PATIENT      SCREENING    AI ENGINE   DASHBOARDS    SYSTEM
 USERS        MGMT        PIPELINE                 & REPORTS     INFRA
    |            |            |            |            |              |
    |            |            |            |            |              |
 [COMPLETE]  [COMPLETE]   [COMPLETE]   [COMPLETE]  [MOSTLY]      [COMPLETE]
```

### Auth & Users [COMPLETE]
```
Auth & Users
    |
    |-- Login / Register page (tabbed UI)
    |-- Passport.js local strategy
    |-- bcrypt password hashing (salt: 10)
    |-- 24h session cookies (httpOnly, sameSite: lax)
    |-- Redis sessions (optional) OR MemoryStore fallback
    |-- Role-based route guards (ProtectedRoute component)
    |-- Admin: create/edit/delete users, prevent last-admin removal
    '-- SafeUser type (password field stripped from responses)
```

### Patient Management [COMPLETE]
```
Patient Management
    |
    |-- Register Patient (name, age, caregiver, contact, address)
    |-- Patient List with search + risk-level filtering
    |-- Patient Profile (tabbed: Screenings, Interventions, Plans, Consent)
    |-- Latest risk level badge on list view
    '-- registeredByUserId tracking for audit trail
```

### Screening Pipeline [COMPLETE]
```
Screening Pipeline
    |
    |-- 4-Step Flow:
    |     Step 1: Select Patient + Verify Consent
    |     Step 2: 5 Screening Questions (Motor, Social, Nutrition, Language)
    |     Step 3: Optional Photo Capture (consent-gated)
    |     Step 4: AI Results Display
    |
    |-- Consent Gates:
    |     Screening requires active "screening" consent
    |     Photo requires active "photo_analysis" consent
    |     Blocked requests logged to audit trail
    |
    |-- Domain Scoring: motor, social, language, nutrition, cognitive
    |-- Screening Types: baseline, reassessment_3m, reassessment_6m, ad_hoc
    |-- Baseline tracking (first screening linked to reassessments)
    '-- Auto-creates intervention if High Risk
```

### AI Engine [COMPLETE with fallbacks]
```
AI Engine
    |
    |-- Risk Analyzer
    |     LLM: structured JSON prompt -> riskScore, riskLevel, explanation
    |     Fallback: rule-based ("no"=20pts, "sometimes"=8pts, social/lang 1.5x)
    |
    |-- Vision Analyzer (Photo)
    |     LLM: detects Down Syndrome facial indicators (8 features)
    |     Output: detected/not_detected/inconclusive + confidence score
    |     Fallback: returns "inconclusive"
    |     Non-diagnostic disclaimers included
    |
    |-- Intervention Recommender
    |     LLM: generates domain-specific plans with activities
    |     5 domains x 4 age groups = 20 plan variants
    |     Caregiver version (simple) + Professional version (clinical)
    |     Fallback: 100+ static pre-written activities
    |
    '-- OpenRouter Client
          Free model rotation (Gemma 3 -> Mistral -> Deepseek -> Nemotron)
          Auto-retry on 429 rate limits
          Graceful degradation: AI failure never blocks screening
```

### Dashboards & Reports [MOSTLY COMPLETE]
```
Dashboards & Reports
    |
    |-- Supervisor Dashboard [COMPLETE]
    |     Real-time risk metrics (4 KPI cards)
    |     Case prioritization table (sorted by risk score)
    |     Follow-up calendar (overdue reassessments)
    |     Active alerts summary
    |
    |-- KPI Dashboard [COMPLETE]
    |     Risk distribution pie chart
    |     Monthly screenings bar chart
    |     Worker performance table
    |     Risk trends line chart
    |
    |-- Field Workers List [STUB - DEMO DATA ONLY]
    |     4 hardcoded demo workers
    |     No real database integration
    |     No CRUD operations
    |
    |-- Alerts Dashboard [COMPLETE]
    |     Severity cards (Critical/High/Medium/Low)
    |     Filter by status + severity
    |     Acknowledge / Resolve / Dismiss actions
    |
    |-- District Reports [COMPLETE]
    |     Date range selection
    |     Summary metrics + worker performance
    |     Intervention effectiveness
    |     Risk trends over time
    |     CSV export
    |
    '-- Patient Progress [COMPLETE]
          Longitudinal tracking (baseline vs latest)
          Improvement index calculation
          Domain score delta charts
          Risk trajectory line chart
```

### System Infrastructure [COMPLETE]
```
System Infrastructure
    |
    |-- Consent Management
    |     4 consent types: screening, photo_analysis, data_sharing, research
    |     3 methods: digital_signature, verbal_witnessed, paper_scanned
    |     Expiry dates + revocation
    |     Guardian name, relationship, witness tracking
    |
    |-- Alert Engine (fire-and-forget)
    |     high_risk_detected (score >= 75)
    |     no_improvement (risk didn't decrease)
    |     missed_followup (>90 days overdue)
    |     supervisor_escalation (2+ critical alerts)
    |     Deduplication built in
    |
    |-- Audit Logging (fire-and-forget)
    |     All mutations logged: create, update, delete, revoke, block
    |     Records: userId, action, resourceType, resourceId, details, IP
    |
    |-- Redis Caching (optional)
    |     Stats: 1h TTL | Reports: 4h | Patients/Alerts: 5min
    |     Auto-invalidation on mutations
    |     Graceful fallback: app runs without Redis
    |
    |-- Database
    |     PostgreSQL via Drizzle ORM (or in-memory for dev)
    |     10 tables: users, patients, screenings, interventions,
    |     interventionPlans, activityLogs, consentRecords, alerts,
    |     alertThresholds, auditLogs, systemConfig
    |
    '-- Seed Data
          Auto-seeds on empty DB: 4 users, 2 patients, 2 screenings, 1 intervention
```

---

## Section 3: WHAT'S MISSING FOR DEPLOYMENT

```
                           DEPLOYMENT GAPS
                                 |
     ____________________________|____________________________
    |              |              |              |             |
 CRITICAL      SECURITY       DATA           UX/UI       OPERATIONAL
 BLOCKERS      HARDENING     COMPLIANCE      GAPS          GAPS
    |              |              |              |             |
```

### CRITICAL BLOCKERS (Must fix before go-live)
```
Critical Blockers
    |
    |-- HTTPS Enforcement
    |     Cookie secure: false in auth.ts
    |     No SSL/TLS configuration
    |     Health data transmitted in plaintext
    |
    |-- Field Workers Page is a STUB
    |     Only hardcoded demo data
    |     Supervisors cannot actually manage workers
    |     No worker assignment, scheduling, or tracking
    |
    |-- No Data Deletion / Right to Erasure
    |     No deletePatient() method exists
    |     No way to remove a child's data
    |     Violates DPDP 2023 Section 12
    |
    |-- No Patient Edit
    |     Once registered, patient details cannot be updated
    |     No address change, no age correction, no caregiver update
    |
    '-- Session Secret Hardcoded
          "ecd-dashboard-dev-secret" is the default
          Must be a strong random secret in production
```

### Security Hardening
```
Security Hardening
    |
    |-- No Rate Limiting
    |     Login brute-force possible
    |     API endpoints unthrottled
    |
    |-- No CSRF Protection
    |     No CSRF tokens on forms
    |
    |-- No Input Sanitization Beyond Zod
    |     XSS possible in text fields rendered in UI
    |
    |-- No Request Size Limits (per-route)
    |     Global 10MB limit but photo endpoint needs tighter control
    |
    |-- API Key in .env (plaintext)
    |     OpenRouter key not encrypted
    |     No key rotation mechanism
    |
    |-- No Password Policy
    |     No minimum length, complexity, or expiry rules
    |
    '-- No Account Lockout
          No lockout after failed login attempts
```

### Data Compliance (DPDP 2023)
```
Data Compliance
    |
    |-- No Privacy Policy / Notice Page
    |     Users never shown what data is collected or why
    |
    |-- No Data Export (Right to Access)
    |     Guardians cannot download their child's data
    |
    |-- No Data Retention Policy
    |     No auto-purge of expired consent or old records
    |
    |-- No Breach Notification System
    |     No detection, no alerting, no incident workflow
    |
    |-- No DPO Contact Page
    |     No Data Protection Officer designated
    |
    |-- No Grievance Mechanism
    |     No way for data principals to file complaints
    |
    |-- Children's Data (DPDP Section 9)
    |     No verifiable guardian identity check
    |     AI profiling of children without explicit safeguards
    |     Photo data sent to external API (OpenRouter) cross-border
    |
    '-- No Data Processing Agreement
          External AI services process health data
          No documented DPA with OpenRouter
```

### UX/UI Gaps
```
UX/UI Gaps
    |
    |-- No Offline Support
    |     Field workers in rural areas need offline capability
    |     No service worker or local data sync
    |
    |-- No Multi-Language Support
    |     UI is English-only
    |     Critical for India deployment (Hindi, regional languages)
    |
    |-- No Print-Friendly Views
    |     Reports and intervention plans can't be printed cleanly
    |
    |-- No Mobile Optimization
    |     Sidebar-based layout not ideal for phones
    |     Field workers likely use mobile devices
    |
    |-- No Notification System (in-app)
    |     Alerts exist but no push/bell notifications
    |     Workers don't know about new assignments in real-time
    |
    |-- No Patient Photo/Avatar
    |     Patient cards are text-only, hard to identify in field
    |
    '-- No Bulk Operations
          No bulk screening import
          No batch patient registration
          No bulk alert dismissal
```

### Operational Gaps
```
Operational Gaps
    |
    |-- No Health Check Endpoint
    |     No /health or /ready for load balancers
    |
    |-- No Logging Infrastructure
    |     Console.log only, no structured logging
    |     No log aggregation (ELK, Datadog, etc.)
    |
    |-- No Monitoring / APM
    |     No error tracking (Sentry, etc.)
    |     No performance monitoring
    |
    |-- No Database Migrations
    |     Uses drizzle-kit push (not migration files)
    |     Risky for production schema changes
    |
    |-- No Backup Strategy
    |     No automated database backups configured
    |
    |-- No CI/CD Pipeline
    |     No automated testing or deployment
    |
    |-- No Automated Tests
    |     Zero test files in codebase
    |     No unit, integration, or e2e tests
    |
    '-- No Docker / Containerization
          No Dockerfile or docker-compose
          Deployment process undocumented
```

---

## DEPLOYMENT READINESS SUMMARY

```
+---------------------------+----------+----------------------------------------+
| Category                  | Status   | Verdict                                |
+---------------------------+----------+----------------------------------------+
| Core Screening Flow       | READY    | Registration -> Consent -> Screen ->   |
|                           |          | AI Analysis -> Intervention Plans       |
+---------------------------+----------+----------------------------------------+
| Patient Management        | READY    | List, profile, progress tracking       |
|                           |          | (missing: edit, delete)                |
+---------------------------+----------+----------------------------------------+
| AI Engine                 | READY    | 3 AI services with graceful fallbacks  |
+---------------------------+----------+----------------------------------------+
| Consent System            | READY    | 4 types, expiry, revocation, gates     |
+---------------------------+----------+----------------------------------------+
| Dashboards                | PARTIAL  | Supervisor + KPI ready,                |
|                           |          | Field Workers page is a stub           |
+---------------------------+----------+----------------------------------------+
| Reports                   | READY    | District reports with CSV export       |
+---------------------------+----------+----------------------------------------+
| Alert System              | READY    | Auto-triggers, deduplication,          |
|                           |          | management UI                          |
+---------------------------+----------+----------------------------------------+
| Auth & Roles              | READY    | 4 roles, route guards, sessions        |
|                           |          | (needs: HTTPS, rate limiting)          |
+---------------------------+----------+----------------------------------------+
| Audit Trail               | READY    | All actions logged                     |
+---------------------------+----------+----------------------------------------+
| Caching (Redis)           | READY    | Optional, graceful fallback            |
+---------------------------+----------+----------------------------------------+
| Security                  | PARTIAL  | Password hashing OK, but missing       |
|                           |          | HTTPS, CSRF, rate limits, lockout      |
+---------------------------+----------+----------------------------------------+
| Data Compliance (DPDP)    | NOT READY| No deletion, no privacy notice,        |
|                           |          | no breach notification, no DPO         |
+---------------------------+----------+----------------------------------------+
| Testing                   | NOT READY| Zero automated tests                   |
+---------------------------+----------+----------------------------------------+
| DevOps / Infra            | NOT READY| No Docker, CI/CD, monitoring, backups  |
+---------------------------+----------+----------------------------------------+
| Localization              | NOT READY| English only                           |
+---------------------------+----------+----------------------------------------+
| Mobile / Offline          | NOT READY| No offline support, not mobile-first   |
+---------------------------+----------+----------------------------------------+
```

**Bottom line: The core screening workflow is solid and functional.
The platform can demo and pilot. For production deployment
handling real children's health data in India, security hardening,
DPDP compliance, testing, and operational infrastructure are required.**

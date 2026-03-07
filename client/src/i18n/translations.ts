export type Language = "en" | "te";

const translations = {
  // Login page
  "login.signIn": { en: "Sign In", te: "సైన్ ఇన్" },
  "login.accessDashboard": { en: "Access your dashboard", te: "మీ డాష్‌బోర్డ్‌ను యాక్సెస్ చేయండి" },
  "login.selectRole": { en: "Select Role", te: "పాత్రను ఎంచుకోండి" },
  "login.selectYourRole": { en: "Select your role", te: "మీ పాత్రను ఎంచుకోండి" },
  "login.username": { en: "Username", te: "వినియోగదారు పేరు" },
  "login.enterUsername": { en: "Enter username", te: "వినియోగదారు పేరు నమోదు చేయండి" },
  "login.password": { en: "Password", te: "పాస్‌వర్డ్" },
  "login.enterPassword": { en: "Enter password", te: "పాస్‌వర్డ్ నమోదు చేయండి" },
  "login.signingIn": { en: "Signing in...", te: "సైన్ ఇన్ అవుతోంది..." },
  "login.demoAccess": { en: "Demo Access", te: "డెమో యాక్సెస్" },
  "login.demoHint": {
    en: "Username is the role name (as shown in dropdown), password is",
    te: "వినియోగదారు పేరు పాత్ర పేరు (డ్రాప్‌డౌన్‌లో చూపినట్లు), పాస్‌వర్డ్"
  },
  "login.demoExample": {
    en: "e.g. Username:",
    te: "ఉదా. వినియోగదారు పేరు:"
  },
  "login.title1": { en: "Intelligent Early Age", te: "తెలివైన ముందస్తు వయస్సు" },
  "login.title2": { en: "Health Monitoring & Screening", te: "ఆరోగ్య పర్యవేక్షణ & స్క్రీనింగ్" },
  "login.subtitle": {
    en: "Intelligent child health screening, risk detection, and intervention tracking for ICDS field operations.",
    te: "ICDS ఫీల్డ్ కార్యకలాపాల కోసం తెలివైన పిల్లల ఆరోగ్య స్క్రీనింగ్, రిస్క్ డిటెక్షన్ మరియు జోక్యం ట్రాకింగ్."
  },

  // Feature bullets
  "feature.aiScreening": { en: "AI-driven multi-domain risk screening", te: "AI-ఆధారిత బహుళ-డొమైన్ రిస్క్ స్క్రీనింగ్" },
  "feature.realTimeAlerts": { en: "Real-time alerts via WebSocket", te: "WebSocket ద్వారా రియల్-టైమ్ అలర్ట్‌లు" },
  "feature.fhir": { en: "FHIR R4 health data interoperability", te: "FHIR R4 ఆరోగ్య డేటా ఇంటరోపెరాబిలిటీ" },
  "feature.rbac": { en: "6-tier role-based access control", te: "6-స్థాయి పాత్ర-ఆధారిత యాక్సెస్ నియంత్రణ" },
  "feature.encryption": { en: "AES-256-GCM encrypted patient PII", te: "AES-256-GCM ఎన్‌క్రిప్ట్ చేయబడిన పేషెంట్ PII" },
  "feature.predictive": { en: "Predictive risk trajectory analysis", te: "ప్రిడిక్టివ్ రిస్క్ ట్రాజెక్టరీ విశ్లేషణ" },
  "feature.dpdp": { en: "DPDP 2023 compliant data governance", te: "DPDP 2023 అనుగుణ డేటా గవర్నెన్స్" },

  // Roles
  "role.field_worker": { en: "Field Worker", te: "ఫీల్డ్ వర్కర్" },
  "role.supervisor": { en: "Supervisor", te: "సూపర్‌వైజర్" },
  "role.cdpo": { en: "CDPO", te: "CDPO" },
  "role.dwcweo": { en: "DW&CW&EO", te: "DW&CW&EO" },
  "role.higher_official": { en: "Higher Official", te: "ఉన్నత అధికారి" },
  "role.admin": { en: "Administrator", te: "అడ్మినిస్ట్రేటర్" },

  // Sidebar nav
  "nav.healthScreening": { en: "Health Screening", te: "ఆరోగ్య స్క్రీనింగ్" },
  "nav.myPatients": { en: "My Patients", te: "నా పేషెంట్‌లు" },
  "nav.registerPatient": { en: "Register Patient", te: "పేషెంట్‌ను నమోదు చేయండి" },
  "nav.messages": { en: "Messages", te: "సందేశాలు" },
  "nav.overview": { en: "Overview", te: "అవలోకనం" },
  "nav.fieldWorkers": { en: "Field Workers", te: "ఫీల్డ్ వర్కర్లు" },
  "nav.patientRegistry": { en: "Patient Registry", te: "పేషెంట్ రిజిస్ట్రీ" },
  "nav.alerts": { en: "Alerts", te: "అలర్ట్‌లు" },
  "nav.analytics": { en: "Analytics", te: "విశ్లేషణలు" },
  "nav.blockDashboard": { en: "Block Dashboard", te: "బ్లాక్ డాష్‌బోర్డ్" },
  "nav.reports": { en: "Reports", te: "నివేదికలు" },
  "nav.districtDashboard": { en: "District Dashboard", te: "జిల్లా డాష్‌బోర్డ్" },
  "nav.blockOverview": { en: "Block Overview", te: "బ్లాక్ అవలోకనం" },
  "nav.stateDashboard": { en: "State Dashboard", te: "రాష్ట్ర డాష్‌బోర్డ్" },
  "nav.districtOverview": { en: "District Overview", te: "జిల్లా అవలోకనం" },
  "nav.userManagement": { en: "User Management", te: "వినియోగదారు నిర్వహణ" },
  "nav.signOut": { en: "Sign Out", te: "సైన్ అవుట్" },

  // Language
  "lang.english": { en: "English", te: "ఆంగ్లం" },
  "lang.telugu": { en: "Telugu", te: "తెలుగు" },
  "lang.toggle": { en: "తెలుగు", te: "English" },

  // Common
  "common.loading": { en: "Loading...", te: "లోడ్ అవుతోంది..." },
  "common.missingFields": { en: "Missing fields", te: "తప్పిపోయిన ఫీల్డ్‌లు" },
  "common.loginFailed": { en: "Login failed", te: "లాగిన్ విఫలమైంది" },
  "common.fillFields": {
    en: "Please select a role and enter your credentials.",
    te: "దయచేసి పాత్రను ఎంచుకుని మీ ఆధారాలను నమోదు చేయండి."
  },
  "common.invalidCredentials": { en: "Invalid credentials.", te: "చెల్లని ఆధారాలు." },
} as const;

export type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, lang: Language): string {
  return translations[key]?.[lang] ?? translations[key]?.en ?? key;
}

export default translations;

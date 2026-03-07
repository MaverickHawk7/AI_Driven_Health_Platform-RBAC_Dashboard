export type Language = "en" | "te";

// Flat English → Telugu dictionary. English text IS the lookup key.
const te: Record<string, string> = {
  // Login
  "Sign In": "సైన్ ఇన్",
  "Access your dashboard": "మీ డాష్‌బోర్డ్‌ను యాక్సెస్ చేయండి",
  "Select Role": "పాత్రను ఎంచుకోండి",
  "Select your role": "మీ పాత్రను ఎంచుకోండి",
  "Username": "వినియోగదారు పేరు",
  "Enter username": "వినియోగదారు పేరు నమోదు చేయండి",
  "Password": "పాస్‌వర్డ్",
  "Enter password": "పాస్‌వర్డ్ నమోదు చేయండి",
  "Signing in...": "సైన్ ఇన్ అవుతోంది...",
  "Demo Access": "డెమో యాక్సెస్",
  "Intelligent Early Age": "తెలివైన ముందస్తు వయస్సు",
  "Health Monitoring & Screening": "ఆరోగ్య పర్యవేక్షణ & స్క్రీనింగ్",
  "Intelligent child health screening, risk detection, and intervention tracking for ICDS field operations.":
    "ICDS ఫీల్డ్ కార్యకలాపాల కోసం తెలివైన పిల్లల ఆరోగ్య స్క్రీనింగ్, రిస్క్ డిటెక్షన్ మరియు జోక్యం ట్రాకింగ్.",

  // Feature bullets
  "AI-driven multi-domain risk screening": "AI-ఆధారిత బహుళ-డొమైన్ రిస్క్ స్క్రీనింగ్",
  "Real-time alerts via WebSocket": "WebSocket ద్వారా రియల్-టైమ్ అలర్ట్‌లు",
  "FHIR R4 health data interoperability": "FHIR R4 ఆరోగ్య డేటా ఇంటరోపెరాబిలిటీ",
  "6-tier role-based access control": "6-స్థాయి పాత్ర-ఆధారిత యాక్సెస్ నియంత్రణ",
  "AES-256-GCM encrypted patient PII": "AES-256-GCM ఎన్‌క్రిప్ట్ చేయబడిన పేషెంట్ PII",
  "Predictive risk trajectory analysis": "ప్రిడిక్టివ్ రిస్క్ ట్రాజెక్టరీ విశ్లేషణ",
  "DPDP 2023 compliant data governance": "DPDP 2023 అనుగుణ డేటా గవర్నెన్స్",

  // Roles
  "Field Worker": "ఫీల్డ్ వర్కర్",
  "Supervisor": "సూపర్‌వైజర్",
  "CDPO": "CDPO",
  "DW&CW&EO": "DW&CW&EO",
  "Higher Official": "ఉన్నత అధికారి",
  "Administrator": "అడ్మినిస్ట్రేటర్",

  // Sidebar nav
  "Health Screening": "ఆరోగ్య స్క్రీనింగ్",
  "My Patients": "నా పేషెంట్‌లు",
  "Register Patient": "పేషెంట్‌ను నమోదు చేయండి",
  "Messages": "సందేశాలు",
  "Overview": "అవలోకనం",
  "Field Workers": "ఫీల్డ్ వర్కర్లు",
  "Patient Registry": "పేషెంట్ రిజిస్ట్రీ",
  "Alerts": "అలర్ట్‌లు",
  "Analytics": "విశ్లేషణలు",
  "Block Dashboard": "బ్లాక్ డాష్‌బోర్డ్",
  "Reports": "నివేదికలు",
  "District Dashboard": "జిల్లా డాష్‌బోర్డ్",
  "Block Overview": "బ్లాక్ అవలోకనం",
  "State Dashboard": "రాష్ట్ర డాష్‌బోర్డ్",
  "District Overview": "జిల్లా అవలోకనం",
  "User Management": "వినియోగదారు నిర్వహణ",
  "Sign Out": "సైన్ అవుట్",

  // Common
  "Loading...": "లోడ్ అవుతోంది...",
  "Missing fields": "తప్పిపోయిన ఫీల్డ్‌లు",
  "Login failed": "లాగిన్ విఫలమైంది",
  "Please select a role and enter your credentials.": "దయచేసి పాత్రను ఎంచుకుని మీ ఆధారాలను నమోదు చేయండి.",
  "Invalid credentials.": "చెల్లని ఆధారాలు.",
  "Reset": "రీసెట్",
  "Submit": "సమర్పించండి",
  "Back": "వెనుకకు",
  "Search...": "వెతకండి...",
  "All": "అన్నీ",
  "Name": "పేరు",
  "Age": "వయస్సు",
  "Risk": "రిస్క్",
  "Actions": "చర్యలు",

  // Field Worker Home
  "Community Health Field Worker Dashboard": "కమ్యూనిటీ హెల్త్ ఫీల్డ్ వర్కర్ డాష్‌బోర్డ్",
  "Add a new patient to the community health registry and conduct initial screening.":
    "కమ్యూనిటీ హెల్త్ రిజిస్ట్రీకి కొత్త పేషెంట్‌ను జోడించి ప్రారంభ స్క్రీనింగ్ చేయండి.",
  "Get Started": "ప్రారంభించండి",
  "Review Patients": "పేషెంట్‌లను సమీక్షించండి",
  "View your registered patients, assessment history, and AI-assisted insights.":
    "మీ నమోదు చేసిన పేషెంట్‌లు, అసెస్‌మెంట్ చరిత్ర మరియు AI-ఆధారిత అంతర్దృష్టులను చూడండి.",
  "View Registry": "రిజిస్ట్రీ చూడండి",

  // Register Patient
  "Register New Patient": "కొత్త పేషెంట్‌ను నమోదు చేయండి",
  "Create a new patient record to begin tracking and screening.":
    "ట్రాకింగ్ మరియు స్క్రీనింగ్ ప్రారంభించడానికి కొత్త పేషెంట్ రికార్డ్ సృష్టించండి.",
  "Patient Details": "పేషెంట్ వివరాలు",
  "Enter the basic information for the patient and their emergency contact.":
    "పేషెంట్ మరియు వారి అత్యవసర సంప్రదింపు కోసం ప్రాథమిక సమాచారం నమోదు చేయండి.",
  "Patient Information": "పేషెంట్ సమాచారం",
  "Patient's Full Name": "పేషెంట్ పూర్తి పేరు",
  "Age (Months)": "వయస్సు (నెలల్లో)",
  "Emergency Contact & Caregiver": "అత్యవసర సంప్రదింపు & సంరక్షకుడు",
  "Primary Contact / Caregiver Name": "ప్రాథమిక సంప్రదింపు / సంరక్షకుడి పేరు",
  "Contact Number": "సంప్రదింపు నంబర్",
  "Address / Village": "చిరునామా / గ్రామం",
  "Registering...": "నమోదు అవుతోంది...",
  "Register & Continue": "నమోదు చేయండి & కొనసాగించండి",
  "Patient Registered Successfully": "పేషెంట్ విజయవంతంగా నమోదు అయ్యారు",
  "The basic patient record has been created.": "ప్రాథమిక పేషెంట్ రికార్డ్ సృష్టించబడింది.",
  "Back to Home": "హోమ్‌కు తిరిగి",
  "Proceed to Questionnaire": "ప్రశ్నాపత్రానికి కొనసాగండి",

  // Conduct Screening
  "Assessment for early detection of health conditions and risk factors.":
    "ఆరోగ్య పరిస్థితులు మరియు రిస్క్ కారకాల ముందస్తు గుర్తింపు కోసం అసెస్‌మెంట్.",
  "Select Patient": "పేషెంట్‌ను ఎంచుకోండి",
  "Patient Name": "పేషెంట్ పేరు",
  "Select a patient...": "పేషెంట్‌ను ఎంచుకోండి...",
  "Consent on file": "సమ్మతి ఫైల్‌లో ఉంది",
  "Consent required": "సమ్మతి అవసరం",
  "Consent must be recorded before screening can proceed.":
    "స్క్రీనింగ్ కొనసాగించడానికి ముందు సమ్మతిని నమోదు చేయాలి.",
  "Record Consent": "సమ్మతిని నమోదు చేయండి",
  "Screening Type": "స్క్రీనింగ్ రకం",
  "Baseline Assessment": "ప్రాథమిక అసెస్‌మెంట్",
  "3-Month Reassessment": "3-నెల పున:అసెస్‌మెంట్",
  "6-Month Reassessment": "6-నెల పున:అసెస్‌మెంట్",
  "Ad-hoc Screening": "అడ్-హాక్ స్క్రీనింగ్",
  "Assessment Questions": "అసెస్‌మెంట్ ప్రశ్నలు",
  "Answer all questions based on observation and patient or caregiver report.":
    "పరిశీలన మరియు పేషెంట్ లేదా సంరక్షకుడి నివేదిక ఆధారంగా అన్ని ప్రశ్నలకు సమాధానం ఇవ్వండి.",
  "Analyzing...": "విశ్లేషిస్తోంది...",
  "Submit Assessment": "అసెస్‌మెంట్ సమర్పించండి",
  "Patient & Consent": "పేషెంట్ & సమ్మతి",
  "Questions": "ప్రశ్నలు",
  "Photo": "ఫోటో",
  "Results": "ఫలితాలు",

  // Screening Questions
  "Can the patient walk or move unassisted?": "పేషెంట్ సహాయం లేకుండా నడవగలరా లేదా కదలగలరా?",
  "Does the patient respond to their name?": "పేషెంట్ తమ పేరుకు స్పందిస్తారా?",
  "Is the patient maintaining adequate nutrition?": "పేషెంట్ తగినంత పోషణను పొందుతున్నారా?",
  "Does the patient maintain eye contact during interaction?": "పేషెంట్ సంభాషణ సమయంలో కన్ను సంప్రదింపు నిర్వహిస్తారా?",
  "Can the patient communicate basic needs verbally?": "పేషెంట్ ప్రాథమిక అవసరాలను మాటల ద్వారా తెలియజేయగలరా?",

  // Categories
  "Motor": "మోటార్",
  "Social": "సామాజిక",
  "Nutrition": "పోషణ",
  "Language": "భాష",

  // Radio options
  "Yes, consistently": "అవును, స్థిరంగా",
  "Sometimes / With help": "కొన్నిసార్లు / సహాయంతో",
  "No, not yet": "లేదు, ఇంకా కాదు",

  // Patients List
  "Search patients by name...": "పేరు ద్వారా పేషెంట్‌లను వెతకండి...",
  "Filter by Risk": "రిస్క్ ద్వారా ఫిల్టర్",
  "Add New": "కొత్తది జోడించండి",
  "Caregiver": "సంరక్షకుడు",
  "months": "నెలలు",
  "No patients found.": "పేషెంట్‌లు కనుగొనబడలేదు.",
  "View": "చూడండి",

  // Welcome prefix
  "Welcome,": "స్వాగతం,",

  // PatientsList extras
  "Manage and view all registered patients.": "అన్ని నమోదు చేసిన పేషెంట్‌లను నిర్వహించండి మరియు చూడండి.",
};

export function t(text: string, lang: Language): string {
  if (lang === "en") return text;
  return te[text] ?? text;
}

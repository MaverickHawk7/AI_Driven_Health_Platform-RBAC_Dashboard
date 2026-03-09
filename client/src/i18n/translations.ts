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

  // Screening UI
  "Developmental Screening": "అభివృద్ధి స్క్రీనింగ్",
  "Two-tier behavioral screening for early detection of developmental concerns.": "అభివృద్ధి సమస్యల ముందస్తు గుర్తింపు కోసం రెండు-అంచెల ప్రవర్తన స్క్రీనింగ్.",
  "This tool is for early risk screening only, not diagnosis. It identifies possible early signs of developmental delay and flags persons who should be referred to a pediatric specialist.":
    "ఈ సాధనం ముందస్తు రిస్క్ స్క్రీనింగ్ కోసం మాత్రమే, రోగనిర్ధారణ కాదు. ఇది అభివృద్ధి ఆలస్యం యొక్క సాధ్యమైన ముందస్తు సంకేతాలను గుర్తిస్తుంది మరియు పీడియాట్రిక్ నిపుణుడికి సూచించాల్సిన వ్యక్తులను ఫ్లాగ్ చేస్తుంది.",
  "Tier 1 Screening": "టైర్ 1 స్క్రీనింగ్",
  "Follow-up": "ఫాలో-అప్",
  "Tier 1: Rapid Screening": "టైర్ 1: వేగవంతమైన స్క్రీనింగ్",
  "15 questions covering key behavioral domains. Estimated time: under 10 minutes.": "ముఖ్యమైన ప్రవర్తన డొమైన్‌లను కవర్ చేసే 15 ప్రశ్నలు. అంచనా సమయం: 10 నిమిషాల లోపు.",
  "Score Tier 1": "టైర్ 1 స్కోర్",
  "Tier 1 Screening Result": "టైర్ 1 స్క్రీనింగ్ ఫలితం",
  "Follow-up assessment recommended": "ఫాలో-అప్ అసెస్‌మెంట్ సిఫార్సు చేయబడింది",
  "Low risk indicated": "తక్కువ రిస్క్ సూచించబడింది",
  "Score of 3 or more warrants detailed follow-up questions to better understand areas of concern.":
    "3 లేదా అంతకంటే ఎక్కువ స్కోరు ఆందోళన ప్రాంతాలను మెరుగ్గా అర్థం చేసుకోవడానికి వివరమైన ఫాలో-అప్ ప్రశ్నలకు అర్హత కలిగిస్తుంది.",
  "Screening indicates low developmental risk. Continue routine monitoring.":
    "స్క్రీనింగ్ తక్కువ అభివృద్ధి రిస్క్‌ను సూచిస్తుంది. రోటీన్ పర్యవేక్షణ కొనసాగించండి.",
  "Proceed to Follow-up Assessment": "ఫాలో-అప్ అసెస్‌మెంట్‌కు కొనసాగండి",
  "Submit & View Results": "సమర్పించండి & ఫలితాలు చూడండి",
  "Submitting...": "సమర్పిస్తోంది...",
  "Tier 2: Follow-up Assessment": "టైర్ 2: ఫాలో-అప్ అసెస్‌మెంట్",
  "12 detailed follow-up questions to better characterize areas of concern.": "ఆందోళన ప్రాంతాలను మెరుగ్గా వర్ణించడానికి 12 వివరమైన ఫాలో-అప్ ప్రశ్నలు.",
  "Tier 1 score:": "టైర్ 1 స్కోర్:",
  "Follow-up assessment triggered": "ఫాలో-అప్ అసెస్‌మెంట్ ప్రారంభించబడింది",
  "Domain Indicators": "డొమైన్ సూచికలు",
  "Concern levels across behavioral domains based on all responses.": "అన్ని ప్రతిస్పందనల ఆధారంగా ప్రవర్తన డొమైన్‌లలో ఆందోళన స్థాయిలు.",
  "Back to Tier 1": "టైర్ 1కి తిరిగి",
  "Incomplete": "అసంపూర్ణం",
  "Please answer all Tier 1 questions before proceeding.": "కొనసాగించడానికి ముందు అన్ని టైర్ 1 ప్రశ్నలకు సమాధానం ఇవ్వండి.",
  "Please answer all follow-up questions before submitting.": "సమర్పించడానికి ముందు అన్ని ఫాలో-అప్ ప్రశ్నలకు సమాధానం ఇవ్వండి.",

  // Domain names
  "Communication": "కమ్యూనికేషన్",
  "Social Interaction": "సామాజిక పరస్పర చర్య",
  "Joint Attention": "ఉమ్మడి శ్రద్ధ",
  "Play Behavior": "ఆట ప్రవర్తన",
  "Repetitive Behavior": "పునరావృత ప్రవర్తన",
  "Sensory Sensitivity": "ఇంద్రియ సున్నితత్వం",
  "Emotional Regulation": "భావోద్వేగ నియంత్రణ",

  // Tier 1 Questions
  "Did the person start walking by 18 months?": "వ్యక్తి 18 నెలల లోపు నడవడం ప్రారంభించారా?",
  "Is the person able to speak at least a few meaningful words?": "వ్యక్తి కనీసం కొన్ని అర్థవంతమైన పదాలు మాట్లాడగలరా?",
  "Can the person follow simple instructions (for example \"give the ball\")?": "వ్యక్తి సాధారణ ఆదేశాలను అనుసరించగలరా (ఉదాహరణకు \"బంతి ఇవ్వు\")?",
  "Does the person respond when their name is called?": "వ్యక్తి పేరు పిలిచినప్పుడు స్పందిస్తారా?",
  "Does the person look at people's faces during interaction?": "వ్యక్తి సంభాషణ సమయంలో ప్రజల ముఖాలను చూస్తారా?",
  "Does the person smile back when someone smiles at them?": "ఎవరైనా నవ్వినప్పుడు వ్యక్తి తిరిగి నవ్వుతారా?",
  "Does the person point to ask for something?": "వ్యక్తి ఏదైనా అడగడానికి చూపిస్తారా?",
  "Does the person point to show something interesting?": "వ్యక్తి ఆసక్తికరమైన విషయాన్ని చూపించడానికి చూపిస్తారా?",
  "Does the person use gestures such as waving or nodding?": "వ్యక్తి చేతి ఊపడం లేదా తల ఊపడం వంటి సంజ్ఞలను ఉపయోగిస్తారా?",
  "Does the person play pretend games (for example feeding a doll or toy cooking)?": "వ్యక్తి నటన ఆటలు ఆడతారా (ఉదాహరణకు బొమ్మకు ఆహారం పెట్టడం లేదా బొమ్మ వంట)?",
  "Does the person play with other children?": "వ్యక్తి ఇతర పిల్లలతో ఆడతారా?",
  "Does the person bring toys or objects to show adults?": "వ్యక్తి పెద్దవారికి చూపించడానికి బొమ్మలు లేదా వస్తువులను తీసుకొస్తారా?",
  "Does the person repeat movements such as hand flapping or spinning?": "వ్యక్తి చేతులు ఊపడం లేదా తిరగడం వంటి కదలికలను పునరావృతం చేస్తారా?",
  "Does the person become very upset if routines change?": "దినచర్యలు మారితే వ్యక్తి చాలా బాధపడతారా?",
  "Is the person very sensitive to loud sounds or certain textures?": "వ్యక్తి పెద్ద శబ్దాలు లేదా కొన్ని ఆకృతులకు చాలా సున్నితంగా ఉంటారా?",

  // Tier 2 Questions
  "Does the person repeat the same words or phrases frequently?": "వ్యక్తి ఒకే పదాలు లేదా పదబంధాలను తరచుగా పునరావృతం చేస్తారా?",
  "Does the person pull an adult's hand instead of speaking or gesturing?": "వ్యక్తి మాట్లాడటం లేదా సంజ్ఞ చేయడానికి బదులు పెద్దవారి చేతిని లాగుతారా?",
  "Does the person prefer playing alone most of the time?": "వ్యక్తి ఎక్కువ సమయం ఒంటరిగా ఆడటానికి ఇష్టపడతారా?",
  "Does the person avoid eye contact frequently?": "వ్యక్తి తరచుగా కన్ను సంప్రదింపును నివారిస్తారా?",
  "Does the person show little interest in other children?": "వ్యక్తి ఇతర పిల్లలపై తక్కువ ఆసక్తి చూపిస్తారా?",
  "Does the person line up toys or objects repeatedly?": "వ్యక్తి బొమ్మలు లేదా వస్తువులను పదేపదే వరుసగా పేరుస్తారా?",
  "Does the person spin objects repeatedly?": "వ్యక్తి వస్తువులను పదేపదే తిప్పుతారా?",
  "Does the person cover their ears in response to normal sounds?": "సాధారణ శబ్దాలకు ప్రతిస్పందనగా వ్యక్తి చెవులు మూసుకుంటారా?",
  "Does the person avoid certain food or clothing textures?": "వ్యక్తి కొన్ని ఆహార లేదా దుస్తుల ఆకృతులను నివారిస్తారా?",
  "Does the person have frequent intense tantrums?": "వ్యక్తికి తరచుగా తీవ్రమైన కోపోద్రేకాలు ఉంటాయా?",
  "Does the person struggle to calm down once upset?": "వ్యక్తి బాధపడిన తర్వాత శాంతపడటానికి కష్టపడతారా?",
  "Does the person focus intensely on a single object for long periods?": "వ్యక్తి ఎక్కువ సేపు ఒకే వస్తువుపై తీవ్రంగా దృష్టి పెడతారా?",

  // Radio options
  "Yes": "అవును",
  "No": "కాదు",
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
  "Contact / Caregiver": "సంప్రదింపు / సంరక్షకుడు",
  "Location": "ప్రాంతం",
  "Action": "చర్య",
  "Loading records...": "రికార్డ్‌లు లోడ్ అవుతున్నాయి...",
  "No patients found matching your criteria.": "మీ ప్రమాణాలకు సరిపోయే పేషెంట్‌లు కనుగొనబడలేదు.",
  "Not screened": "స్క్రీన్ చేయబడలేదు",
  "Delete Patient Record": "పేషెంట్ రికార్డ్ తొలగించండి",
  "Enter your password to confirm": "నిర్ధారించడానికి మీ పాస్‌వర్డ్ నమోదు చేయండి",
  "Your account password": "మీ ఖాతా పాస్‌వర్డ్",
  "Cancel": "రద్దు చేయండి",
  "Delete Patient": "పేషెంట్‌ను తొలగించండి",
  "Photo analysis skipped": "ఫోటో విశ్లేషణ దాటవేయబడింది",
  "No photo analysis consent on record. Photo step has been skipped.": "ఫోటో విశ్లేషణ సమ్మతి రికార్డ్‌లో లేదు. ఫోటో దశ దాటవేయబడింది.",
  "Screening failed": "స్క్రీనింగ్ విఫలమైంది",
  "Active consent is required before screening. Please record consent first.": "స్క్రీనింగ్ ముందు సమ్మతి అవసరం. దయచేసి ముందుగా సమ్మతిని నమోదు చేయండి.",
  "Patient Deleted": "పేషెంట్ తొలగించబడింది",
  "Patient and all associated records have been removed.": "పేషెంట్ మరియు అన్ని సంబంధిత రికార్డ్‌లు తొలగించబడ్డాయి.",
  "An unexpected error occurred.": "అనుకోని లోపం సంభవించింది.",

  // Theme
  "Dark Mode": "డార్క్ మోడ్",
  "Light Mode": "లైట్ మోడ్",

  // FieldWorkerHome stats
  "Patients": "పేషెంట్‌లు",
  "Screenings": "స్క్రీనింగ్‌లు",
  "Unread Messages": "చదవని సందేశాలు",
  "Recent Patients": "ఇటీవలి పేషెంట్‌లు",

  // Empty states
  "Try adjusting your search or filters.": "మీ శోధన లేదా ఫిల్టర్‌లను సర్దుబాటు చేయడానికి ప్రయత్నించండి.",
  "Register your first patient to get started.": "ప్రారంభించడానికి మీ మొదటి పేషెంట్‌ను నమోదు చేయండి.",
};

export function t(text: string, lang: Language): string {
  if (lang === "en") return text;
  return te[text] ?? text;
}

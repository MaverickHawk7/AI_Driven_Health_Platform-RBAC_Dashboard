import { usePatient, useScreenings, useInterventions, useInterventionPlans, useConsentRecords, useNutritionAssessments, useEnvironmentAssessments, useReferrals, useOutcomes } from "@/hooks/use-resources";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RiskBadge } from "@/components/RiskBadge";
import { format } from "date-fns";
import { CalendarDays, MapPin, Phone, User as UserIcon, TrendingUp, FileText, ShieldCheck, Baby, Apple, Home, ArrowRight } from "lucide-react";

export default function PatientProfile() {
  const [, params] = useRoute("/patients/:id");
  const [, setLocation] = useLocation();
  const id = params ? Number.parseInt(params.id, 10) || 0 : 0;

  const { data: patient, isLoading: patientLoading } = usePatient(id);
  const { data: screenings, isLoading: screeningsLoading } = useScreenings(id);
  const { data: patientInterventions, isLoading: interventionsLoading } = useInterventions(id);
  const { data: interventionPlans } = useInterventionPlans(id);
  const { data: consentRecords } = useConsentRecords(id);
  const { data: nutritionAssessments } = useNutritionAssessments(id);
  const { data: environmentAssessments } = useEnvironmentAssessments(id);
  const { data: referrals } = useReferrals(id);
  const { data: outcomes } = useOutcomes(id);

  if (patientLoading || screeningsLoading || interventionsLoading) return <div className="p-8">Loading profile...</div>;
  if (!patient) return <div className="p-8">Patient not found</div>;

  const latestScreening = screenings && screenings.length > 0 ? screenings[0] : null;
  const activeConsents = (consentRecords || []).filter((c: any) => c.consentGiven && !c.revokedAt);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row gap-6 md:items-start">
        <Card className="md:w-1/3 shadow-md">
          <CardHeader className="bg-muted/30 pb-4">
            <div className="flex justify-between items-start">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary mb-2">
                {patient.name.charAt(0)}
              </div>
              {latestScreening && <RiskBadge level={latestScreening.riskLevel as any} />}
            </div>
            <CardTitle className="text-2xl">{patient.name}</CardTitle>
            <CardDescription>ID: #{patient.id.toString().padStart(6, '0')}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <UserIcon className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">
                  {patient.ageMonths} months
                  {(patient as any).gender && <span className="ml-2 text-muted-foreground capitalize">({(patient as any).gender})</span>}
                </p>
                <p className="text-muted-foreground">Age</p>
              </div>
            </div>
            {(patient as any).dob && (
              <div className="flex items-center gap-3 text-sm">
                <CalendarDays className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">{format(new Date((patient as any).dob), 'PPP')}</p>
                  <p className="text-muted-foreground">Date of Birth</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <UserIcon className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">{patient.caregiverName}</p>
                <p className="text-muted-foreground">Primary Contact / Caregiver</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">{patient.contactNumber || "N/A"}</p>
                <p className="text-muted-foreground">Contact</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">{patient.address || "N/A"}</p>
                <p className="text-muted-foreground">Location</p>
              </div>
            </div>
            {((patient as any).modeDelivery || (patient as any).birthStatus || (patient as any).consanguinity) && (
              <div className="flex items-start gap-3 text-sm">
                <Baby className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <p className="text-muted-foreground font-medium">Birth History</p>
                  {(patient as any).modeDelivery && (
                    <p className="text-foreground">Delivery: <span className="capitalize">{(patient as any).modeDelivery === 'c_section' ? 'C-Section' : 'Vaginal'}</span></p>
                  )}
                  {(patient as any).modeConception && (
                    <p className="text-foreground">Conception: <span className="capitalize">{(patient as any).modeConception === 'art' ? 'ART (Assisted)' : 'Natural'}</span></p>
                  )}
                  {(patient as any).birthStatus && (
                    <p className="text-foreground">Status: <span className="capitalize">{(patient as any).birthStatus === 'post_term' ? 'Post-term' : (patient as any).birthStatus === 'preterm' ? 'Pre-term' : 'Full Term'}</span></p>
                  )}
                  {(patient as any).consanguinity && (
                    <p className="text-foreground text-amber-600">Consanguinity: Yes</p>
                  )}
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <CalendarDays className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">{patient.createdAt ? format(new Date(patient.createdAt), 'PPP') : '-'}</p>
                <p className="text-muted-foreground">Registered On</p>
              </div>
            </div>

            <div className="pt-3 space-y-2 border-t">
              <Button variant="outline" size="sm" className="w-full gap-2 text-xs" onClick={() => setLocation(`/patients/${id}/progress`)}>
                <TrendingUp className="w-3.5 h-3.5" />
                View Progress
              </Button>
              <Button variant="outline" size="sm" className="w-full gap-2 text-xs" onClick={() => setLocation(`/patients/${id}/environment`)}>
                <Home className="w-3.5 h-3.5" />
                Record Home Visit
              </Button>
              {(interventionPlans || []).length > 0 && (
                <Button variant="outline" size="sm" className="w-full gap-2 text-xs" onClick={() => setLocation(`/intervention-plans/${id}`)}>
                  <FileText className="w-3.5 h-3.5" />
                  Intervention Plans ({(interventionPlans || []).length})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="md:w-2/3 space-y-6">
          <Tabs defaultValue="screenings" className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-4">
              <TabsTrigger
                value="screenings"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3"
              >
                Screenings
              </TabsTrigger>
              <TabsTrigger
                value="interventions"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3"
              >
                Interventions
              </TabsTrigger>
              <TabsTrigger
                value="plans"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3"
              >
                Plans {(interventionPlans || []).length > 0 && <Badge variant="secondary" className="ml-1.5 text-xs h-5">{(interventionPlans || []).length}</Badge>}
              </TabsTrigger>
              <TabsTrigger
                value="nutrition"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3"
              >
                Nutrition {(nutritionAssessments || []).length > 0 && <Apple className="w-3.5 h-3.5 ml-1 text-green-600" />}
              </TabsTrigger>
              <TabsTrigger
                value="environment"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3"
              >
                Environment {(environmentAssessments || []).length > 0 && <Home className="w-3.5 h-3.5 ml-1 text-blue-600" />}
              </TabsTrigger>
              <TabsTrigger
                value="referrals"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3"
              >
                Referrals {(referrals || []).length > 0 && <Badge variant="secondary" className="ml-1.5 text-xs h-5">{(referrals || []).length}</Badge>}
              </TabsTrigger>
              <TabsTrigger
                value="outcomes"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3"
              >
                Outcomes {(outcomes || []).length > 0 && <TrendingUp className="w-3.5 h-3.5 ml-1 text-green-600" />}
              </TabsTrigger>
              <TabsTrigger
                value="consent"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3"
              >
                Consent {activeConsents.length > 0 && <ShieldCheck className="w-3.5 h-3.5 ml-1 text-green-600" />}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="screenings" className="mt-6 space-y-4">
              {screenings?.length === 0 && (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                  No screenings recorded yet.
                </div>
              )}
              {screenings?.map((screening) => (
                <Card key={screening.id} className="overflow-hidden">
                  <div className={`h-1 w-full ${
                    screening.riskLevel === 'High' ? 'bg-red-500' :
                    screening.riskLevel === 'Medium' ? 'bg-amber-500' :
                    'bg-emerald-500'
                  }`} />
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">Assessment on {screening.date ? format(new Date(screening.date), 'PPP') : 'Unknown Date'}</CardTitle>
                        {screening.screeningType && screening.screeningType !== "baseline" && (
                          <Badge variant="outline" className="text-xs capitalize">
                            {screening.screeningType.replace("_", " ")}
                          </Badge>
                        )}
                      </div>
                      <RiskBadge level={screening.riskLevel as any} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Risk Score:</span>
                        <span className="ml-2 font-mono font-bold">{screening.riskScore}/100</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Conducted By:</span>
                        <span className="ml-2">Staff #{screening.conductedByUserId}</span>
                      </div>
                    </div>

                    {screening.domainScores ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {Object.entries(screening.domainScores as Record<string, number>).map(([domain, score]) => (
                          <Badge key={domain} variant="outline" className={`text-xs ${score >= 75 ? "border-red-200 text-red-700" : score >= 40 ? "border-amber-200 text-amber-700" : "border-green-200 text-green-700"}`}>
                            {domain}: {score}
                          </Badge>
                        ))}
                      </div>
                    ) : null}

                    {screening.riskLevel === 'High' && (
                      <div className="mt-4 p-3 bg-red-50 text-red-800 text-sm rounded border border-red-100">
                        <strong>Alert:</strong> High risk detected. Immediate follow-up recommended.
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="interventions" className="mt-6 space-y-4">
              {(!patientInterventions || patientInterventions.length === 0) && (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                  No interventions recorded yet.
                </div>
              )}
              {patientInterventions?.map((intervention) => (
                <Card key={intervention.id} className="overflow-hidden">
                  <div className={`h-1 w-full ${
                    intervention.status === 'completed' ? 'bg-emerald-500' :
                    intervention.status === 'in_progress' ? 'bg-amber-500' :
                    'bg-blue-500'
                  }`} />
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">Intervention #{intervention.id}</CardTitle>
                      <Badge variant={
                        intervention.status === 'completed' ? 'secondary' :
                        intervention.status === 'in_progress' ? 'default' : 'outline'
                      } className={
                        intervention.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        intervention.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      }>
                        {intervention.status === 'in_progress' ? 'In Progress' :
                         intervention.status === 'completed' ? 'Completed' : 'Pending'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Recommendation</p>
                      <p className="text-sm leading-relaxed mt-1">{intervention.recommendation}</p>
                    </div>
                    {intervention.notes && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Notes</p>
                        <p className="text-sm leading-relaxed mt-1">{intervention.notes}</p>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground pt-2">
                      Created: {intervention.createdAt ? format(new Date(intervention.createdAt), 'PPP') : 'Unknown'}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="plans" className="mt-6 space-y-4">
              {(!interventionPlans || interventionPlans.length === 0) ? (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                  No intervention plans generated yet.
                </div>
              ) : (
                <>
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => setLocation(`/intervention-plans/${id}`)}>
                    <FileText className="w-3.5 h-3.5" />
                    Open Full Plan View
                  </Button>
                  {(interventionPlans as any[]).map((plan: any) => (
                    <Card key={plan.id} className="overflow-hidden">
                      <div className="h-1 w-full bg-indigo-400" />
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-lg capitalize">{plan.domain} Plan</CardTitle>
                          <Badge className={
                            plan.status === "active" ? "bg-green-100 text-green-700" :
                            plan.status === "completed" ? "bg-gray-100 text-gray-700" :
                            "bg-yellow-100 text-yellow-700"
                          }>
                            {plan.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{plan.caregiverVersion || "No summary available"}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <span>{(plan.activities as any[])?.length || 0} activities</span>
                          <span>|</span>
                          <span>Age group: {plan.ageGroupMonths}m</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}
            </TabsContent>

            <TabsContent value="nutrition" className="mt-6 space-y-4">
              {(!nutritionAssessments || nutritionAssessments.length === 0) ? (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                  No nutrition assessments recorded yet.
                </div>
              ) : (
                (nutritionAssessments as any[]).map((na: any) => (
                  <Card key={na.id} className="overflow-hidden">
                    <div className={`h-1 w-full ${
                      na.nutritionRisk === 'High' ? 'bg-red-500' :
                      na.nutritionRisk === 'Medium' ? 'bg-amber-500' :
                      'bg-green-500'
                    }`} />
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">
                          Assessment on {na.assessedAt ? format(new Date(na.assessedAt), 'PPP') : 'Unknown Date'}
                        </CardTitle>
                        <Badge className={
                          na.nutritionRisk === 'High' ? 'bg-red-100 text-red-700' :
                          na.nutritionRisk === 'Medium' ? 'bg-amber-100 text-amber-700' :
                          'bg-green-100 text-green-700'
                        }>
                          {na.nutritionRisk} Risk
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                        {na.weightKg != null && (
                          <div className="text-center p-2 rounded-lg bg-muted/30 border">
                            <p className="text-xs text-muted-foreground">Weight</p>
                            <p className="font-bold">{na.weightKg} kg</p>
                          </div>
                        )}
                        {na.heightCm != null && (
                          <div className="text-center p-2 rounded-lg bg-muted/30 border">
                            <p className="text-xs text-muted-foreground">Height</p>
                            <p className="font-bold">{na.heightCm} cm</p>
                          </div>
                        )}
                        {na.muacCm != null && (
                          <div className="text-center p-2 rounded-lg bg-muted/30 border">
                            <p className="text-xs text-muted-foreground">MUAC</p>
                            <p className="font-bold">{na.muacCm} cm</p>
                          </div>
                        )}
                        {na.hemoglobin != null && (
                          <div className="text-center p-2 rounded-lg bg-muted/30 border">
                            <p className="text-xs text-muted-foreground">Hemoglobin</p>
                            <p className="font-bold">{na.hemoglobin} g/dL</p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {na.underweight && <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">Underweight</Badge>}
                        {na.stunting && <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">Stunting</Badge>}
                        {na.wasting && <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">Wasting</Badge>}
                        {na.anemia && <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">Anemia</Badge>}
                        {!na.underweight && !na.stunting && !na.wasting && !na.anemia && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">No flags</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Score: {na.nutritionScore}/7
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="environment" className="mt-6 space-y-4">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setLocation(`/patients/${id}/environment`)}>
                <Home className="w-3.5 h-3.5" />
                New Home Visit
              </Button>
              {(!environmentAssessments || environmentAssessments.length === 0) ? (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                  No environment assessments recorded yet.
                </div>
              ) : (
                (environmentAssessments as any[]).map((ea: any) => (
                  <Card key={ea.id} className="overflow-hidden">
                    <div className={`h-1 w-full ${
                      ea.environmentRisk === 'High' ? 'bg-red-500' :
                      ea.environmentRisk === 'Medium' ? 'bg-amber-500' :
                      'bg-green-500'
                    }`} />
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">
                          Home Visit on {ea.assessedAt ? format(new Date(ea.assessedAt), 'PPP') : 'Unknown Date'}
                        </CardTitle>
                        <Badge className={
                          ea.environmentRisk === 'High' ? 'bg-red-100 text-red-700' :
                          ea.environmentRisk === 'Medium' ? 'bg-amber-100 text-amber-700' :
                          'bg-green-100 text-green-700'
                        }>
                          {ea.environmentRisk} Risk
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        {ea.parentChildInteraction != null && (
                          <div className="text-center p-2 rounded-lg bg-muted/30 border">
                            <p className="text-xs text-muted-foreground">Interaction</p>
                            <p className="font-bold">{ea.parentChildInteraction}/10</p>
                          </div>
                        )}
                        {ea.parentMentalHealth != null && (
                          <div className="text-center p-2 rounded-lg bg-muted/30 border">
                            <p className="text-xs text-muted-foreground">Mental Health</p>
                            <p className="font-bold">{ea.parentMentalHealth}/10</p>
                          </div>
                        )}
                        {ea.homeStimulation != null && (
                          <div className="text-center p-2 rounded-lg bg-muted/30 border">
                            <p className="text-xs text-muted-foreground">Stimulation</p>
                            <p className="font-bold">{ea.homeStimulation}/10</p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {ea.playMaterials && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">Play Materials</Badge>}
                        {ea.safeWater && <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">Safe Water</Badge>}
                        {ea.toiletFacility && <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">Toilet</Badge>}
                        {!ea.safeWater && <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">No Safe Water</Badge>}
                        {!ea.toiletFacility && <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">No Toilet</Badge>}
                        {ea.caregiverEngagement && <Badge variant="outline" className="text-xs">{ea.caregiverEngagement} Engagement</Badge>}
                        {ea.languageExposure && <Badge variant="outline" className="text-xs">{ea.languageExposure} Language</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Score: {ea.environmentScore}/15
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="referrals" className="mt-6 space-y-4">
              {(!referrals || referrals.length === 0) ? (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                  No referrals for this patient.
                </div>
              ) : (
                (referrals as any[]).map((ref: any) => (
                  <Card key={ref.id} className="overflow-hidden">
                    <div className={`h-1 w-full ${ref.referralStatus === "Completed" ? "bg-green-500" : ref.referralStatus === "Under_Treatment" ? "bg-blue-500" : "bg-amber-500"}`} />
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">{ref.referralType} Referral</CardTitle>
                        <Badge className={
                          ref.referralStatus === "Completed" ? "bg-green-100 text-green-700" :
                          ref.referralStatus === "Under_Treatment" ? "bg-blue-100 text-blue-700" :
                          "bg-amber-100 text-amber-700"
                        }>
                          {ref.referralStatus?.replace("_", " ")}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="text-sm space-y-1">
                      <p><span className="text-muted-foreground">Reason:</span> {ref.referralReason?.replace("_", " ")}</p>
                      {ref.notes && <p><span className="text-muted-foreground">Notes:</span> {ref.notes}</p>}
                      <p className="text-xs text-muted-foreground pt-1">
                        Referred: {ref.referredAt ? format(new Date(ref.referredAt), 'PPP') : 'Unknown'}
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="outcomes" className="mt-6 space-y-4">
              {(!outcomes || outcomes.length === 0) ? (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                  No outcome records yet.
                </div>
              ) : (
                (outcomes as any[]).map((oc: any) => (
                  <Card key={oc.id} className="overflow-hidden">
                    <div className={`h-1 w-full ${oc.improvementStatus === "Improved" ? "bg-green-500" : oc.improvementStatus === "Worsened" ? "bg-red-500" : "bg-amber-500"}`} />
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">
                          Outcome on {oc.assessedAt ? format(new Date(oc.assessedAt), 'PPP') : 'Unknown Date'}
                        </CardTitle>
                        <Badge className={
                          oc.improvementStatus === "Improved" ? "bg-green-100 text-green-700" :
                          oc.improvementStatus === "Worsened" ? "bg-red-100 text-red-700" :
                          "bg-amber-100 text-amber-700"
                        }>
                          {oc.improvementStatus}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                        {oc.exitHighRisk && (
                          <div className="text-center p-2 rounded-lg bg-green-50 border border-green-200">
                            <p className="text-xs text-green-700 font-medium">Exited High Risk</p>
                          </div>
                        )}
                        {oc.domainImprovement && (
                          <div className="text-center p-2 rounded-lg bg-blue-50 border border-blue-200">
                            <p className="text-xs text-blue-700 font-medium">Domain Improved</p>
                          </div>
                        )}
                        {oc.reductionInDelayMonths > 0 && (
                          <div className="text-center p-2 rounded-lg bg-muted/30 border">
                            <p className="text-xs text-muted-foreground">Delay Reduction</p>
                            <p className="font-bold">{oc.reductionInDelayMonths} mo</p>
                          </div>
                        )}
                        {oc.homeActivitiesAssigned > 0 && (
                          <div className="text-center p-2 rounded-lg bg-muted/30 border">
                            <p className="text-xs text-muted-foreground">Activities</p>
                            <p className="font-bold">{oc.homeActivitiesAssigned}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {oc.autismRiskChange && oc.autismRiskChange !== "Same" && (
                          <Badge variant="outline" className={oc.autismRiskChange === "Improved" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}>
                            Autism: {oc.autismRiskChange}
                          </Badge>
                        )}
                        {oc.followupConducted && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">Follow-up Done</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="consent" className="mt-6 space-y-4">
              {(!consentRecords || consentRecords.length === 0) ? (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                  No consent records on file.
                </div>
              ) : (
                (consentRecords as any[]).map((record: any) => (
                  <Card key={record.id} className="overflow-hidden">
                    <div className={`h-1 w-full ${record.consentGiven && !record.revokedAt ? "bg-green-500" : "bg-gray-400"}`} />
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-base capitalize">{record.consentType.replace("_", " ")}</CardTitle>
                        <div className="flex gap-2">
                          {record.revokedAt ? (
                            <Badge className="bg-gray-100 text-gray-700">Revoked</Badge>
                          ) : record.consentGiven ? (
                            <Badge className="bg-green-100 text-green-700">Active</Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700">Declined</Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="text-sm space-y-1">
                      <p><span className="text-muted-foreground">Guardian:</span> {record.guardianName}</p>
                      <p><span className="text-muted-foreground">Relationship:</span> <span className="capitalize">{record.guardianRelationship?.replace("_", " ")}</span></p>
                      <p><span className="text-muted-foreground">Method:</span> <span className="capitalize">{record.consentMethod?.replace("_", " ")}</span></p>
                      <p className="text-xs text-muted-foreground pt-1">
                        Recorded: {record.createdAt ? format(new Date(record.createdAt), 'PPP') : 'Unknown'}
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

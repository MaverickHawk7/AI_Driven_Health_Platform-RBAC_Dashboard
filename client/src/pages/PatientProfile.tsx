import { usePatient, useScreenings, useInterventions, useInterventionPlans, useConsentRecords } from "@/hooks/use-resources";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RiskBadge } from "@/components/RiskBadge";
import { format } from "date-fns";
import { CalendarDays, MapPin, Phone, User as UserIcon, TrendingUp, FileText, ShieldCheck } from "lucide-react";

export default function PatientProfile() {
  const [, params] = useRoute("/patients/:id");
  const [, setLocation] = useLocation();
  const id = params ? Number.parseInt(params.id, 10) || 0 : 0;

  const { data: patient, isLoading: patientLoading } = usePatient(id);
  const { data: screenings, isLoading: screeningsLoading } = useScreenings(id);
  const { data: patientInterventions, isLoading: interventionsLoading } = useInterventions(id);
  const { data: interventionPlans } = useInterventionPlans(id);
  const { data: consentRecords } = useConsentRecords(id);

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
                <p className="font-medium text-foreground">{patient.ageMonths} months</p>
                <p className="text-muted-foreground">Age</p>
              </div>
            </div>
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

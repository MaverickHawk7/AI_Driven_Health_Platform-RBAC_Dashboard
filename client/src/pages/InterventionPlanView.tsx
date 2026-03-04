import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useInterventionPlans, useActivityLogs, useCreateActivityLog, useUpdateActivityLog, useUpdateInterventionPlan } from "@/hooks/use-resources";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, CheckCircle2, Clock, Users, Stethoscope, MessageSquare, Play, Zap, Info } from "lucide-react";
import { CaregiverToggle, ReadAloudButton, useCaregiverMode } from "@/components/CaregiverMode";

interface Activity {
  title: string;
  description: string;
  frequency: string;
  duration: string;
}

function getIntensityFromScore(score: number | undefined): { label: string; badge: string; frequency: string; simpleLabel: string } {
  if (!score) return { label: "Standard", badge: "bg-gray-100 text-gray-700", frequency: "As recommended", simpleLabel: "Normal" };
  if (score >= 75) return { label: "Urgent", badge: "bg-red-100 text-red-700", frequency: "Daily activities", simpleLabel: "Every Day" };
  if (score >= 40) return { label: "Moderate", badge: "bg-amber-100 text-amber-700", frequency: "3x per week", simpleLabel: "3 Times a Week" };
  return { label: "Maintenance", badge: "bg-green-100 text-green-700", frequency: "Weekly check-in", simpleLabel: "Once a Week" };
}

export default function InterventionPlanView() {
  const [, params] = useRoute("/intervention-plans/:patientId");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const patientId = params ? Number.parseInt(params.patientId, 10) || 0 : 0;

  const { data: plans, isLoading } = useInterventionPlans(patientId);
  const { data: activityLogs } = useActivityLogs(undefined, patientId);
  const { mutate: createLog } = useCreateActivityLog();
  const { mutate: updateLog } = useUpdateActivityLog();
  const { mutate: updatePlan } = useUpdateInterventionPlan();

  const [supervisorNotes, setSupervisorNotes] = useState<Record<number, string>>({});
  const isSupervisor = user?.role === "supervisor" || user?.role === "admin";
  const { isActive: caregiverMode, toggle: toggleCaregiver } = useCaregiverMode();

  if (isLoading) return <div className="p-8">Loading intervention plans...</div>;
  if (!plans || plans.length === 0) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => setLocation(`/patients/${patientId}`)} className="gap-2 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Patient
        </Button>
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
          No intervention plans generated yet for this patient.
        </div>
      </div>
    );
  }

  function handleMarkActivity(planId: number, activityTitle: string) {
    createLog({
      interventionPlanId: planId,
      patientId,
      activityTitle,
      status: "completed",
      completedAt: new Date().toISOString(),
      completedByUserId: user?.id,
    });
  }

  function handleSaveSupervisorNotes(planId: number) {
    const notes = supervisorNotes[planId];
    if (!notes?.trim()) return;
    updatePlan({
      id: planId,
      supervisorNotes: notes,
      supervisorModifiedByUserId: user?.id,
    });
  }

  function handleActivatePlan(planId: number) {
    updatePlan({ id: planId, status: "active" });
  }

  const domainColors: Record<string, string> = {
    speech: "bg-purple-100 text-purple-700",
    social: "bg-blue-100 text-blue-700",
    motor: "bg-orange-100 text-orange-700",
    cognitive: "bg-cyan-100 text-cyan-700",
    nutrition: "bg-green-100 text-green-700",
  };

  const statusColors: Record<string, string> = {
    recommended: "bg-yellow-100 text-yellow-700",
    active: "bg-green-100 text-green-700",
    completed: "bg-gray-100 text-gray-700",
    discontinued: "bg-red-100 text-red-700",
  };

  const domainSimpleNames: Record<string, string> = {
    speech: "Talking & Language",
    social: "Playing with Others",
    motor: "Moving & Walking",
    cognitive: "Thinking & Learning",
    nutrition: "Eating & Growing",
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => setLocation(`/patients/${patientId}`)} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Patient
        </Button>
        <CaregiverToggle isActive={caregiverMode} onToggle={toggleCaregiver} />
      </div>

      <div>
        <h1 className={`font-bold tracking-tight ${caregiverMode ? "text-3xl" : "text-2xl"}`}>
          {caregiverMode ? "Activities for Your Child" : "Intervention Plans"}
        </h1>
        <p className={`text-muted-foreground mt-1 ${caregiverMode ? "text-base" : "text-sm"}`}>
          {caregiverMode
            ? `${plans.length} area(s) with activities to help your child`
            : `${plans.length} domain-specific plan(s) for patient #${patientId}`}
        </p>
      </div>

      {plans.map((plan: any) => {
        const activities = (plan.activities || []) as Activity[];
        const planLogs = (activityLogs || []).filter((l: any) => l.interventionPlanId === plan.id);
        const completedCount = planLogs.filter((l: any) => l.status === "completed").length;
        const intensity = getIntensityFromScore(plan.riskScore ?? (plan.status === "active" ? 50 : undefined));

        return (
          <Card key={plan.id} className="border-2">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className={`capitalize ${caregiverMode ? "text-xl" : "text-lg"}`}>
                    {caregiverMode ? (domainSimpleNames[plan.domain] || plan.domain) : plan.domain}
                  </CardTitle>
                  {!caregiverMode && (
                    <>
                      <Badge className={domainColors[plan.domain] || "bg-gray-100"}>{plan.domain}</Badge>
                      <Badge className={statusColors[plan.status] || ""}>{plan.status}</Badge>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* Intensity Badge */}
                  <div className="flex items-center gap-1.5 group relative">
                    <Badge className={`gap-1 ${intensity.badge}`}>
                      <Zap className="w-3 h-3" />
                      {caregiverMode ? intensity.simpleLabel : `${intensity.label} (${intensity.frequency})`}
                    </Badge>
                    <div className="hidden group-hover:block absolute top-full right-0 mt-1 z-10 bg-white border rounded-lg shadow-lg p-2 text-xs text-muted-foreground w-48">
                      <Info className="w-3 h-3 inline mr-1" />
                      Intensity adjusted based on latest screening results
                    </div>
                  </div>
                  {plan.status === "recommended" && isSupervisor && !caregiverMode && (
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleActivatePlan(plan.id)}>
                      <Play className="w-3.5 h-3.5" />
                      Activate
                    </Button>
                  )}
                </div>
              </div>
              {!caregiverMode && (
                <CardDescription className="text-xs">
                  Age group: {plan.ageGroupMonths} months | Created: {plan.createdAt ? new Date(plan.createdAt).toLocaleDateString() : "N/A"}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {caregiverMode ? (
                // Caregiver simplified view
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-blue-800">What to do</p>
                    <ReadAloudButton text={plan.caregiverVersion || "Follow the activities listed below to help your child."} />
                  </div>
                  <p className="text-base text-blue-800 leading-relaxed">
                    {plan.caregiverVersion || "Follow the activities listed below to help your child."}
                  </p>
                </div>
              ) : (
                <Tabs defaultValue="caregiver">
                  <TabsList className="h-8">
                    <TabsTrigger value="caregiver" className="text-xs gap-1.5 h-7">
                      <Users className="w-3 h-3" /> Caregiver
                    </TabsTrigger>
                    <TabsTrigger value="professional" className="text-xs gap-1.5 h-7">
                      <Stethoscope className="w-3 h-3" /> Professional
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="caregiver" className="mt-3">
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                      <p className="text-sm text-blue-800">{plan.caregiverVersion || "No caregiver summary available."}</p>
                    </div>
                  </TabsContent>
                  <TabsContent value="professional" className="mt-3">
                    <div className="p-3 rounded-lg bg-gray-50 border">
                      <p className="text-sm text-gray-800">{plan.professionalVersion || "No professional summary available."}</p>
                    </div>
                  </TabsContent>
                </Tabs>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className={`font-semibold ${caregiverMode ? "text-base" : "text-sm"}`}>
                    {caregiverMode ? `Activities (${completedCount} of ${activities.length} done)` : `Activities (${completedCount}/${activities.length} completed)`}
                  </h4>
                </div>
                <div className="space-y-2">
                  {activities.map((activity, idx) => {
                    const isCompleted = planLogs.some((l: any) => l.activityTitle === activity.title && l.status === "completed");
                    return (
                      <div key={idx} className={`flex items-start gap-3 p-2.5 rounded-lg border ${isCompleted ? "bg-green-50/50 border-green-200" : "bg-muted/20"}`}>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />}
                            <p className={`font-medium ${caregiverMode ? "text-base" : "text-sm"}`}>{activity.title}</p>
                          </div>
                          <p className={`text-muted-foreground mt-0.5 ${caregiverMode ? "text-sm" : "text-xs"}`}>{activity.description}</p>
                          <div className="flex gap-3 mt-1.5">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {activity.frequency}
                            </span>
                            <span className="text-xs text-muted-foreground">{activity.duration}</span>
                          </div>
                        </div>
                        {!isCompleted && (
                          <Button
                            size="sm"
                            variant={caregiverMode ? "default" : "outline"}
                            className={`text-xs ${caregiverMode ? "h-8" : "h-7"}`}
                            onClick={() => handleMarkActivity(plan.id, activity.title)}
                          >
                            {caregiverMode ? "Mark Done" : "Done"}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Supervisor notes */}
              {isSupervisor && !caregiverMode && (
                <div className="space-y-2 pt-2 border-t">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" /> Supervisor Notes
                  </h4>
                  {plan.supervisorNotes && (
                    <div className="p-2 rounded bg-amber-50 border border-amber-200">
                      <p className="text-xs text-amber-800">{plan.supervisorNotes}</p>
                    </div>
                  )}
                  <Textarea
                    placeholder="Add notes or modifications..."
                    className="text-sm min-h-[60px]"
                    value={supervisorNotes[plan.id] || ""}
                    onChange={e => setSupervisorNotes(prev => ({ ...prev, [plan.id]: e.target.value }))}
                  />
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => handleSaveSupervisorNotes(plan.id)}>
                    Save Notes
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

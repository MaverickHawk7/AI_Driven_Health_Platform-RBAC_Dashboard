import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, ClipboardList, Users, Activity, AlertTriangle } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { usePatients, useScreenings, useUnreadCount } from "@/hooks/use-resources";
import { T } from "@/hooks/use-language";
import { Skeleton } from "@/components/ui/skeleton";
import { RiskBadge } from "@/components/RiskBadge";

export default function FieldWorkerHome() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { data: patients, isLoading: patientsLoading } = usePatients();
  const { data: screenings, isLoading: screeningsLoading } = useScreenings();
  const { data: unreadData } = useUnreadCount();
  const unreadCount = unreadData?.count ?? 0;

  const totalPatients = patients?.length ?? 0;
  const highRiskCount = patients?.filter((p: any) => (p as any).latestRiskLevel === "High").length ?? 0;
  const recentPatients = patients?.slice(0, 5) ?? [];
  const totalScreenings = screenings?.length ?? 0;
  const isLoading = patientsLoading || screeningsLoading;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight"><T>Welcome,</T> {user?.name}</h1>
        <p className="text-muted-foreground"><T>Community Health Field Worker Dashboard</T></p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-4 w-20 mb-2" /><Skeleton className="h-8 w-12" /></CardContent></Card>
          ))
        ) : (
          <>
            <Card className="bg-gradient-to-br from-white to-blue-50 border-blue-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-900"><T>Patients</T></CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-700">{totalPatients}</div>
                <p className="text-xs text-blue-600/80 mt-1"><T>Registered patients</T></p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-white to-emerald-50 border-emerald-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-emerald-900"><T>Screenings</T></CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-700">{totalScreenings}</div>
                <p className="text-xs text-emerald-600/80 mt-1"><T>Total conducted</T></p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-white to-rose-50 border-rose-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-rose-900"><T>High Risk</T></CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-rose-700">{highRiskCount}</div>
                <p className="text-xs text-rose-600/80 mt-1"><T>Need attention</T></p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-white to-amber-50 border-amber-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-amber-900"><T>Unread Messages</T></CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-700">{unreadCount}</div>
                <p className="text-xs text-amber-600/80 mt-1"><T>Pending messages</T></p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Action cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="hover-elevate cursor-pointer border-2" onClick={() => setLocation("/patients/new")}>
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
              <UserPlus className="w-6 h-6" />
            </div>
            <CardTitle><T>Register Patient</T></CardTitle>
            <CardDescription><T>Add a new patient to the community health registry and conduct initial screening.</T></CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full"><T>Get Started</T></Button>
          </CardContent>
        </Card>

        <Card className="hover-elevate cursor-pointer border-2" onClick={() => setLocation("/patients")}>
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-4">
              <Users className="w-6 h-6" />
            </div>
            <CardTitle><T>Review Patients</T></CardTitle>
            <CardDescription><T>View your registered patients, assessment history, and AI-assisted insights.</T></CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full"><T>View Registry</T></Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent patients */}
      {recentPatients.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base"><T>Recent Patients</T></CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentPatients.map((p: any) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2.5 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => setLocation(`/patients/${p.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium">
                      {p.name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.ageMonths}m</p>
                    </div>
                  </div>
                  {(p as any).latestRiskLevel ? (
                    <RiskBadge level={(p as any).latestRiskLevel} />
                  ) : (
                    <span className="text-xs text-muted-foreground"><T>Not screened</T></span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

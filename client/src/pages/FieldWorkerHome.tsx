import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, ClipboardList, Users } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { T } from "@/hooks/use-language";

export default function FieldWorkerHome() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight"><T>Welcome,</T> {user?.name}</h1>
        <p className="text-muted-foreground text-lg"><T>Community Health Field Worker Dashboard</T></p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
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
    </div>
  );
}
